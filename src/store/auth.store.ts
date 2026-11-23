import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { toUserError } from '@/api/errorMessages';
import { normalizeError } from '@/api/errors';
import { queryClient } from '@/api/queryClient';
import * as authService from '@/api/services/auth.service';
import { resolveStartRoute } from '@/api/services/onboardingProgress.service';
import { type BootstrapUser, fetchBootstrap } from '@/api/services/user.service';
import { bindAutoRefreshToAppState, getSupabase } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { queryKeys } from '@/hooks/api/queryKeys';
import { logger } from '@/utils/logger';
import type { StartRoute } from '@/utils/startRoute';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthUser = BootstrapUser & {
  /** True when built from the session alone (bootstrap failed on a network error); refetched later. */
  partial?: boolean;
};

/** One-shot message for the UI (shown as a toast by <AuthNotices/>). */
export type AuthNotice = { id: number; type: 'error' | 'success'; message: string };

type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: AuthUser | null;
  notice: AuthNotice | null;
  /**
   * Where the app stack opens once signed in (onboarding 1/3, 2/3, 3/3 or the Dashboard). Decided with the
   * bootstrap, before `status` turns 'signedIn', so the splash / sign-in spinner covers it.
   */
  startRoute: StartRoute;
  /** Restore the session from the Keychain and subscribe to auth changes. Idempotent. */
  hydrate: () => Promise<void>;
  /** Sign out on this device only, then clear every cached query. */
  signOut: () => Promise<void>;
  clearNotice: () => void;
};

let teardown: (() => void) | undefined;
let inflight: { uid: string; promise: Promise<void>; ticket: object } | undefined;
/** Bumped on every sign-out so a bootstrap that finishes afterwards is ignored. */
let generation = 0;
let noticeId = 0;
/** Set when supabase-js drops the stored session during hydrate (refresh token rejected). */
let droppedDuringHydrate = false;
let hydrating = false;

/**
 * Upper bound for restoring the session while the splash is visible. Offline, supabase-js keeps
 * retrying an expired token's refresh for ~30 s; after this we show the auth flow instead and keep
 * the stored session (a later successful refresh emits TOKEN_REFRESHED and signs the user in).
 */
export const HYDRATE_TIMEOUT_MS = 6000;
let hydrateTimeoutMs = HYDRATE_TIMEOUT_MS;

const HYDRATE_TIMED_OUT = Symbol('hydrate-timeout');

const str = (v: unknown) => (typeof v === 'string' ? v : '');

