import { DOCUMENT_KEYS, MIN_DOCUMENTS_TO_CONTINUE } from '@/constants/onboarding';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { UploadedFile } from '@/utils/uploadFile';
import {
  EMPTY_DOCUMENTS,
  EMPTY_SERVICE,
  EMPTY_VEHICLE,
  canProceedDocuments,
  canProceedService,
  canProceedVehicleEntry,
  countAttachedDocuments,
  hasRequiredVehicleDetails,
  resolveDocuments,
  type VehicleFormValues,
} from '../schemas';

const file = (name: string): UploadedFile => ({ uri: `file:///${name}`, name, mimeType: 'image/jpeg' });
const RC = file('rc.jpg');
const LOOKUP = { make: 'mg-zs', model: 'essence', fuelType: 'electric', transmission: 'automatic', colour: 'White' } as const;
const DETAILS: VehicleFormValues = { ...EMPTY_VEHICLE, vehicleNumber: 'TS09EV1234', ...LOOKUP };
const store = () => useOnboardingStore.getState();

describe('Next enable rules', () => {
  describe('step 2 entry', () => {
    it('needs a found lookup or an attached RC', () => {
      expect(canProceedVehicleEntry({ lookupFound: false, rcFile: null })).toBe(false);
      expect(canProceedVehicleEntry({ lookupFound: true, rcFile: null })).toBe(true);
      expect(canProceedVehicleEntry({ lookupFound: false, rcFile: RC })).toBe(true);
    });
  });

  describe('step 2 form', () => {
    it('needs Number + Make + Model + Fuel Type + Transmission (Colour optional)', () => {
      expect(hasRequiredVehicleDetails(DETAILS)).toBe(true);
      expect(hasRequiredVehicleDetails({ ...DETAILS, colour: '' })).toBe(true);
      expect(hasRequiredVehicleDetails({ ...EMPTY_VEHICLE, rcFile: RC })).toBe(false);
      for (const key of ['make', 'model', 'fuelType', 'transmission'] as const) {
        expect(hasRequiredVehicleDetails({ ...DETAILS, [key]: null })).toBe(false);
      }
      expect(hasRequiredVehicleDetails({ ...DETAILS, vehicleNumber: 'TS09EV' })).toBe(false);
    });
  });

  describe('step 3', () => {
    it('has RC, Insurance and Pollution Certificate only (no DL)', () => {
      expect(DOCUMENT_KEYS).toEqual(['rc', 'insurance', 'pollution']);
    });
    it(`needs at least ${MIN_DOCUMENTS_TO_CONTINUE} document`, () => {
      expect(canProceedDocuments(EMPTY_DOCUMENTS)).toBe(false);
      expect(canProceedDocuments({ ...EMPTY_DOCUMENTS, pollution: file('p.pdf') })).toBe(true);
      expect(countAttachedDocuments({ ...EMPTY_DOCUMENTS, rc: RC, insurance: file('i.png') })).toBe(2);
    });
  });

  describe('step 4', () => {
    const FILLED = { ...EMPTY_SERVICE, lastServiceDate: '2026-10-12', serviceType: 'repair', odometer: '12450' };
    it('needs Last Service Date + Service Type + Odometer', () => {
      expect(canProceedService(EMPTY_SERVICE)).toBe(false);
      expect(canProceedService(FILLED)).toBe(true);
      expect(canProceedService({ ...FILLED, lastServiceDate: null })).toBe(false);
      expect(canProceedService({ ...FILLED, serviceType: null })).toBe(false);
      expect(canProceedService({ ...FILLED, odometer: '' })).toBe(false);
      expect(canProceedService({ ...FILLED, lastServiceDate: 'not-a-date' })).toBe(false);
    });
  });
});

describe('step 3 prefill (resolveDocuments)', () => {
  it('inherits the step 2 RC while untouched on step 3', () => {
    expect(resolveDocuments({}, { vehicleRc: RC })).toEqual({ rc: RC, insurance: null, pollution: null });
  });
  it("keeps step 3's own choices, including a removal", () => {
    const other = file('other.png');
    expect(resolveDocuments({ rc: null, insurance: other }, { vehicleRc: RC })).toEqual({
      rc: null,
      insurance: other,
      pollution: null,
    });
  });
});

describe('step 2 entry → form (store)', () => {
  beforeEach(() => store().reset());

  it('lookup found → the form is prefilled with the lookup', () => {
    store().prefillVehicleFromEntry({ vehicleNumber: 'TS09EV1234', rcFile: null }, LOOKUP);
    expect(store().vehicle).toEqual(DETAILS);
    expect(store().vehicleMode).toBe('lookup');
  });

  it('RC only → the form gets the RC and the typed number, no details', () => {
    store().prefillVehicleFromEntry({ vehicleNumber: 'TS09', rcFile: RC }, null);
    expect(store().vehicle).toEqual({ ...EMPTY_VEHICLE, vehicleNumber: 'TS09', rcFile: RC });
    expect(store().vehicleMode).toBe('rc');
  });

  it('back on the entry with the same number: edits made in the form are kept', () => {
    store().prefillVehicleFromEntry({ vehicleNumber: 'TS09EV1234', rcFile: null }, LOOKUP);
    store().setVehicle({ ...store().vehicle, colour: 'Red' });
    store().prefillVehicleFromEntry({ vehicleNumber: 'TS09EV1234', rcFile: null }, LOOKUP);
    expect(store().vehicle.colour).toBe('Red');
  });

  it("a different number drops the old number's details", () => {
    store().prefillVehicleFromEntry({ vehicleNumber: 'TS09EV1234', rcFile: RC }, LOOKUP);
    store().setVehicleEntry({ vehicleNumber: 'TS09', rcFile: RC });
    expect(store().vehicle).toEqual({ ...EMPTY_VEHICLE, vehicleNumber: 'TS09', rcFile: RC });
  });

  it('"Add your vehicle details manually" → an empty form, the RC kept for step 3', () => {
    store().prefillVehicleFromEntry({ vehicleNumber: 'TS09EV1234', rcFile: RC }, LOOKUP);
    store().startManualVehicle();
    expect(store().vehicle).toEqual({ ...EMPTY_VEHICLE, rcFile: RC });
    expect(store().vehicleMode).toBe('manual');
  });
});

describe('leaving onboarding (store)', () => {
  beforeEach(() => store().reset());
  const PROFILE = { avatar: null, dlNumber: '', dlImageUri: 'file:///dl.jpg', fullName: 'Ravi', dob: null, email: '' };

  it('a step 2 skip clears only the vehicle step; the exit then keeps profile, documents and service', () => {
    store().setProfile(PROFILE as never);
    store().prefillVehicleFromEntry({ vehicleNumber: 'TS09EV1234', rcFile: RC }, LOOKUP);
    store().setDocument('insurance', RC);
    store().skipVehicleStep();
    expect(store().vehicle).toEqual(EMPTY_VEHICLE);
    expect(store().vehicleMode).toBe('lookup');
    store().exitOnboarding();
    expect(store().profile).toEqual(PROFILE);
    expect(store().documents).toEqual({ insurance: RC });
    expect(store().retainOnExit).toBe(false);
  });

  it('any other exit resets everything', () => {
    store().setProfile(PROFILE as never);
    store().exitOnboarding();
    expect(store().profile).toBeNull();
  });
});
