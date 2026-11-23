import { http, HttpResponse } from 'msw';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import {
  CREATED_VEHICLE_ID,
  resetMyVehicles,
  setOnboardingBackend,
  TEST_OTP,
  UID,
  vehicleRow,
} from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const HIDDEN = { includeHiddenElements: true };
const d = strings.onboarding.documents;

beforeEach(() => {
  resetAppState();
  mockedLibrary.mockReset();
});
afterEach(resetAppState);

/** Signed in with a DL and no active vehicle → the app opens on 3/3. */
async function onStep3() {
  setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
  await renderApp();
  await goToVerify();
  await typeOtp(TEST_OTP);
  await screen.findByTestId('onboarding-documents');
  // The selector is disabled while the user's vehicles load.
  await waitFor(() => expect(screen.getByTestId('vehicle-select').props.accessibilityState?.disabled).toBe(false));
  requestLog.length = 0;
}

async function choose(select: string, option: string) {
  await fireEvent.press(screen.getByTestId(select));
  await fireEvent.press(await screen.findByTestId(`${select}-option-${option}`));
  await waitFor(() => expect(screen.queryByTestId(`${select}-sheet`)).toBeNull());
}

async function addVehicle(number = 'TS09EV1234') {
  await fireEvent.press(screen.getByTestId('vehicle-select'));
  await screen.findByTestId('add-vehicle');
  await fireEvent.changeText(screen.getByTestId('add-vehicle-number'), number);
  await choose('add-vehicle-make', 'make-mg');
  await choose('add-vehicle-model', 'model-zs');
  expect(screen.queryByTestId('add-vehicle-variant')).toBeNull(); // one variant → picked automatically
  await fireEvent.press(screen.getByTestId('add-vehicle-save'));
  await waitFor(() => expect(screen.queryByTestId('add-vehicle', HIDDEN)).toBeNull());
}

async function uploadPhoto(key: string, uri: string) {
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri, type: 'image/jpeg', fileName: uri.split('/').pop(), fileSize: 1024 }] });
  await fireEvent.press(screen.getByTestId(`document-${key}-upload`));
  await fireEvent.press(await screen.findByTestId(`document-${key}-source-gallery`));
  await screen.findByTestId(`document-${key}-file`);
}

async function pickDate(testID: string, date: Date) {
  await fireEvent.press(screen.getByTestId(testID));
  const picker = await screen.findByTestId(`${testID}-picker`);
  await act(() => picker.props.onChange({ type: 'set' }, date));
  await fireEvent.press(screen.getByTestId(`${testID}-done`));
}

const disabled = (id: string) => screen.getByTestId(id).props.accessibilityState?.disabled === true;
const writes = () =>
  requestLog
    .filter(r => r.method !== 'GET' && r.method !== 'HEAD')
    .map(r => `${r.method} ${decodeURIComponent(r.url.split('?')[0]).replace(urls.storageRoot, 'storage').replace(/^https:\/\/[^/]+/, '')}`);
const bodyOf = (url: string) => requestLog.find(r => r.method === 'POST' && r.url.startsWith(url))?.body;

