import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VEHICLE_LOOKUP_DEBOUNCE_MS, VEHICLE_LOOKUP_MOCK_DELAY_MS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { mockLookupVehicle, type VehicleLookupResult } from '@/constants/vehicleMock';
import { logger } from '@/utils/logger';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';
import type { UploadedFile } from '@/utils/uploadFile';
import {
  EMPTY_VEHICLE,
  EMPTY_VEHICLE_DETAILS,
  canProceedVehicle,
  getVehicleScreenState,
  vehicleFieldsSchema,
  vehicleStateVisibility,
  type VehicleEntryMode,
  type VehicleFormValues,
  type VehicleLookupStatus,
} from './schemas/vehicle.schema';
import { useFormMirror } from './useFormMirror';

export type LookupVehicle = (number: string) => Promise<VehicleLookupResult | null>;

/** Dev / UI-only lookup: the mock table after a simulated network delay. Tomorrow: the vehicle API. */
export const mockVehicleLookup: LookupVehicle = number =>
  new Promise(resolve => setTimeout(() => resolve(mockLookupVehicle(number)), VEHICLE_LOOKUP_MOCK_DELAY_MS));

export type UseVehicleDetailsFormOptions = {
  initialValues?: Partial<VehicleFormValues>;
  initialMode?: VehicleEntryMode;
  onNext: (values: VehicleFormValues, mode: VehicleEntryMode) => void;
  onSkip: () => void;
  /** Mirrors every change (onboarding store). */
  onValuesChange?: (values: VehicleFormValues) => void;
  onModeChange?: (mode: VehicleEntryMode) => void;
  /** The lookup didn't find the number (the screen shows a toast). */
  onLookupNotFound?: () => void;
  lookupVehicle?: LookupVehicle;
  debounceMs?: number;
};

const v = strings.onboarding.vehicle;

