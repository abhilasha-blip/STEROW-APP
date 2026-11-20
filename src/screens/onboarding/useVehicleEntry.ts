import { useCallback, useEffect, useRef, useState } from 'react';
import { VEHICLE_LOOKUP_DEBOUNCE_MS, VEHICLE_LOOKUP_MOCK_DELAY_MS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { mockLookupVehicle, type VehicleLookupResult } from '@/constants/vehicleMock';
import { logger } from '@/utils/logger';
import type { UploadedFile } from '@/utils/uploadFile';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';
import { canProceedVehicleEntry, type VehicleLookupStatus } from './schemas/vehicle.schema';

export type LookupVehicle = (number: string) => Promise<VehicleLookupResult | null>;

/** Dev / UI-only lookup: the mock table after a simulated network delay. Tomorrow: the vehicle API. */
export const mockVehicleLookup: LookupVehicle = number =>
  new Promise(resolve => setTimeout(() => resolve(mockLookupVehicle(number)), VEHICLE_LOOKUP_MOCK_DELAY_MS));

export type VehicleEntryValues = { vehicleNumber: string; rcFile: UploadedFile | null };

export type UseVehicleEntryOptions = {
  initialNumber?: string;
  initialRcFile?: UploadedFile | null;
  /** Coming back to a number that was already looked up: its details (no new lookup). */
  initialLookup?: VehicleLookupResult | null;
  /** Mirrors the number / RC (onboarding store). */
  onChange?: (values: VehicleEntryValues) => void;
  /** Lookup found the number, or an RC is attached. */
  onNext: (values: VehicleEntryValues, lookup: VehicleLookupResult | null) => void;
  /** The lookup didn't find the number (the screen shows a toast). */
  onLookupNotFound?: () => void;
  lookupVehicle?: LookupVehicle;
  debounceMs?: number;
};

const v = strings.onboarding.vehicle;

/**
 * Step 2 entry screen state: the number (looked up 600 ms after a valid number is typed) and the RC.
 * The number lives in its field (BufferedTextField) and here in a ref, so typing doesn't re-render the
 * screen; it re-renders when the lookup status, the error or the RC changes.
 */
export function useVehicleEntry({
  initialNumber = '',
  initialRcFile = null,
  initialLookup = null,
  onChange,
  onNext,
  onLookupNotFound,
  lookupVehicle = mockVehicleLookup,
  debounceMs = VEHICLE_LOOKUP_DEBOUNCE_MS,
}: UseVehicleEntryOptions) {
  const restored = initialLookup && isValidVehicleNumber(initialNumber) ? initialLookup : null;
  const number = useRef(normalizeVehicleNumber(initialNumber));
  const [rcFile, setRcFileState] = useState<UploadedFile | null>(initialRcFile);
  const rcRef = useRef(rcFile);
  const [status, setStatus] = useState<VehicleLookupStatus>(restored ? 'found' : 'idle');
  /** The lookup result for `number.current` (null while idle / loading / not found). */
  const found = useRef<VehicleLookupResult | null>(restored);
  const [numberError, setNumberError] = useState<string | undefined>();
  const errorShown = useRef(false);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const latest = useRef({ onChange, onLookupNotFound, lookupVehicle });
  latest.current = { onChange, onLookupNotFound, lookupVehicle };

  useEffect(
    () => () => {
      request.current += 1;
      clearTimeout(timer.current);
    },
    [],
  );

  const showError = useCallback((error: string | undefined) => {
    errorShown.current = !!error;
    setNumberError(error);
  }, []);

  const runLookup = useCallback(async (value: string, id: number) => {
    setStatus('loading');
    let result: VehicleLookupResult | null = null;
    try {
      result = await latest.current.lookupVehicle(value);
    } catch (error) {
      logger.warn('vehicle lookup failed', { message: String(error) });
    }
    if (id !== request.current) {
      return; // the number changed meanwhile, or the screen is gone
    }
    found.current = result;
    setStatus(result ? 'found' : 'notFound');
    if (!result) {
      latest.current.onLookupNotFound?.();
    }
  }, []);

  /** Per keystroke: cheap. Only a status change (idle ↔ found …) re-renders the screen. */
  const onNumberChange = useCallback(
    (raw: string) => {
      const next = normalizeVehicleNumber(raw);
      if (next === number.current) {
        return;
      }
      number.current = next;
      latest.current.onChange?.({ vehicleNumber: next, rcFile: rcRef.current });
      if (errorShown.current && (!next || isValidVehicleNumber(next))) {
        showError(undefined);
      }
      request.current += 1;
      clearTimeout(timer.current);
      found.current = null;
      setStatus('idle');
      if (isValidVehicleNumber(next)) {
        const id = request.current;
        timer.current = setTimeout(() => runLookup(next, id), debounceMs);
      }
    },
    [debounceMs, runLookup, showError],
  );

  const validateNumberOnBlur = useCallback(() => {
    const current = number.current;
    showError(current && !isValidVehicleNumber(current) ? v.numberInvalid : undefined);
  }, [showError]);

  const setRcFile = useCallback((file: UploadedFile | null) => {
    rcRef.current = file;
    setRcFileState(file);
    latest.current.onChange?.({ vehicleNumber: number.current, rcFile: file });
  }, []);

  const canProceed = canProceedVehicleEntry({ lookupFound: status === 'found', rcFile });

  const next = () => {
    if (canProceed) {
      onNext({ vehicleNumber: number.current, rcFile: rcRef.current }, status === 'found' ? found.current : null);
    }
  };

  return {
    initialNumber: number.current,
    status,
    numberError,
    rcFile,
    canProceed,
    onNumberChange,
    validateNumberOnBlur,
    setRcFile,
    next,
  };
}
