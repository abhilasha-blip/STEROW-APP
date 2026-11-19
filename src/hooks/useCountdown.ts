import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const TICK_MS = 1000;

/**
 * Seconds countdown computed from an end timestamp, so it stays correct while the app is
 * backgrounded (JS timers pause there). `restart()` starts over, `finish()` ends it now.
 */
export function useCountdown(seconds: number) {
  const [endAt, setEndAt] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));

  useEffect(() => {
    if (endAt <= Date.now()) {
      return;
    }
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        clearInterval(id);
      }
    }, TICK_MS);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNow(Date.now());
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [endAt]);

  const restart = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setEndAt(t + seconds * 1000);
  }, [seconds]);

  const finish = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setEndAt(t);
  }, []);

  return { remaining, isDone: remaining === 0, restart, finish };
}