/** Form state + the A/B/C/D state machine for onboarding step 2 (see vehicle.schema.ts). */
export function useVehicleDetailsForm({
  initialValues,
  initialMode = 'lookup',
  onNext,
  onSkip,
  onValuesChange,
  onModeChange,
  onLookupNotFound,
  lookupVehicle = mockVehicleLookup,
  debounceMs = VEHICLE_LOOKUP_DEBOUNCE_MS,
}: UseVehicleDetailsFormOptions) {
  const defaults: VehicleFormValues = { ...EMPTY_VEHICLE, ...initialValues };
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFieldsSchema),
    defaultValues: defaults,
  });
  const { control, setValue, handleSubmit, watch } = form;
  useFormMirror(watch, onValuesChange);
  const values = useWatch({ control }) as VehicleFormValues;

  const [mode, setModeState] = useState<VehicleEntryMode>(initialMode);
  // Coming back to a looked-up vehicle (Back, then Next): show it without a new lookup.
  const restoredFound =
    initialMode === 'lookup' && isValidVehicleNumber(defaults.vehicleNumber) && !!defaults.make;
  const [lookup, setLookup] = useState<VehicleLookupStatus>(restoredFound ? 'found' : 'idle');
  const [numberError, setNumberError] = useState<string | undefined>();
  /** The number whose lookup filled the details (null: nothing auto-filled). */
  const lookedUp = useRef<string | null>(restoredFound ? defaults.vehicleNumber : null);
  const request = useRef(0);
  const notFoundRef = useRef(onLookupNotFound);
  notFoundRef.current = onLookupNotFound;

  const setMode = useCallback(
    (next: VehicleEntryMode) => {
      setModeState(next);
      onModeChange?.(next);
    },
    [onModeChange],
  );

  const setDetails = useCallback(
    (details: typeof EMPTY_VEHICLE_DETAILS) => {
      (Object.keys(details) as (keyof typeof details)[]).forEach(key =>
        setValue(key, details[key], { shouldDirty: true }),
      );
    },
    [setValue],
  );

  // Lookup mode: a valid number is looked up 600 ms after typing stops; changing it clears the auto-fill.
  const number = normalizeVehicleNumber(values.vehicleNumber ?? '');
  useEffect(() => {
    if (mode !== 'lookup' || number === lookedUp.current) {
      return;
    }
    request.current += 1;
    if (lookedUp.current !== null) {
      lookedUp.current = null;
      setDetails(EMPTY_VEHICLE_DETAILS);
    }
    setLookup('idle');
    if (!isValidVehicleNumber(number)) {
      return;
    }
    const id = request.current;
    const timer = setTimeout(async () => {
      setLookup('loading');
      let result: VehicleLookupResult | null = null;
      try {
        result = await lookupVehicle(number);
      } catch (error) {
        logger.warn('vehicle lookup failed', { message: String(error) });
      }
      if (id !== request.current) {
        return; // the number changed meanwhile
      }
      lookedUp.current = number;
      if (result) {
        setDetails(result);
        setLookup('found');
      } else {
        // Not found (or failed): let the user enter the details, keeping the number.
        setLookup('notFound');
        setMode('manual');
        notFoundRef.current?.();
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [mode, number, lookupVehicle, debounceMs, setDetails, setMode]);

  const state = getVehicleScreenState(values, mode, lookup);
  const visibility = vehicleStateVisibility(state);

  const setVehicleNumber = useCallback(
    (raw: string) => {
      const next = normalizeVehicleNumber(raw);
      setValue('vehicleNumber', next, { shouldDirty: true });
      if (!next || isValidVehicleNumber(next)) {
        setNumberError(undefined);
      }
    },
    [setValue],
  );

  const validateNumberOnBlur = useCallback(() => {
    const current = normalizeVehicleNumber(form.getValues('vehicleNumber'));
    setNumberError(current && !isValidVehicleNumber(current) ? v.numberInvalid : undefined);
  }, [form]);

  const setRcFile = useCallback(
    (file: UploadedFile | null) => setValue('rcFile', file, { shouldDirty: true }),
    [setValue],
  );

  /** A different make invalidates the model. */
  const setMake = useCallback(
    (make: string) => {
      if (make !== form.getValues('make')) {
        setValue('make', make, { shouldDirty: true });
        setValue('model', null, { shouldDirty: true });
      }
    },
    [form, setValue],
  );

  /** "Not your vehicle? Enter details manually": state D, keeping the number, clearing the looked-up fields. */
  const switchToManual = useCallback(() => {
    request.current += 1;
    lookedUp.current = null;
    setLookup('idle');
    setNumberError(undefined);
    setDetails(EMPTY_VEHICLE_DETAILS);
    setMode('manual');
  }, [setDetails, setMode]);

  /**
   * "Find my vehicle by number": back to lookup mode. Details typed by hand are cleared (they'd be
   * hidden until a lookup fills them); a valid number is looked up again.
   */
  const switchToLookup = useCallback(() => {
    request.current += 1;
    lookedUp.current = null;
    setLookup('idle');
    setNumberError(undefined);
    setDetails(EMPTY_VEHICLE_DETAILS);
    setMode('lookup');
  }, [setDetails, setMode]);

  const canProceed = canProceedVehicle(values, mode);

  const submit = handleSubmit(submitted => {
    if (!canProceedVehicle(submitted, mode)) {
      return;
    }
    onNext(
      {
        ...submitted,
        vehicleNumber: normalizeVehicleNumber(submitted.vehicleNumber),
        colour: submitted.colour.trim(),
      },
      mode,
    );
  });

  return {
    form,
    control,
    values,
    mode,
    state,
    visibility,
    numberError,
    canProceed,
    setVehicleNumber,
    validateNumberOnBlur,
    setRcFile,
    setMake,
    switchToManual,
    switchToLookup,
    submit,
    skip: onSkip,
  };
}

export type VehicleDetailsForm = ReturnType<typeof useVehicleDetailsForm>;
