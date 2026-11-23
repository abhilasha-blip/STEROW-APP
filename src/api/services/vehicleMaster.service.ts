import { z } from 'zod';
import { ENDPOINTS } from '../endpoints';
import { unwrap } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';

const { REST } = ENDPOINTS.SUPABASE;

const Make = z.object({ id: z.string(), name: z.string(), is_active: z.boolean().nullable().optional() });
const Model = z.object({ id: z.string(), name: z.string(), make_id: z.string(), is_active: z.boolean().nullable().optional() });
const Variant = z.object({
  id: z.string(),
  variant_name: z.string(),
  model_id: z.string(),
  fuel_type: z.string().nullable().optional(),
  transmission_type: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
});

/** One pickable vehicle model: a variant with its model and make (what user_vehicles needs). */
export type VehicleModelOption = {
  /** The variant id (the picker's value). */
  value: string;
  /** "Make Model – Variant". */
  label: string;
  makeId: string;
  modelId: string;
  variantId: string;
  fuelType: string | null;
  transmissionType: string | null;
};

const active = (r: { is_active?: boolean | null }) => r.is_active !== false;

/** Active variants joined to their model and make (three reads, joined here as the web does), sorted. */
export async function fetchVehicleModelOptions(): Promise<VehicleModelOption[]> {
  const supabase = getSupabase();
  const [makesRes, modelsRes, variantsRes] = await Promise.all([
    supabase.from(REST.VEHICLE_MAKES).select('id,name,is_active').order('name'),
    supabase.from(REST.VEHICLE_MODELS).select('id,name,make_id,is_active').order('name'),
    supabase.from(REST.VEHICLE_VARIANTS).select('id,variant_name,model_id,fuel_type,transmission_type,is_active'),
  ]);
  const makes = new Map(parseOrThrow(z.array(Make), unwrap(makesRes).data, 'vehicle makes').filter(active).map(m => [m.id, m]));
  const models = new Map(
    parseOrThrow(z.array(Model), unwrap(modelsRes).data, 'vehicle models').filter(active).map(m => [m.id, m]),
  );
  const variants = parseOrThrow(z.array(Variant), unwrap(variantsRes).data, 'vehicle variants').filter(active);
  return variants
    .flatMap(v => {
      const model = models.get(v.model_id);
      const make = model ? makes.get(model.make_id) : undefined;
      return model && make
        ? [
            {
              value: v.id,
              label: `${make.name} ${model.name} – ${v.variant_name}`,
              makeId: make.id,
              modelId: model.id,
              variantId: v.id,
              fuelType: v.fuel_type ?? null,
              transmissionType: v.transmission_type ?? null,
            },
          ]
        : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
