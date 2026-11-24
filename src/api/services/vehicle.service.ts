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

/** The values user_vehicles accepts (web-vehicle-findings.md); no CVT (Q3). */
export const API_FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'] as const;
export const API_TRANSMISSIONS = ['Manual', 'Automatic'] as const;
const FUEL_TYPES: readonly string[] = API_FUEL_TYPES;
const TRANSMISSIONS: readonly string[] = API_TRANSMISSIONS;

const Created = z.object({ id: z.string() });

/** What a vehicle document needs to know about its vehicle. */
export type VehicleRef = {
  id: string;
  vehicleNumber: string;
  makeId: string;
  modelId: string;
  variantId: string;
};

export type CreatedVehicle = VehicleRef & { model: VehicleModelOption };

/** The user's vehicle as the selector / carousel shows it. */
export type MyVehicle = VehicleRef & {
  makeName: string;
  modelName: string;
  variantName: string;
  fuelType: string | null;
  transmissionType: string | null;
  colour: string | null;
};

const Named = z.union([z.object({ name: z.string() }), z.null()]).optional();
const VehicleRow = z.object({
  id: z.string(),
  vehicle_number: z.string(),
  make_id: z.string(),
  model_id: z.string(),
  variant_id: z.string(),
  fuel_type: z.string().nullable().optional(),
  transmission_type: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  make: Named,
  model: Named,
  variant: z.union([z.object({ variant_name: z.string() }), z.null()]).optional(),
});

/**
 * Active vehicles visible to the user (owned or shared; RLS), oldest first, with make / model /
 * variant names embedded (as the web's Book Service query does).
 */
export async function listMyVehicles(): Promise<MyVehicle[]> {
  const res = await getSupabase()
    .from(REST.USER_VEHICLES)
    .select(
      'id,vehicle_number,make_id,model_id,variant_id,fuel_type,transmission_type,color,make:vehicle_make_master(name),model:vehicle_model_master(name),variant:vehicle_variant_master(variant_name)',
    )
    .eq('is_active', true)
    .order('create_at');
  if (res.error) {
    throw restError(res);
  }
  return parseOrThrow(z.array(VehicleRow), res.data, 'user_vehicles').map(r => ({
    id: r.id,
    vehicleNumber: r.vehicle_number,
    makeId: r.make_id,
    modelId: r.model_id,
    variantId: r.variant_id,
    makeName: r.make?.name ?? '',
    modelName: r.model?.name ?? '',
    variantName: r.variant?.variant_name ?? '',
    fuelType: r.fuel_type ?? null,
    transmissionType: r.transmission_type ?? null,
    colour: r.color ?? null,
  }));
}

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

/**
 * "Add new vehicle" (full form, as the web's Manual tab): the optional / overridable user_vehicles
 * columns on top of the minimal row. Empty values are left out (the columns are nullable / defaulted).
 */
export type NewVehicleExtras = {
  fuelType?: string;
  transmissionType?: string;
  colour?: string;
  rcNumber?: string;
  /** Both or neither (web rule). */
  registrationMonth?: number | null;
  registrationYear?: number | null;
  chassisNumber?: string;
  currentOdometer?: number;
  /** "YYYY-MM-DD". */
  lastServiceDate?: string | null;
  isActive?: boolean;
};