function userFromSession(session: Session): AuthUser {
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    fullName: str(meta.full_name),
    phone: str(meta.phone),
    roles: [],
    permissions: [],
    partial: true,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const notify = (type: AuthNotice['type'], message: string) => {
    if (message) {
      noticeId += 1;
      set({ notice: { id: noticeId, type, message } });
    }
  };

  const resetLocal = () => {
    generation += 1;
    inflight = undefined;
    queryClient.clear();
    set({ status: 'signedOut', session: null, user: null });
  };

  /** Load the bootstrap for a session and switch to signedIn (deduped per user). */
  const establish = (session: Session): Promise<void> => {
    const uid = session.user.id;
    if (inflight?.uid === uid) {
      return inflight.promise;
    }
    const gen = generation;
    const ticket = {};
    const promise = (async () => {
      try {
        const [user, startRoute] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: queryKeys.bootstrap(uid),
            queryFn: () => fetchBootstrap(uid),
            staleTime: 0,
            // Fail fast at sign-in; useBootstrap retries later (e.g. after an offline start).
            retry: 0,
          }),
          resolveStartRoute(uid), // never throws
        ]);
        if (gen === generation) {
          set({ status: 'signedIn', session, user, startRoute });
        }
      } catch (e) {
        if (gen !== generation) {
          return;
        }
        const kind = normalizeError(e).kind;
        if (kind === 'network' || kind === 'timeout') {
          // Valid session but no connectivity: let the user in with what the session knows;
          // useBootstrap refetches once back online.
          logger.warn('bootstrap deferred (offline)');
          set({
            status: 'signedIn',
            session,
            user: userFromSession(session),
            startRoute: 'Dashboard',
          });
          return;
        }
        logger.error('bootstrap failed', e);
        await authService.signOut().catch(() => undefined);
        resetLocal();
        notify('error', toUserError(e).userMessage);
      } finally {
        if (inflight?.ticket === ticket) {
          inflight = undefined;
        }
      }
    })();
    inflight = { uid, promise, ticket };
    return promise;
  };

  const onAuthEvent = (event: AuthChangeEvent, session: Session | null) => {
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED': {
        if (!session) {
          return;
        }
        const { status, user } = get();
        if (status === 'signedIn' && user?.id === session.user.id) {
          set({ session });
        } else {
          establish(session);
        }
        return;
      }
      case 'SIGNED_OUT': {
        // Not initiated by signOut() (that resets first): the refresh token was rejected.
        if (get().status === 'signedIn') {
          resetLocal();
          notify('error', strings.errors.sessionExpired);
        }
        return;
      }
      default:
        // INITIAL_SESSION / PASSWORD_RECOVERY / MFA: hydrate() reads the session explicitly.
        return;
    }
  };

  return {
    status: 'loading',
    session: null,
    user: null,
    notice: null,
    startRoute: 'Dashboard',

    hydrate: async () => {
      if (teardown) {
        return;
      }
      const unbindAppState = bindAutoRefreshToAppState();
      const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
        if (hydrating && event === 'SIGNED_OUT') {
          droppedDuringHydrate = true;
        }
        // Supabase warns against awaiting its own calls inside this callback (deadlock): defer.
        setTimeout(() => onAuthEvent(event, session), 0);
      });
      teardown = () => {
        data.subscription.unsubscribe();
        unbindAppState();
      };
      hydrating = true;
      droppedDuringHydrate = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          authService.getSession(),
          new Promise<typeof HYDRATE_TIMED_OUT>(resolve => {
            timer = setTimeout(() => resolve(HYDRATE_TIMED_OUT), hydrateTimeoutMs);
          }),
        ]);
        if (result === HYDRATE_TIMED_OUT) {
          logger.warn('session restore timed out (offline?)');
          if (get().status === 'loading') {
            set({ status: 'signedOut' });
          }
        } else if (result) {
          await establish(result);
        } else if (get().status === 'loading') {
          set({ status: 'signedOut' });
          if (droppedDuringHydrate) {
            notify('error', strings.errors.sessionExpired);
          }
        }
      } catch (e) {
        // A stored session could not be refreshed. Network: keep it (auto-refresh retries when
        // back online). Rejected: supabase-js already removed it.
        const kind = normalizeError(e).kind;
        if (get().status === 'loading') {
          set({ status: 'signedOut' });
        }
        if (kind !== 'network' && kind !== 'timeout') {
          notify('error', strings.errors.sessionExpired);
        }
      } finally {
        clearTimeout(timer);
        hydrating = false;
      }
    },

    signOut: async () => {
      resetLocal();
      try {
        await authService.signOut();
      } catch (e) {
        // scope 'local' removes the Keychain session before the network call; a failure here only
        // means the server-side refresh token wasn't revoked.
        logger.warn('remote sign-out failed', e);
      }
    },

    clearNotice: () => set({ notice: null }),
  };
});

/** Test-only: tear down subscriptions and return to the initial state. */
export function __resetAuthStoreForTests(timeoutMs = HYDRATE_TIMEOUT_MS): void {
  hydrateTimeoutMs = timeoutMs;
  hydrating = false;
  droppedDuringHydrate = false;
  teardown?.();
  teardown = undefined;
  inflight = undefined;
  generation += 1;
  useAuthStore.setState({
    status: 'loading',
    session: null,
    user: null,
    notice: null,
    startRoute: 'Dashboard',
  });
}
