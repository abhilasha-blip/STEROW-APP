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
  /** Vehicle-document rows (vdocs_regcertificate / insurance / pollution / fastag) visible to the user. */
  documentCount: number;
};

const Count = z.number().int().nonnegative();
const IdRows = z.array(z.object({ id: z.string() }));

const { REST } = ENDPOINTS.SUPABASE;
/** The 3/3 document tables (rows are linked to the user's vehicles; RLS limits them to the user). */
export const DOCUMENT_TABLES = [REST.VDOCS_RC, REST.VDOCS_INSURANCE, REST.VDOCS_POLLUTION, REST.VDOCS_FASTAG] as const;

/** Cheap reads in parallel: the DL row's id (limit 1) and each document table's count (HEAD, count=exact). */
export async function fetchOnboardingProgress(uid: string): Promise<OnboardingProgress> {
  const supabase = getSupabase();
  const [dl, ...docs] = await Promise.all([
    supabase.from(REST.USER_DRIVING_LICENSES).select('id').eq('user_id', uid).limit(1),
    ...DOCUMENT_TABLES.map(table => supabase.from(table).select('id', { count: 'exact', head: true })),
  ]);
  const dlRows = parseOrThrow(IdRows, unwrap(dl).data, 'user_driving_licenses');
  const documentCount = docs.reduce(
    (sum, res, i) => sum + parseOrThrow(Count, unwrap(res).count, `${DOCUMENT_TABLES[i]} count`),
    0,
  );
  return { hasDrivingLicense: dlRows.length > 0, documentCount };
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
