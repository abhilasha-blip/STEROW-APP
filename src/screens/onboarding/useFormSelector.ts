import { useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormGetValues, UseFormWatch } from 'react-hook-form';

/** Structural equality for plain form data (watch() hands over freshly cloned objects each time). */
const sameValue = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true;
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const ka = Object.keys(a);
  return (
    ka.length === Object.keys(b).length &&
    ka.every(k => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
};

/**
 * Derived form state that re-renders the caller only when the derived value changes.
 *
 * `useWatch({ control })` at screen level re-renders the whole step on every keystroke; this keeps a
 * keystroke inside its own Controller unless it flips something the screen shows (e.g. "Next" enabled).
 */
export function useFormSelector<T extends FieldValues, R>(
  watch: UseFormWatch<T>,
  getValues: UseFormGetValues<T>,
  select: (values: T) => R,
  isEqual: (a: R, b: R) => boolean = sameValue,
): R {
  const selectRef = useRef(select);
  selectRef.current = select;
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;
  const [selected, setSelected] = useState(() => select(getValues()));
  const latest = useRef(selected);

  useEffect(() => {
    const subscription = watch(values => {
      const next = selectRef.current(values as T);
      if (!isEqualRef.current(latest.current, next)) {
        latest.current = next;
        setSelected(next);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  return selected;
}
