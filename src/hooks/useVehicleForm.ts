import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  EMPTY_VEHICLE,
  hasRequiredVehicleDetails,
  vehicleFieldsSchema,
  type VehicleFormValues,
} from '@/screens/onboarding/schemas/vehicle.schema';
import { useFormMirror } from '@/screens/onboarding/useFormMirror';
import { useFormSelector } from '@/screens/onboarding/useFormSelector';
import { normalizeVehicleNumber } from '@/utils/validation';

export type UseVehicleFormOptions = {
  initialValues?: Partial<VehicleFormValues>;
  /** Every change (e.g. mirrored into the onboarding store). */
  onValuesChange?: (values: VehicleFormValues) => void;
};

/**
 * The vehicle form's state (Number, Make, Model, Fuel, Transmission, Colour) for <VehicleForm>.
 * Used by onboarding step 2 and reusable on the Dashboard.
 */
export function useVehicleForm({ initialValues, onValuesChange }: UseVehicleFormOptions = {}) {
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFieldsSchema),
    defaultValues: { ...EMPTY_VEHICLE, ...initialValues },
  });
  useFormMirror(form.watch, onValuesChange);
  const canSubmit = useFormSelector(form.watch, form.getValues, hasRequiredVehicleDetails);

  /** Runs `onValid` with trimmed / normalised values when the required details are complete. */
  const submit = (onValid: (values: VehicleFormValues) => void) =>
    form.handleSubmit(values => {
      if (hasRequiredVehicleDetails(values)) {
        onValid({
          ...values,
          vehicleNumber: normalizeVehicleNumber(values.vehicleNumber),
          colour: values.colour.trim(),
        });
      }
    });

  return { form, canSubmit, submit };
}

export type VehicleFormState = ReturnType<typeof useVehicleForm>;
