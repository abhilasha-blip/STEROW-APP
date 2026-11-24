import { http, HttpResponse } from 'msw';
import { toUserError } from '@/api/errorMessages';
import { STORAGE_PATHS } from '@/api/endpoints';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { saveDocumentsStep, type DocumentsStepProgress } from '@/api/services/documentsStep.service';
import {
  createVehicle,
  listMyVehicles,
  minimalVehicleRow,
  newVehicleRow,
  VEHICLE_DEFAULTS,
  vehicleDetailsOf,
  vehicleDetailsPatch,
} from '@/api/services/vehicle.service';
import { documentRow, rcDetailsColumns, saveVehicleDocument } from '@/api/services/vehicleDocuments.service';
import {
  fetchVehicleCatalog,
  fetchVehicleModelOptions,
  type VehicleModelOption,
} from '@/api/services/vehicleMaster.service';
import { strings } from '@/constants/strings';
import { newId } from '@/utils/id';
import { CREATED_VEHICLE_ID, makeSession, resetMyVehicles, UID, vehicleRow } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

const MG: VehicleModelOption = {
  value: 'variant-essence',
  label: 'MG ZS EV – Essence',
  makeId: 'make-mg',
  modelId: 'model-zs',
  variantId: 'variant-essence',
  fuelType: 'Electric',
  transmissionType: 'Automatic',
};
const VEHICLE = {
  id: CREATED_VEHICLE_ID,
  vehicleNumber: 'TS09EV1234',
  makeId: 'make-mg',
  modelId: 'model-zs',
  variantId: 'variant-essence',
};
const JPG = { uri: 'file:///tmp/ins.jpg', name: 'ins.jpg', mimeType: 'image/jpeg' };
const PDF = { uri: 'file:///tmp/puc.pdf', name: 'puc.pdf', mimeType: 'application/pdf' };
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/;

const calls = (method: string, url: string) => requestLog.filter(r => r.method === method && r.url.startsWith(url));
const uploads = () =>
  requestLog
    .filter(r => r.method === 'POST' && r.url.startsWith(`${urls.storageRoot}/object/`) && !r.url.includes('/sign/'))
    .map(r => decodeURIComponent(r.url.slice(`${urls.storageRoot}/object/`.length)));

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
});

describe('vehicleMaster.service', () => {
  it('active variants joined to model + make, labelled "Make Model – Variant", sorted', async () => {
    await expect(fetchVehicleModelOptions()).resolves.toEqual([
      {
        value: 'variant-sx',
        label: 'Hyundai Verna – 1.6 VTVT SX',
        makeId: 'make-hy',
        modelId: 'model-verna',
        variantId: 'variant-sx',
        fuelType: 'Petrol',
        transmissionType: 'Manual',
      },
      MG,
    ]);
  });

  it('catalog: only makes / models that have an active variant (variant_id is NOT NULL)', async () => {
    const catalog = await fetchVehicleCatalog();
    expect(catalog.makes).toEqual([
      { value: 'make-hy', label: 'Hyundai' },
      { value: 'make-mg', label: 'MG' },
    ]);
    expect(catalog.models).toEqual([
      { value: 'model-verna', label: 'Verna', makeId: 'make-hy' },
      { value: 'model-zs', label: 'ZS EV', makeId: 'make-mg' },
    ]);
    expect(catalog.variants.map(v => v.value)).toEqual(['variant-sx', 'variant-essence']);
  });

  it('a variant whose model or make is missing / inactive is left out', async () => {
    server.use(
      http.get(urls.vehicleMakes, () =>
        HttpResponse.json([
          { id: 'make-mg', name: 'MG', is_active: false },
          { id: 'make-hy', name: 'Hyundai', is_active: true },
        ]),
      ),
    );
    await expect(fetchVehicleModelOptions()).resolves.toEqual([
      expect.objectContaining({ value: 'variant-sx' }),
    ]);
  });
});

