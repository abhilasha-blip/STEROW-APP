import { useCallback, useEffect, useState } from 'react';

/** Seconds-based countdown that ticks once per second and cleans up on unmount. */
export function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setRemaining(initialSeconds);
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [initialSeconds, runId]);

  const restart = useCallback(() => setRunId(n => n + 1), []);

  return { remaining, isDone: remaining === 0, restart };
}