/** The user_vehicles row for "Add new vehicle": the minimal row plus the extras that were filled. */
export function newVehicleRow(vehicleNumber: string, model: VehicleModelOption, extras: NewVehicleExtras = {}) {
  const row: Record<string, string | number | boolean> = { ...minimalVehicleRow(vehicleNumber, model) };
  if (extras.fuelType && FUEL_TYPES.includes(extras.fuelType)) {
    row.fuel_type = extras.fuelType;
  }
  if (extras.transmissionType && TRANSMISSIONS.includes(extras.transmissionType)) {
    row.transmission_type = extras.transmissionType;
  }
  const colour = extras.colour?.trim();
  if (colour) {
    row.color = colour;
  }
  const rc = extras.rcNumber?.trim().toUpperCase();
  if (rc) {
    row.rc_number = rc;
  }
  if (extras.registrationMonth && extras.registrationYear) {
    row.registration_month = extras.registrationMonth;
    row.registration_year = extras.registrationYear;
  }
  const chassis = extras.chassisNumber?.trim().toUpperCase();
  if (chassis) {
    row.chassis_number = chassis;
  }
  if (extras.currentOdometer !== undefined && Number.isInteger(extras.currentOdometer) && extras.currentOdometer >= 0) {
    row.current_odometer = extras.currentOdometer;
  }
  if (extras.lastServiceDate) {
    row.last_service_date = extras.lastServiceDate;
  }
  if (extras.isActive === false) {
    row.is_active = false;
  }
  return row;
}

/** The vehicle's own details, as RC "Add Manually" edits them. */
export type VehicleDetails = {
  vehicleNumber: string;
  makeId: string;
  modelId: string;
  variantId: string;
  fuelType: string;
  transmissionType: string;
  colour: string;
};

/** A vehicle's current details (to prefill RC "Add Manually"). */
export const vehicleDetailsOf = (v: MyVehicle): VehicleDetails => ({
  vehicleNumber: v.vehicleNumber,
  makeId: v.makeId,
  modelId: v.modelId,
  variantId: v.variantId,
  fuelType: v.fuelType ?? '',
  transmissionType: v.transmissionType ?? '',
  colour: v.colour ?? '',
});

/** The user_vehicles columns that differ from `details` (empty: nothing to update). */
export function vehicleDetailsPatch(vehicle: MyVehicle, details: VehicleDetails): Record<string, string | null> {
  const number = normaliseVehicleNumber(details.vehicleNumber);
  const colour = details.colour.trim() || null;
  const next: Record<string, string | null> = {
    vehicle_number: number,
    make_id: details.makeId,
    model_id: details.modelId,
    variant_id: details.variantId,
    fuel_type: details.fuelType,
    transmission_type: details.transmissionType,
    color: colour,
  };
  const current: Record<string, string | null> = {
    vehicle_number: vehicle.vehicleNumber,
    make_id: vehicle.makeId,
    model_id: vehicle.modelId,
    variant_id: vehicle.variantId,
    fuel_type: vehicle.fuelType,
    transmission_type: vehicle.transmissionType,
    color: vehicle.colour || null,
  };
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== current[k]));
}

/** Updates the vehicle's columns. A taken number → VEHICLE_NUMBER_TAKEN. */
export async function updateVehicle(vehicleId: string, patch: Record<string, string | null>): Promise<void> {
  const res = await getSupabase().from(REST.USER_VEHICLES).update(patch).eq('id', vehicleId);
  if (res.error) {
    if (res.error.code === '23505') {
      throw new ApiError({ kind: 'validation', code: 'VEHICLE_NUMBER_TAKEN', message: res.error.message, status: 409 });
    }
    throw restError(res);
  }
}

/** Creates the vehicle (owned by the signed-in user). A taken number → VEHICLE_NUMBER_TAKEN. */
export async function createVehicle(
  vehicleNumber: string,
  model: VehicleModelOption,
  extras?: NewVehicleExtras,
): Promise<CreatedVehicle> {
  const row = extras ? newVehicleRow(vehicleNumber, model, extras) : minimalVehicleRow(vehicleNumber, model);
  const res = await getSupabase().from(REST.USER_VEHICLES).insert(row).select('id').single();
  if (res.error) {
    if (res.error.code === '23505') {
      throw new ApiError({ kind: 'validation', code: 'VEHICLE_NUMBER_TAKEN', message: res.error.message, status: 409 });
    }
    throw restError(res);
  }
  return {
    id: parseOrThrow(Created, res.data, 'user_vehicles insert').id,
    vehicleNumber: String(row.vehicle_number),
    makeId: model.makeId,
    modelId: model.modelId,
    variantId: model.variantId,
    model,
  };
}