describe('vehicle.service (minimal vehicle)', () => {
  it('the minimal row: number + make/model/variant, fuel/transmission from the variant, rc_number = number, odometer 0', () => {
    expect(minimalVehicleRow(' ts09 ev1234 ', MG)).toEqual({
      vehicle_number: 'TS09EV1234',
      make_id: 'make-mg',
      model_id: 'model-zs',
      variant_id: 'variant-essence',
      fuel_type: 'Electric',
      transmission_type: 'Automatic',
      rc_number: 'TS09EV1234',
      current_odometer: 0,
      entry_method: 'manual',
    });
  });

  it('variant without fuel / transmission (or an unknown value) → the documented defaults', () => {
    const row = minimalVehicleRow('TS09EV1234', { ...MG, fuelType: null, transmissionType: 'CVT' });
    expect(row).toMatchObject({ fuel_type: VEHICLE_DEFAULTS.fuelType, transmission_type: VEHICLE_DEFAULTS.transmissionType });
  });

  it('Add new vehicle (full form): the filled extras override / extend the minimal row', () => {
    expect(newVehicleRow('TS09EV1234', MG)).toEqual(minimalVehicleRow('TS09EV1234', MG));
    expect(
      newVehicleRow('TS09EV1234', MG, {
        fuelType: 'Petrol',
        transmissionType: 'Manual',
        colour: ' Red ',
        rcNumber: ' rc-1 ',
        registrationMonth: 3,
        registrationYear: 2022,
        chassisNumber: 'ma1x',
        currentOdometer: 12000,
        lastServiceDate: '2026-10-01',
        isActive: false,
      }),
    ).toMatchObject({
      fuel_type: 'Petrol',
      transmission_type: 'Manual',
      color: 'Red',
      rc_number: 'RC-1',
      registration_month: 3,
      registration_year: 2022,
      chassis_number: 'MA1X',
      current_odometer: 12000,
      last_service_date: '2026-10-01',
      is_active: false,
    });
    // Month without year (and unknown fuel / blank strings) are left out.
    const row = newVehicleRow('TS09EV1234', MG, { registrationMonth: 3, registrationYear: null, fuelType: 'Steam', colour: ' ' });
    expect(row).not.toHaveProperty('registration_month');
    expect(row).not.toHaveProperty('color');
    expect(row.fuel_type).toBe('Electric');
  });

  it('RC columns: filled ones only; numbers validated, chassis / engine upper-cased', () => {
    expect(rcDetailsColumns(undefined)).toEqual({});
    expect(
      rcDetailsColumns({
        regDate: '2022-03-21',
        validUpto: null,
        address: ' ',
        bodyType: 'SUV',
        chassisNumber: 'ab1',
        engineNumber: ' e2 ',
        seatingCapacity: '0',
        grossWeight: '1890.5',
        unladenWeight: 'x',
      }),
    ).toEqual({ reg_date: '2022-03-21', body_type: 'SUV', chassis_number: 'AB1', engine_number: 'E2', gross_weight: 1890.5 });
  });

  it('RC "Add Manually": only the vehicle columns that changed are updated; RC row carries the details', async () => {
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    const [vehicle] = await listMyVehicles();
    const same = vehicleDetailsOf(vehicle);
    expect(vehicleDetailsPatch(vehicle, same)).toEqual({});
    expect(vehicleDetailsPatch(vehicle, { ...same, vehicleNumber: 'ts09 ev 9999', colour: '  ' })).toEqual({
      vehicle_number: 'TS09EV9999',
    });
    expect(vehicleDetailsPatch(vehicle, { ...same, transmissionType: 'Manual', colour: ' Red ' })).toEqual({
      transmission_type: 'Manual',
      color: 'Red',
    });
    expect(documentRow('rc', vehicle, { registrationNumber: 'TS09EV2345', vehicle: { ...same, colour: 'Red' } }, null)).toMatchObject({
      make_id: 'make-mg',
      fuel_type: 'Electric',
      colour: 'Red',
    });
    expect(documentRow('rc', vehicle, {}, null)).not.toHaveProperty('colour');
  });

  it('a taken number while updating the vehicle → VEHICLE_NUMBER_TAKEN, and the RC is not saved', async () => {
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    server.use(http.patch(urls.userVehicles, () => HttpResponse.json({ code: '23505', message: 'duplicate key' }, { status: 409 })));
    const [vehicle] = await listMyVehicles();
    requestLog.length = 0;
    await expect(
      saveDocumentsStep(UID, {
        vehicle,
        vehicleUpdate: { vehicle_number: 'TS09EV9999' },
        documents: { rc: { file: null, fields: { registrationNumber: 'TS09EV9999' } } },
      }),
    ).rejects.toMatchObject({ code: 'VEHICLE_NUMBER_TAKEN' });
    expect(requestLog.some(r => r.method === 'POST')).toBe(false);
  });

  it('listMyVehicles: active vehicles with make / model / variant names embedded, oldest first', async () => {
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    await expect(listMyVehicles()).resolves.toEqual([
      {
        id: 'v-1',
        vehicleNumber: 'TS09EV2345',
        makeId: 'make-mg',
        modelId: 'model-zs',
        variantId: 'variant-essence',
        makeName: 'MG',
        modelName: 'ZS EV',
        variantName: 'Essence',
        fuelType: 'Electric',
        transmissionType: 'Automatic',
        colour: null,
      },
    ]);
    const [req] = calls('GET', urls.userVehicles);
    expect(decodeURIComponent(req.url)).toContain('make:vehicle_make_master(name)');
    expect(req.url).toContain('is_active=eq.true');
    expect(req.url).toContain('order=create_at');
  });

  it('createVehicle inserts the row and returns the id', async () => {
    await expect(createVehicle('TS09EV1234', MG)).resolves.toEqual({ ...VEHICLE, model: MG });
    expect(calls('POST', urls.userVehicles)[0].body).toEqual(minimalVehicleRow('TS09EV1234', MG));
  });

  it('a taken number (23505) → "This vehicle number is already registered."', async () => {
    server.use(
      http.post(urls.userVehicles, () =>
        HttpResponse.json(
          { code: '23505', message: 'duplicate key value violates unique constraint "user_vehicles_vehicle_number_key"' },
          { status: 409 },
        ),
      ),
    );
    const error = await createVehicle('TS09EV1234', MG).catch(e => e);
    expect(error).toMatchObject({ code: 'VEHICLE_NUMBER_TAKEN' });
    expect(toUserError(error).userMessage).toBe(strings.errors.vehicleNumberTaken);
  });
});

