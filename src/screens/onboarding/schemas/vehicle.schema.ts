import { z } from 'zod';
import { FUEL_TYPES, TRANSMISSIONS } from '@/constants/onboarding';
import { uploadedFileSchema } from '@/utils/uploadFile';
import { isValidVehicleNumber } from '@/utils/validation';

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

/**
 * How the vehicle form was reached from the step 2 entry screen:
 * 'lookup' – the number lookup filled it; 'rc' – an RC was uploaded (no lookup; details from OCR later);
 * 'manual' – "Add your vehicle details manually" (empty form).
 */
export const vehicleEntryModeSchema = z.enum(['lookup', 'rc', 'manual']);
export type VehicleEntryMode = z.infer<typeof vehicleEntryModeSchema>;

/** Entry screen lookup: debounced after a valid number is typed. */
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

/** The form's Next (2b/2c): Number + Make + Model + Fuel Type + Transmission (Colour optional). */
export const hasRequiredVehicleDetails = (v: VehicleFormValues): boolean =>
  isValidVehicleNumber(v.vehicleNumber) && !!v.make && !!v.model && !!v.fuelType && !!v.transmission;

/** The entry screen's Next: the lookup found the number, or an RC is attached. */
export const canProceedVehicleEntry = (e: { lookupFound: boolean; rcFile: unknown }): boolean =>
  e.lookupFound || !!e.rcFile;
