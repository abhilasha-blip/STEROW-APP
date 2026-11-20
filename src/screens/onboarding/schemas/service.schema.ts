import { z } from 'zod';
import { SERVICE_CENTRE_TYPES } from '@/constants/onboarding';
import { parseIsoDate } from '@/utils/validation';

/** Step 4 form state. */
export const serviceFieldsSchema = z.object({
  /** "YYYY-MM-DD" or null. */
  lastServiceDate: z.string().nullable(),
  centreType: z.enum(SERVICE_CENTRE_TYPES).nullable(),
  /** Free text from the search box, or the picked suggestion's name. */
  centreName: z.string(),
  serviceType: z.string().nullable(),
  /** Odometer reading in km: digits only (max ODOMETER_MAX_DIGITS), shown with a "km" suffix. Required. */
  odometer: z.string(),
  /** Rupees, digits only; shown with Indian grouping (1,23,456). */
  amount: z.string(),
});
export type ServiceFormValues = z.infer<typeof serviceFieldsSchema>;

export const EMPTY_SERVICE: ServiceFormValues = {
  lastServiceDate: null,
  centreType: null,
  centreName: '',
  serviceType: null,
  odometer: '',
  amount: '',
};

/** Step 4 "Next": Last Service Date + Service Type + Odometer (the rest is optional). */
export const canProceedService = (v: ServiceFormValues): boolean =>
  !!v.lastServiceDate && !!parseIsoDate(v.lastServiceDate) && !!v.serviceType && /^\d+$/.test(v.odometer);