describe('3/3 "Your Vehicle Documents" with the API', () => {
  it('no vehicle yet → "Add your vehicle"; Next is disabled; Skip → Dashboard', async () => {
    await onStep3();
    expect(screen.getByTestId('vehicle-select')).toHaveTextContent(d.vehiclePlaceholder);
    expect(screen.getByText(d.title)).toBeTruthy();
    expect(screen.getByText(d.subtitle)).toBeTruthy();
    for (const key of ['rc', 'insurance', 'pollution', 'fastag']) {
      expect(screen.getByTestId(`document-${key}-upload`)).toHaveTextContent(new RegExp(d.uploadFile));
      expect(screen.getByTestId(`document-${key}-manual`)).toHaveTextContent(new RegExp(d.addManually));
    }
    expect(disabled('documents-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('documents-skip'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });

  it('Add new vehicle → minimal vehicle → selected; RC upload + Insurance details → Next saves both → Dashboard', async () => {
    await onStep3();
    await addVehicle();
    expect(screen.getByTestId('vehicle-select')).toHaveTextContent('TS09EV1234 (MG ZS EV)');
    expect(bodyOf(urls.userVehicles)).toMatchObject({ vehicle_number: 'TS09EV1234', variant_id: 'variant-essence' });
    expect(await screen.findByText(strings.onboarding.addVehicle.saved)).toBeTruthy();

    await uploadPhoto('rc', 'file:///tmp/rc.jpg');
    expect(screen.getByTestId('document-rc-added')).toBeTruthy();
    expect(disabled('documents-next')).toBe(false);

    await fireEvent.press(screen.getByTestId('document-insurance-manual'));
    await screen.findByTestId('document-insurance-details');
    await fireEvent.changeText(screen.getByTestId('document-insurance-details-policyNo'), 'p-123');
    await fireEvent.changeText(screen.getByTestId('document-insurance-details-insurer'), 'Acko');
    await pickDate('document-insurance-details-expiry', new Date(2027, 0, 15));
    await fireEvent.press(screen.getByTestId('document-insurance-details-save'));
    expect(await screen.findByTestId('document-insurance-added')).toBeTruthy();
    expect(screen.getByTestId('document-insurance-manual')).toHaveTextContent(new RegExp(d.editDetails));

    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('documents-next'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(await screen.findByText(d.saved)).toBeTruthy();
    expect(writes()).toEqual([
      expect.stringMatching(new RegExp(`^POST storage/object/vehicle-docs/${UID}/vdocs_regcertificate/[0-9a-f-]{36}\\.jpg$`)),
      'POST /rest/v1/vdocs_regcertificate',
      'POST /rest/v1/vdocs_insurance',
    ]);
    expect(bodyOf(urls.vdocs('vdocs_regcertificate'))).toMatchObject({
      vehicle_id: CREATED_VEHICLE_ID,
      registration_number: 'TS09EV1234',
      make_id: 'make-mg',
    });
    expect(bodyOf(urls.vdocs('vdocs_insurance'))).toEqual({
      vehicle_id: CREATED_VEHICLE_ID,
      registration_number: 'TS09EV1234',
      make_id: 'make-mg',
      model_id: 'model-zs',
      variant_id: 'variant-essence',
      policy_no: 'P-123',
      insurer: 'Acko',
      end_date: '2027-01-15',
    });
  });

  it('an Insurance file without its details blocks Next and says so; the details form requires every field', async () => {
    await onStep3();
    await addVehicle();
    await uploadPhoto('insurance', 'file:///tmp/policy.jpg');
    expect(screen.getByTestId('document-insurance-needs-details')).toHaveTextContent(d.needsDetails);
    expect(disabled('documents-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('document-insurance-manual'));
    await fireEvent.press(await screen.findByTestId('document-insurance-details-save'));
    expect(screen.getAllByText(d.fields.required)).toHaveLength(3);
    expect(screen.queryByTestId('document-insurance-added')).toBeNull();
  });

  it('the (i) explains the document', async () => {
    await onStep3();
    await fireEvent.press(screen.getByTestId('document-pollution-info'));
    expect(await screen.findByText(d.cards.pollution.info)).toBeTruthy();
  });

  it('the selector lists the user\'s vehicles; picking one selects it', async () => {
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345'), vehicleRow('v-2', 'TS09AB1234')]);
    await onStep3();
    await waitFor(() => expect(screen.getByTestId('vehicle-select')).toHaveTextContent('TS09EV2345 (MG ZS EV)'));
    await fireEvent.press(screen.getByTestId('vehicle-select'));
    await fireEvent.press(await screen.findByTestId('vehicle-select-option-v-2'));
    await waitFor(() => expect(screen.getByTestId('vehicle-select')).toHaveTextContent(/^TS09AB1234/));
    await fireEvent.press(screen.getByTestId('vehicle-select'));
    expect(await screen.findByTestId('vehicle-select-add')).toHaveTextContent(new RegExp(d.addVehicle));
  });

  it('a taken vehicle number shows the message and stays on "Add new vehicle"', async () => {
    server.use(
      http.post(urls.userVehicles, () =>
        HttpResponse.json({ code: '23505', message: 'duplicate key value violates unique constraint' }, { status: 409 }),
      ),
    );
    await onStep3();
    await fireEvent.press(screen.getByTestId('vehicle-select'));
    await screen.findByTestId('add-vehicle');
    await fireEvent.changeText(screen.getByTestId('add-vehicle-number'), 'TS09EV1234');
    await choose('add-vehicle-make', 'make-mg');
    await choose('add-vehicle-model', 'model-zs');
    await fireEvent.press(screen.getByTestId('add-vehicle-save'));
    expect(await screen.findByText(strings.errors.vehicleNumberTaken)).toBeTruthy();
    expect(screen.getByTestId('add-vehicle')).toBeTruthy();
  });
});
