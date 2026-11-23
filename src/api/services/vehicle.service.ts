import { z } from 'zod';
import { ENDPOINTS } from '../endpoints';
import { ApiError } from '../errors';
import { restError } from '../rest';
import { parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';
import type { VehicleModelOption } from './vehicleMaster.service';

const { REST } = ENDPOINTS.SUPABASE;

/**
 * Defaults for the user_vehicles columns the database requires but onboarding doesn't ask for
 * (confirmed NOT NULL by the approved probe, 2026-11-23; API_PLAN §9.4):
 * - fuel_type / transmission_type: the variant's, else these (the web's first choices)
 * - rc_number: the vehicle number (what the web uses when the RC has none)
 * - current_odometer: 0 (asked later, on the Dashboard)
 */
export const VEHICLE_DEFAULTS = { fuelType: 'Petrol', transmissionType: 'Manual', currentOdometer: 0 } as const;

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'];
const TRANSMISSIONS = ['Manual', 'Automatic'];

const Created = z.object({ id: z.string() });

export type CreatedVehicle = { id: string; vehicleNumber: string; model: VehicleModelOption };

export const normaliseVehicleNumber = (value: string) => value.toUpperCase().replace(/\s+/g, '');

/** The minimal user_vehicles row (exported for tests / docs). */
export function minimalVehicleRow(vehicleNumber: string, model: VehicleModelOption) {
  const number = normaliseVehicleNumber(vehicleNumber);
  return {
    vehicle_number: number,
    make_id: model.makeId,
    model_id: model.modelId,
    variant_id: model.variantId,
    fuel_type: model.fuelType && FUEL_TYPES.includes(model.fuelType) ? model.fuelType : VEHICLE_DEFAULTS.fuelType,
    transmission_type:
      model.transmissionType && TRANSMISSIONS.includes(model.transmissionType)
        ? model.transmissionType
        : VEHICLE_DEFAULTS.transmissionType,
    rc_number: number,
    current_odometer: VEHICLE_DEFAULTS.currentOdometer,
    entry_method: 'manual',
  };
}

/** Creates the vehicle (owned by the signed-in user). A taken number → VEHICLE_NUMBER_TAKEN. */
export async function createVehicle(vehicleNumber: string, model: VehicleModelOption): Promise<CreatedVehicle> {
  const row = minimalVehicleRow(vehicleNumber, model);
  const res = await getSupabase().from(REST.USER_VEHICLES).insert(row).select('id').single();
  if (res.error) {
    if (res.error.code === '23505') {
      throw new ApiError({ kind: 'validation', code: 'VEHICLE_NUMBER_TAKEN', message: res.error.message, status: 409 });
    }
    throw restError(res);
  }
  return { id: parseOrThrow(Created, res.data, 'user_vehicles insert').id, vehicleNumber: row.vehicle_number, model };
}
