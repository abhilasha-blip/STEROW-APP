/**
 * MOCK vehicle data for onboarding step 2 (UI only). Replaced by the vehicle API (makes, models and
 * the registration-number lookup). Labels follow the Figma frames: the design's "Vehicle Make" is
 * "MG ZS" and its "Vehicle Model" is "Essence".
 */
import type { FuelType, Transmission } from './onboarding';

export type VehicleMakeOption = {
  value: string;
  label: string;
  models: readonly { value: string; label: string }[];
};

const models = (...labels: string[]) =>
  labels.map(label => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label }));

export const MOCK_VEHICLE_MAKES: readonly VehicleMakeOption[] = [
  { value: 'mg-zs', label: 'MG ZS', models: models('Excite', 'Exclusive', 'Essence', 'Executive') },
  { value: 'tata', label: 'Tata', models: models('Nexon', 'Nexon EV', 'Punch', 'Tiago', 'Harrier', 'Safari') },
  { value: 'maruti-suzuki', label: 'Maruti Suzuki', models: models('Swift VXI', 'Baleno', 'Brezza', 'Dzire', 'Ertiga') },
  { value: 'hyundai', label: 'Hyundai', models: models('Creta', 'Venue', 'i20', 'Verna') },
  { value: 'mahindra', label: 'Mahindra', models: models('XUV700', 'Thar', 'Scorpio-N', 'XUV 3XO') },
  { value: 'kia', label: 'Kia', models: models('Seltos', 'Sonet', 'Carens') },
  { value: 'honda', label: 'Honda', models: models('City', 'Amaze', 'Elevate') },
  { value: 'toyota', label: 'Toyota', models: models('Innova Hycross', 'Fortuner', 'Glanza', 'Hyryder') },
  { value: 'renault', label: 'Renault', models: models('Kiger', 'Triber', 'Kwid') },
  { value: 'skoda', label: 'Skoda', models: models('Kushaq', 'Slavia', 'Kylaq') },
  { value: 'volkswagen', label: 'Volkswagen', models: models('Taigun', 'Virtus') },
  { value: 'nissan', label: 'Nissan', models: models('Magnite') },
];

export const mockModelsFor = (make: string | null) =>
  MOCK_VEHICLE_MAKES.find(m => m.value === make)?.models ?? [];

export type VehicleLookupResult = {
  make: string;
  model: string;
  fuelType: FuelType;
  transmission: Transmission;
  colour: string;
};

/** The design's example (step2-number-autofill.svg). Any other valid number returns it too. */
const DEFAULT_LOOKUP: VehicleLookupResult = {
  make: 'mg-zs',
  model: 'essence',
  fuelType: 'electric',
  transmission: 'automatic',
  colour: 'White',
};

export const MOCK_VEHICLE_LOOKUPS: Readonly<Record<string, VehicleLookupResult>> = {
  TS09EV1234: DEFAULT_LOOKUP,
  // The sample RC card's vehicle.
  UP32AB1234: { make: 'maruti-suzuki', model: 'swift-vxi', fuelType: 'petrol', transmission: 'manual', colour: 'White' },
};

/** Numbers ending in this simulate "not found" (→ manual entry with the number kept). */
export const MOCK_NOT_FOUND_SUFFIX = '0000';

export function mockLookupVehicle(number: string): VehicleLookupResult | null {
  if (number.endsWith(MOCK_NOT_FOUND_SUFFIX)) {
    return null;
  }
  return MOCK_VEHICLE_LOOKUPS[number] ?? DEFAULT_LOOKUP;
}
