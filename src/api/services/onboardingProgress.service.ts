import { z } from 'zod';
import { isOnboardingSkipped } from '@/storage/onboardingFlags';
import { logger } from '@/utils/logger';
import { decideStartRoute, type StartRoute } from '@/utils/startRoute';
import { ENDPOINTS } from '../endpoints';
import { ApiError } from '../errors';
import { unwrap } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';

/** What the post-login routing needs to know from the backend. */
export type OnboardingProgress = {
  /** A user_driving_licenses row exists for this user. */
  hasDrivingLicense: boolean;
  /**
   * Active user_vehicles visible to the user (owned or shared). 3/3 creates the vehicle, and documents
   * can't exist without one. Vehicles can't be deleted, only deactivated, hence `is_active = true`.
   */
  vehicleCount: number;
};

const Count = z.number().int().nonnegative();
const IdRows = z.array(z.object({ id: z.string() }));

const { REST } = ENDPOINTS.SUPABASE;

/** Two cheap reads in parallel: the DL row's id (limit 1) and the active vehicle count (HEAD, count=exact). */
export async function fetchOnboardingProgress(uid: string): Promise<OnboardingProgress> {
  const supabase = getSupabase();
  const [dl, vehicles] = await Promise.all([
    supabase.from(REST.USER_DRIVING_LICENSES).select('id').eq('user_id', uid).limit(1),
    supabase.from(REST.USER_VEHICLES).select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);
  const dlRows = parseOrThrow(IdRows, unwrap(dl).data, 'user_driving_licenses');
  const vehicleCount = parseOrThrow(Count, unwrap(vehicles).count, 'user_vehicles count');
  return { hasDrivingLicense: dlRows.length > 0, vehicleCount };
}

/**
 * The start route for a signed-in user. Never throws: if the progress can't be read (offline, a
 * backend hiccup) the user goes to the Dashboard, so routing can never lock anyone out.
 */
export async function resolveStartRoute(uid: string): Promise<StartRoute> {
  try {
    const [progress, profileDone, dlSkipped, documentsSkipped] = await Promise.all([
      fetchOnboardingProgress(uid),
      isOnboardingSkipped('profile', uid),
      isOnboardingSkipped('dl', uid),
      isOnboardingSkipped('documents', uid),
    ]);
    const route = decideStartRoute({ ...progress, profileDone, dlSkipped, documentsSkipped });
    logger.info('start route', { route, ...progress, profileDone, dlSkipped, documentsSkipped });
    return route;
  } catch (e) {
    logger.warn('start route: onboarding progress unavailable → Dashboard', {
      kind: e instanceof ApiError ? e.kind : 'unknown',
    });
    return 'Dashboard';
  }
}