describe('vehicleDocuments.service', () => {
  it('rows as the web builds them (numbers, registration_number, make/model/variant on RC + insurance, expiry columns)', () => {
    const links = { make_id: 'make-mg', model_id: 'model-zs', variant_id: 'variant-essence' };
    const base = { vehicle_id: CREATED_VEHICLE_ID, registration_number: 'TS09EV1234', document_path: 'p' };
    expect(documentRow('rc', VEHICLE, {}, 'p')).toEqual({ ...base, ...links });
    expect(documentRow('rc', VEHICLE, { registrationNumber: 'ts 09 ab 1' }, 'p')).toMatchObject({ registration_number: 'TS09AB1' });
    expect(documentRow('insurance', VEHICLE, { policyNo: ' P-1 ', insurer: 'Acko', expiry: '2027-01-15' }, 'p')).toEqual({
      ...base,
      ...links,
      policy_no: 'P-1',
      insurer: 'Acko',
      end_date: '2027-01-15',
    });
    expect(documentRow('pollution', VEHICLE, { certificateNo: 'PUC-9', expiry: '2026-12-31' }, 'p')).toEqual({
      ...base,
      certificate_no: 'PUC-9',
      validity_expiry_date: '2026-12-31',
    });
    expect(documentRow('fastag', VEHICLE, { fastagId: 'FT-1' }, 'p')).toEqual({ ...base, fastag_id: 'FT-1' });
    // Typed details only (no file): no document_path.
    expect(documentRow('fastag', VEHICLE, { fastagId: 'FT-1' }, null)).not.toHaveProperty('document_path');
  });

  it('a missing number fails before any upload', async () => {
    const error = await saveVehicleDocument(UID, 'insurance', VEHICLE, JPG, { policyNo: 'P-1' }).catch(e => e);
    expect(error).toMatchObject({ code: 'DOCUMENT_FIELD_REQUIRED' });
    expect(toUserError(error).userMessage).toBe(strings.errors.documentFieldRequired);
    expect(requestLog).toHaveLength(0);
  });

  it('with a file: uploads to vehicle-docs/<uid>/<table>/<uuid>.<ext>, then inserts the row with that path', async () => {
    await expect(saveVehicleDocument(UID, 'pollution', VEHICLE, PDF, { certificateNo: 'PUC-9' })).resolves.toBe(
      'vdocs_pollution-1',
    );
    const [path] = uploads();
    expect(path).toMatch(new RegExp(`^vehicle-docs/${UID}/vdocs_pollution/${UUID.source}\\.pdf$`));
    expect(calls('POST', urls.vdocs('vdocs_pollution'))[0].body).toEqual({
      vehicle_id: CREATED_VEHICLE_ID,
      registration_number: 'TS09EV1234',
      document_path: path.replace('vehicle-docs/', ''),
      certificate_no: 'PUC-9',
      validity_expiry_date: null,
    });
    expect(STORAGE_PATHS.vehicleDocument('u', 'vdocs_rc', 'id', 'jpg')).toBe('u/vdocs_rc/id.jpg');
  });

  it('without a file ("Add Manually" only): no upload, the row only', async () => {
    await saveVehicleDocument(UID, 'fastag', VEHICLE, null, { fastagId: 'FT-1' });
    expect(uploads()).toEqual([]);
    expect(calls('POST', urls.vdocs('vdocs_fastag'))[0].body).toEqual({
      vehicle_id: CREATED_VEHICLE_ID,
      registration_number: 'TS09EV1234',
      fastag_id: 'FT-1',
    });
  });

  it('a failed insert removes the uploaded file', async () => {
    server.use(http.post(urls.vdocs('vdocs_fastag'), () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    await expect(saveVehicleDocument(UID, 'fastag', VEHICLE, JPG, { fastagId: 'FT-1' })).rejects.toMatchObject({ status: 500 });
    expect(calls('DELETE', `${urls.storageRoot}/object/vehicle-docs`)).toHaveLength(1);
  });

  it('unsupported file types are refused', async () => {
    const error = await saveVehicleDocument(UID, 'rc', VEHICLE, { ...JPG, mimeType: 'image/heic' }, {}).catch(e => e);
    expect(toUserError(error).userMessage).toBe(strings.errors.unsupportedFile);
  });
});

describe('documentsStep.service (3/3 Next)', () => {
  const input = {
    vehicle: VEHICLE,
    documents: {
      rc: { file: JPG, fields: {} },
      insurance: { file: null, fields: { policyNo: 'P-1', insurer: 'Acko', expiry: '2027-01-15' } },
    },
  };

  it('saves each added document against the selected vehicle (only those)', async () => {
    await expect(saveDocumentsStep(UID, input)).resolves.toEqual({ vehicleId: CREATED_VEHICLE_ID, documents: ['rc', 'insurance'] });
    expect(calls('POST', urls.userVehicles)).toHaveLength(0); // the vehicle exists already
    expect(calls('POST', urls.vdocs('vdocs_regcertificate'))).toHaveLength(1);
    expect(calls('POST', urls.vdocs('vdocs_insurance'))).toHaveLength(1);
    expect(calls('POST', urls.vdocs('vdocs_pollution'))).toHaveLength(0);
  });

  it('a retry after a failed document skips the saved ones', async () => {
    const progress: DocumentsStepProgress = {};
    server.use(http.post(urls.vdocs('vdocs_insurance'), () => HttpResponse.json({ message: 'boom' }, { status: 500 }), { once: true }));
    await expect(saveDocumentsStep(UID, input, progress)).rejects.toMatchObject({ status: 500 });
    requestLog.length = 0;
    await expect(saveDocumentsStep(UID, input, progress)).resolves.toMatchObject({ documents: ['rc', 'insurance'] });
    expect(calls('POST', urls.vdocs('vdocs_regcertificate'))).toHaveLength(0);
    expect(calls('POST', urls.vdocs('vdocs_insurance'))).toHaveLength(1);
  });

  it('another vehicle selected on retry saves everything for that one', async () => {
    const progress: DocumentsStepProgress = {};
    await saveDocumentsStep(UID, input, progress);
    await saveDocumentsStep(UID, { ...input, vehicle: { ...VEHICLE, id: 'v-2' } }, progress);
    expect(calls('POST', urls.vdocs('vdocs_regcertificate'))).toHaveLength(2);
  });
});

describe('newId', () => {
  it('v4-shaped and unique; works without crypto', () => {
    expect(newId()).toMatch(new RegExp(`^${UUID.source}$`));
    expect(newId()).not.toBe(newId());
    const saved = (globalThis as { crypto?: unknown }).crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      expect(newId()).toMatch(new RegExp(`^${UUID.source}$`));
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: saved, configurable: true });
    }
  });
});
