import { MIN_DOCUMENTS_TO_CONTINUE } from '@/constants/onboarding';
import type { UploadedFile } from '@/utils/uploadFile';
import {
  EMPTY_SERVICE,
  EMPTY_VEHICLE,
  canProceedDocuments,
  canProceedService,
  canProceedVehicle,
  countAttachedDocuments,
  getVehicleScreenState,
  resolveDocuments,
  vehicleStateVisibility,
  type VehicleFormValues,
} from '../schemas';

const file = (name: string): UploadedFile => ({ uri: `file:///${name}`, name, mimeType: 'image/jpeg' });
const RC = file('rc.jpg');
const DETAILS: VehicleFormValues = {
  ...EMPTY_VEHICLE,
  vehicleNumber: 'TS09EV1234',
  make: 'mg-zs',
  model: 'essence',
  fuelType: 'electric',
  transmission: 'automatic',
};

describe('step 2 screen state', () => {
  it.each([
    [{ vehicleNumber: '', rcFile: null }, 'lookup', 'idle', 'empty'],
    [{ vehicleNumber: '', rcFile: RC }, 'lookup', 'idle', 'rcUploaded'],
    [{ vehicleNumber: 'TS09', rcFile: null }, 'lookup', 'idle', 'typing'],
    [{ vehicleNumber: 'TS09', rcFile: RC }, 'lookup', 'idle', 'typing'],
    [{ vehicleNumber: 'TS09EV1234', rcFile: null }, 'lookup', 'loading', 'lookingUp'],
    [{ vehicleNumber: 'TS09EV1234', rcFile: null }, 'lookup', 'found', 'autofilled'],
    [{ vehicleNumber: 'TS09EV1234', rcFile: null }, 'lookup', 'notFound', 'typing'],
    [{ vehicleNumber: '', rcFile: null }, 'manual', 'idle', 'manual'],
  ] as const)('%j / %s / %s → %s', (values, mode, lookup, expected) => {
    expect(getVehicleScreenState(values, mode, lookup)).toBe(expected);
  });

  it('upload before a number is typed, details in C/D, "manual" link in C, "find by number" link in D', () => {
    const none = { showUpload: false, showDetails: false, showManualLink: false, showLookupLink: false };
    expect(vehicleStateVisibility('empty')).toEqual({ ...none, showUpload: true });
    expect(vehicleStateVisibility('rcUploaded')).toEqual({ ...none, showUpload: true });
    expect(vehicleStateVisibility('typing')).toEqual(none);
    expect(vehicleStateVisibility('lookingUp')).toEqual(none);
    expect(vehicleStateVisibility('autofilled')).toEqual({ ...none, showDetails: true, showManualLink: true });
    expect(vehicleStateVisibility('manual')).toEqual({ ...none, showDetails: true, showLookupLink: true });
  });
});

describe('Next enable rules', () => {
  describe('step 2', () => {
    it('A: nothing entered → disabled', () => {
      expect(canProceedVehicle(EMPTY_VEHICLE, 'lookup')).toBe(false);
    });
    it('B: RC uploaded, no number → enabled', () => {
      expect(canProceedVehicle({ ...EMPTY_VEHICLE, rcFile: RC }, 'lookup')).toBe(true);
    });
    it('RC uploaded but a half-typed number → disabled', () => {
      expect(canProceedVehicle({ ...EMPTY_VEHICLE, rcFile: RC, vehicleNumber: 'TS09' }, 'lookup')).toBe(false);
    });
    it('C: valid number with the auto-filled details → enabled', () => {
      expect(canProceedVehicle(DETAILS, 'lookup')).toBe(true);
    });
    it('D: needs Number + Make + Model + Fuel Type + Transmission (Colour optional)', () => {
      expect(canProceedVehicle(DETAILS, 'manual')).toBe(true);
      expect(canProceedVehicle({ ...EMPTY_VEHICLE, rcFile: RC }, 'manual')).toBe(false);
      for (const key of ['make', 'model', 'fuelType', 'transmission'] as const) {
        expect(canProceedVehicle({ ...DETAILS, [key]: null }, 'manual')).toBe(false);
      }
      expect(canProceedVehicle({ ...DETAILS, vehicleNumber: 'TS09EV' }, 'manual')).toBe(false);
    });
  });

  describe('step 3', () => {
    const none = { rc: null, license: null, insurance: null, pollution: null };
    it(`needs at least ${MIN_DOCUMENTS_TO_CONTINUE} document`, () => {
      expect(canProceedDocuments(none)).toBe(false);
      expect(canProceedDocuments({ ...none, pollution: file('p.pdf') })).toBe(true);
      expect(countAttachedDocuments({ ...none, rc: RC, insurance: file('i.png') })).toBe(2);
    });
  });

  describe('step 4', () => {
    it('needs Last Service Date + Service Type', () => {
      expect(canProceedService(EMPTY_SERVICE)).toBe(false);
      expect(canProceedService({ ...EMPTY_SERVICE, lastServiceDate: '2026-10-12' })).toBe(false);
      expect(canProceedService({ ...EMPTY_SERVICE, serviceType: 'repair' })).toBe(false);
      expect(canProceedService({ ...EMPTY_SERVICE, lastServiceDate: '2026-10-12', serviceType: 'repair' })).toBe(true);
      expect(canProceedService({ ...EMPTY_SERVICE, lastServiceDate: 'not-a-date', serviceType: 'repair' })).toBe(false);
    });
  });
});

describe('step 3 prefill (resolveDocuments)', () => {
  const DL = file('dl.jpg');
  it('inherits the step 2 RC and the step 1 DL while untouched on step 3', () => {
    expect(resolveDocuments({}, { vehicleRc: RC, profileDl: DL })).toEqual({
      rc: RC,
      license: DL,
      insurance: null,
      pollution: null,
    });
  });
  it("keeps step 3's own choices, including a removal", () => {
    const other = file('other.png');
    expect(resolveDocuments({ rc: null, license: other }, { vehicleRc: RC, profileDl: DL })).toEqual({
      rc: null,
      license: other,
      insurance: null,
      pollution: null,
    });
  });
});
