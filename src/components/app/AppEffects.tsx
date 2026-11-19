import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import BootSplash from 'react-native-bootsplash';
import { useToast } from '@/components/Toast';
import { strings } from '@/constants/strings';
import { useAuthStore } from '@/store/auth.store';

/**
 * App-wide side effects (renders nothing):
 * - restores the session at launch and hides the splash once the auth status is known
 * - shows auth notices (e.g. "session expired") as toasts
 * - shows offline / back-online toasts from NetInfo
 */
export default function AppEffects() {
  const toast = useToast();
  const status = useAuthStore(s => s.status);
  const notice = useAuthStore(s => s.notice);
  const clearNotice = useAuthStore(s => s.clearNotice);
  const wasOffline = useRef(false);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (status !== 'loading') {
      BootSplash.hide({ fade: true }).catch(() => undefined);
    }
  }, [status]);

  useEffect(() => {
    if (notice) {
      (notice.type === 'error' ? toast.error : toast.success)(notice.message);
      clearNotice();
    }
  }, [notice, clearNotice, toast]);

  useEffect(
    () =>
      NetInfo.addEventListener(state => {
        if (state.isConnected === false && !wasOffline.current) {
          wasOffline.current = true;
          toast.error(strings.network.offline);
        } else if (state.isConnected === true && wasOffline.current) {
          wasOffline.current = false;
          toast.success(strings.network.backOnline);
        }
      }),
    [toast],
  );

  return null;
}
