import { z } from 'zod';
import { FUEL_TYPES, TRANSMISSIONS } from '@/constants/onboarding';
import { uploadedFileSchema } from '@/utils/uploadFile';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';

/** Step 2 form state (what the inputs hold). */
export const vehicleFieldsSchema = z.object({
  /** Normalised as typed: upper-case A–Z / 0–9. */
  vehicleNumber: z.string(),
  rcFile: uploadedFileSchema.nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  fuelType: z.enum(FUEL_TYPES).nullable(),
  transmission: z.enum(TRANSMISSIONS).nullable(),
  colour: z.string(),
});
export type VehicleFormValues = z.infer<typeof vehicleFieldsSchema>;

/** 'lookup': number → auto-fill (states A–C). 'manual': "Enter details manually" (state D). */
export const vehicleEntryModeSchema = z.enum(['lookup', 'manual']);
export type VehicleEntryMode = z.infer<typeof vehicleEntryModeSchema>;

export type VehicleLookupStatus = 'idle' | 'loading' | 'found' | 'notFound';

export const EMPTY_VEHICLE: VehicleFormValues = {
  vehicleNumber: '',
  rcFile: null,
  make: null,
  model: null,
  fuelType: null,
  transmission: null,
  colour: '',
};

/** The fields auto-filled by the lookup (and cleared when the number changes). */
export const EMPTY_VEHICLE_DETAILS: Pick<
  VehicleFormValues,
  'make' | 'model' | 'fuelType' | 'transmission' | 'colour'
> = { make: null, model: null, fuelType: null, transmission: null, colour: '' };

/**
 * Screen states (design/onboarding step 2):
 * A 'empty'      – no number, no RC: number, "Or", empty upload card.
 * B 'rcUploaded' – RC attached (number empty): preview + X.
 *   'typing'     – a number is being typed (not valid yet) or awaiting the debounce: upload hidden.
 *   'lookingUp'  – valid number, lookup running: spinner in the field.
 * C 'autofilled' – lookup found the vehicle: details + "Not your vehicle? Enter details manually".
 * D 'manual'     – all fields editable; switching from C keeps the number and clears the looked-up fields.
 */
export type VehicleScreenState = 'empty' | 'rcUploaded' | 'typing' | 'lookingUp' | 'autofilled' | 'manual';

export function getVehicleScreenState(
  v: Pick<VehicleFormValues, 'vehicleNumber' | 'rcFile'>,
  mode: VehicleEntryMode,
  lookup: VehicleLookupStatus,
): VehicleScreenState {
  if (mode === 'manual') {
    return 'manual';
  }
  const typed = normalizeVehicleNumber(v.vehicleNumber).length > 0;
  if (!typed) {
    return v.rcFile ? 'rcUploaded' : 'empty';
  }
  if (lookup === 'loading') {
    return 'lookingUp';
  }
  if (lookup === 'found' && isValidVehicleNumber(v.vehicleNumber)) {
    return 'autofilled';
  }
  return 'typing';
}

export const vehicleStateVisibility = (state: VehicleScreenState) => ({
  /** "Or" + the RC card: only before a number is typed (the RC stays attached either way). */
  showUpload: state === 'empty' || state === 'rcUploaded',
  showDetails: state === 'autofilled' || state === 'manual',
  showManualLink: state === 'autofilled',
  /** "Find my vehicle by number" (back to lookup) in state D. */
  showLookupLink: state === 'manual',
});

/** Number + Make + Model + Fuel Type + Transmission (Colour optional). */
export const hasRequiredVehicleDetails = (v: VehicleFormValues): boolean =>
  isValidVehicleNumber(v.vehicleNumber) && !!v.make && !!v.model && !!v.fuelType && !!v.transmission;

/**
 * Step 2 "Next":
 * - an RC is attached and no number is typed (B), or
 * - the required details are complete (C after the lookup, D once filled in).
 */
export function canProceedVehicle(v: VehicleFormValues, mode: VehicleEntryMode): boolean {
  if (mode === 'lookup' && v.rcFile && normalizeVehicleNumber(v.vehicleNumber) === '') {
    return true;
  }
  return hasRequiredVehicleDetails(v);
}
