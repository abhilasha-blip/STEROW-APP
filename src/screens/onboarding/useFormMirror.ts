import { useEffect, useRef } from 'react';
import type { FieldValues, UseFormWatch } from 'react-hook-form';

/**
 * Calls `onChange` with the full values (and the changed field's name) on every form change,
 * including setValue. Used to mirror each onboarding step into the onboarding store.
 */
export function useFormMirror<T extends FieldValues>(
  watch: UseFormWatch<T>,
  onChange: ((values: T, name?: string) => void) | undefined,
) {
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => {
    const subscription = watch((values, { name }) => latest.current?.(values as T, name));
    return () => subscription.unsubscribe();
  }, [watch]);
}
