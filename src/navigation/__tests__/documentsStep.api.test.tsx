import { http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { pick } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import { CREATED_VEHICLE_ID, setOnboardingBackend, TEST_OTP, UID } from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockedPick = pick as jest.MockedFunction<typeof pick>;
const HIDDEN = { includeHiddenElements: true };
const d = strings.onboarding.documents;

beforeEach(() => {
  resetAppState();
  mockedLibrary.mockReset();
  mockedPick.mockReset();
});
afterEach(resetAppState);

/** Signed in with a DL and no active vehicle → the app opens on 3/3. */
async function onStep3() {
  setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
  await renderApp();
  await goToVerify();
  await typeOtp(TEST_OTP);
  await screen.findByTestId('onboarding-documents');
  await waitFor(() => expect(screen.getByTestId('documents-vehicle-model').props.accessibilityState?.busy).not.toBe(true));
  requestLog.length = 0;
}

async function fillVehicle(number = 'TS09EV1234') {
  await fireEvent.changeText(screen.getByTestId('documents-vehicle-number'), number);
  await fireEvent.press(screen.getByTestId('documents-vehicle-model'));
  await fireEvent.press(await screen.findByTestId('documents-vehicle-model-option-variant-essence'));
  await waitFor(() => expect(screen.queryByTestId('documents-vehicle-model-sheet')).toBeNull());
}

async function attachPhoto(key: string, uri: string) {
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri, type: 'image/jpeg', fileName: uri.split('/').pop(), fileSize: 1024 }] });
  await fireEvent.press(screen.getByTestId(`document-${key}-box-empty`));
  await fireEvent.press(await screen.findByTestId(`document-${key}-source-gallery`));
  await screen.findByTestId(`document-${key}-box-image`);
}

async function attachPdf(key: string, name: string) {
  mockedPick.mockResolvedValueOnce([{ uri: `file:///tmp/${name}`, name, type: 'application/pdf', size: 2048 }] as never);
  await fireEvent.press(screen.getByTestId(`document-${key}-box-empty`));
  await fireEvent.press(await screen.findByTestId(`document-${key}-source-document`));
  await screen.findByText(name);
}

const disabled = (id: string) => screen.getByTestId(id).props.accessibilityState?.disabled === true;
const writes = () =>
  requestLog
    .filter(r => r.method !== 'GET' && r.method !== 'HEAD')
    .map(r => `${r.method} ${decodeURIComponent(r.url.split('?')[0]).replace(urls.storageRoot, 'storage').replace(/^https:\/\/[^/]+/, '')}`);
const bodyOf = (url: string) => requestLog.find(r => r.method === 'POST' && r.url.startsWith(url))?.body;

describe('3/3 vehicle + documents with the API', () => {
  it('the model picker lists "Make Model – Variant" from the master data (active only)', async () => {
    await onStep3();
    await fireEvent.press(screen.getByTestId('documents-vehicle-model'));
    expect(await screen.findByText('MG ZS EV – Essence')).toBeTruthy();
    expect(screen.getByText('Hyundai Verna – 1.6 VTVT SX')).toBeTruthy();
    expect(screen.queryByText(/Old$/)).toBeNull();
  });

  it('Next: vehicle (minimal row) → RC + Insurance + FASTag → toast → Dashboard (Back can\'t return)', async () => {
    await onStep3();
    await fillVehicle();
    expect(disabled('documents-next')).toBe(false); // documents are optional
    await attachPhoto('rc', 'file:///tmp/rc.jpg');
    await attachPdf('insurance', 'policy.pdf');
    expect(disabled('documents-next')).toBe(true); // insurance numbers missing
    await fireEvent.changeText(screen.getByTestId('document-insurance-policy-no'), 'p-123');
    await fireEvent.changeText(screen.getByTestId('document-insurance-insurer'), 'Acko');
    await attachPhoto('fastag', 'file:///tmp/fastag.jpg');
    await fireEvent.changeText(screen.getByTestId('document-fastag-id'), 'ft-9');
    expect(disabled('documents-next')).toBe(false);

    await fireEvent.press(screen.getByTestId('documents-next'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(await screen.findByText(d.saved)).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('onboarding-documents', HIDDEN)).toBeNull());

    const uuid = '[0-9a-f-]{36}';
    expect(writes()).toEqual([
      'POST /rest/v1/user_vehicles',
      expect.stringMatching(new RegExp(`^POST storage/object/vehicle-docs/${UID}/vdocs_regcertificate/${uuid}\\.jpg$`)),
      'POST /rest/v1/vdocs_regcertificate',
      expect.stringMatching(new RegExp(`^POST storage/object/vehicle-docs/${UID}/vdocs_insurance/${uuid}\\.pdf$`)),
      'POST /rest/v1/vdocs_insurance',
      expect.stringMatching(new RegExp(`^POST storage/object/vehicle-docs/${UID}/vdocs_fastag/${uuid}\\.jpg$`)),
      'POST /rest/v1/vdocs_fastag',
    ]);
    expect(bodyOf(urls.userVehicles)).toEqual({
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
    expect(bodyOf(urls.vdocs('vdocs_regcertificate'))).toMatchObject({
      vehicle_id: CREATED_VEHICLE_ID,
      registration_number: 'TS09EV1234',
      make_id: 'make-mg',
    });
    expect(bodyOf(urls.vdocs('vdocs_insurance'))).toMatchObject({ policy_no: 'P-123', insurer: 'Acko', vehicle_id: CREATED_VEHICLE_ID });
    expect(bodyOf(urls.vdocs('vdocs_fastag'))).toMatchObject({ fastag_id: 'FT-9', vehicle_id: CREATED_VEHICLE_ID });
  });

  it('a taken vehicle number shows the message and stays on 3/3', async () => {
    await onStep3();
    await fillVehicle();
    server.use(
      http.post(urls.userVehicles, () =>
        HttpResponse.json({ code: '23505', message: 'duplicate key value violates unique constraint' }, { status: 409 }),
      ),
    );
    await fireEvent.press(screen.getByTestId('documents-next'));
    expect(await screen.findByText(strings.errors.vehicleNumberTaken)).toBeTruthy();
    expect(screen.getByTestId('onboarding-documents')).toBeTruthy();
  });

  it('a failed document keeps 3/3; the retry reuses the vehicle (no duplicate) and saves the rest', async () => {
    await onStep3();
    await fillVehicle();
    await attachPdf('pollution', 'puc.pdf');
    await fireEvent.changeText(screen.getByTestId('document-pollution-certificate-no'), 'puc-1');
    server.use(http.post(urls.vdocs('vdocs_pollution'), () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    await fireEvent.press(screen.getByTestId('documents-next'));
    expect(await screen.findByText(strings.errors.generic)).toBeTruthy();
    server.resetHandlers();
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('documents-next'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(writes().filter(w => w.includes('user_vehicles'))).toEqual([]);
    expect(writes().filter(w => w === 'POST /rest/v1/vdocs_pollution')).toHaveLength(1);
  });
});
