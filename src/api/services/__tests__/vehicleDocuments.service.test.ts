import { http, HttpResponse } from 'msw';
import { toUserError } from '@/api/errorMessages';
import { STORAGE_PATHS } from '@/api/endpoints';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { saveDocumentsStep, type DocumentsStepProgress } from '@/api/services/documentsStep.service';
import { createVehicle, minimalVehicleRow, VEHICLE_DEFAULTS } from '@/api/services/vehicle.service';
import { documentRow, saveVehicleDocument } from '@/api/services/vehicleDocuments.service';
import { fetchVehicleModelOptions, type VehicleModelOption } from '@/api/services/vehicleMaster.service';
import { strings } from '@/constants/strings';
import { newId } from '@/utils/id';
import { CREATED_VEHICLE_ID, makeSession, UID } from '../../../../test/msw/fixtures';
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
const VEHICLE = { id: CREATED_VEHICLE_ID, vehicleNumber: 'TS09EV1234', model: MG };
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

  it('createVehicle inserts the row and returns the id', async () => {
    await expect(createVehicle('TS09EV1234', MG)).resolves.toEqual({ id: CREATED_VEHICLE_ID, vehicleNumber: 'TS09EV1234', model: MG });
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
  it('rows as the web builds them (required numbers, registration_number, make/model/variant on RC + insurance)', () => {
    const links = { make_id: 'make-mg', model_id: 'model-zs', variant_id: 'variant-essence' };
    const base = { vehicle_id: CREATED_VEHICLE_ID, registration_number: 'TS09EV1234', document_path: 'p' };
    expect(documentRow('rc', VEHICLE, {}, 'p')).toEqual({ ...base, ...links });
    expect(documentRow('insurance', VEHICLE, { policyNo: ' P-1 ', insurer: 'Acko' }, 'p')).toEqual({
      ...base,
      ...links,
      policy_no: 'P-1',
      insurer: 'Acko',
    });
    expect(documentRow('pollution', VEHICLE, { certificateNo: 'PUC-9' }, 'p')).toEqual({ ...base, certificate_no: 'PUC-9' });
    expect(documentRow('fastag', VEHICLE, { fastagId: 'FT-1' }, 'p')).toEqual({ ...base, fastag_id: 'FT-1' });
  });

  it('a missing number fails before any upload', async () => {
    const error = await saveVehicleDocument(UID, 'insurance', VEHICLE, JPG, { policyNo: 'P-1' }).catch(e => e);
    expect(error).toMatchObject({ code: 'DOCUMENT_FIELD_REQUIRED' });
    expect(toUserError(error).userMessage).toBe(strings.errors.documentFieldRequired);
    expect(requestLog).toHaveLength(0);
  });

  it('uploads to vehicle-docs/<uid>/<table>/<uuid>.<ext>, then inserts the row with that path', async () => {
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
    });
    expect(STORAGE_PATHS.vehicleDocument('u', 'vdocs_rc', 'id', 'jpg')).toBe('u/vdocs_rc/id.jpg');
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
    vehicleNumber: 'TS09EV1234',
    model: MG,
    documents: {
      rc: { file: JPG, numbers: {} },
      insurance: { file: PDF, numbers: { policyNo: 'P-1', insurer: 'Acko' } },
    },
  };

  it('creates the vehicle, then saves each added document (only those)', async () => {
    await expect(saveDocumentsStep(UID, input)).resolves.toEqual({ vehicleId: CREATED_VEHICLE_ID, documents: ['rc', 'insurance'] });
    expect(calls('POST', urls.userVehicles)).toHaveLength(1);
    expect(calls('POST', urls.vdocs('vdocs_regcertificate'))).toHaveLength(1);
    expect(calls('POST', urls.vdocs('vdocs_insurance'))).toHaveLength(1);
    expect(calls('POST', urls.vdocs('vdocs_pollution'))).toHaveLength(0);
  });

  it('no documents → just the vehicle', async () => {
    await expect(saveDocumentsStep(UID, { ...input, documents: {} })).resolves.toEqual({ vehicleId: CREATED_VEHICLE_ID, documents: [] });
    expect(uploads()).toEqual([]);
  });

  it('a retry after a failed document reuses the vehicle and skips saved documents', async () => {
    const progress: DocumentsStepProgress = {};
    server.use(http.post(urls.vdocs('vdocs_insurance'), () => HttpResponse.json({ message: 'boom' }, { status: 500 }), { once: true }));
    await expect(saveDocumentsStep(UID, input, progress)).rejects.toMatchObject({ status: 500 });
    requestLog.length = 0;
    await expect(saveDocumentsStep(UID, input, progress)).resolves.toMatchObject({ documents: ['rc', 'insurance'] });
    expect(calls('POST', urls.userVehicles)).toHaveLength(0);
    expect(calls('POST', urls.vdocs('vdocs_regcertificate'))).toHaveLength(0);
    expect(calls('POST', urls.vdocs('vdocs_insurance'))).toHaveLength(1);
  });

  it('a different vehicle number on retry creates a new vehicle', async () => {
    const progress: DocumentsStepProgress = {};
    await saveDocumentsStep(UID, { ...input, documents: {} }, progress);
    await saveDocumentsStep(UID, { ...input, vehicleNumber: 'TS09EV9999', documents: {} }, progress);
    expect(calls('POST', urls.userVehicles)).toHaveLength(2);
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
