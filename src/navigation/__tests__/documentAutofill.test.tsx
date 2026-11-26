import { delay, http, HttpResponse } from 'msw';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { __setFeatureFlagsForTests } from '@/config/features';
import { strings } from '@/constants/strings';
import { makeSession, ocrFixtures, resetMyVehicles, setOnboardingBackend, TEST_OTP, vehicleRow } from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const a = strings.autofill;

beforeEach(() => {
  resetAppState();
  mockedLibrary.mockReset();
});
afterEach(() => {
  __setFeatureFlagsForTests();
  resetAppState();
});

/** The OCR route answers after a short wait (so "Reading your document…" can be seen). */
function ocrReplies(url: string, body: object, status = 200) {
  let calls = 0;
  server.use(
    http.post(url, async () => {
      calls += 1;
      await delay(30);
      return HttpResponse.json(body, { status });
    }),
  );
  return () => calls;
}

async function openUploadDocuments() {
  setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 1 });
  resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
  await getSupabase().auth.setSession(makeSession());
  __resetSupabaseForTests();
  await renderApp();
  await fireEvent.press(await screen.findByTestId('dashboard-menu'));
  await fireEvent.press(screen.getByTestId('drawer-documents'));
  await fireEvent.press(await screen.findByTestId('my-documents-upload'));
  await screen.findByTestId('upload-documents');
  await waitFor(() => expect(requestLog.some(r => r.url.includes('vdocs_fastag'))).toBe(true));
}

async function pickFile(key: string, uri = 'file:///tmp/policy.jpg') {
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri, type: 'image/jpeg', fileName: uri.split('/').pop(), fileSize: 1024 }] });
  await fireEvent.press(screen.getByTestId(`document-${key}-upload`));
  await fireEvent.press(await screen.findByTestId(`document-${key}-source-gallery`));
  await screen.findByTestId(`document-${key}-file`);
}

describe('autofill on the document cards', () => {
  it('success: "Reading your document…" → review form pre-filled + "Auto-filled – please check" → Confirm → saved', async () => {
    __setFeatureFlagsForTests({ OCR_ENABLED: true });
    const calls = ocrReplies(urls.ocrDocument, ocrFixtures.insurance);
    await openUploadDocuments();
    await pickFile('insurance');
    expect(await screen.findByTestId('document-insurance-reading')).toHaveTextContent(a.reading);
    await screen.findByTestId('document-insurance-autofill');
    expect(screen.getByTestId('document-insurance-autofill-policyNo').props.value).toBe('OG-27-1901-1800-00012345');
    expect(screen.getByTestId('document-insurance-autofill-insurer').props.value).toBe('ICICI Lombard');
    for (const k of ['policyNo', 'insurer', 'validUpto']) {
      expect(screen.getByTestId(`document-insurance-autofill-${k}-auto`)).toHaveTextContent(a.autoFilled);
    }
    expect(screen.queryByTestId('document-insurance-reading')).toBeNull();
    // Each field stays editable.
    await fireEvent.changeText(screen.getByTestId('document-insurance-autofill-insurer'), 'ICICI Lombard GIC');
    await fireEvent.press(screen.getByTestId('document-insurance-autofill-confirm'));
    await screen.findByTestId('document-insurance-added');
    expect(calls()).toBe(1);

    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('upload-documents-save'));
    expect(await screen.findByTestId('my-documents')).toBeTruthy();
    expect(requestLog.find(r => r.method === 'POST' && r.url.startsWith(urls.table('vdocs_insurance')))?.body).toMatchObject({
      policy_no: 'OG-27-1901-1800-00012345',
      insurer: 'ICICI Lombard GIC',
      end_date: '2027-08-31',
      document_path: expect.stringMatching(/vdocs_insurance\/.+\.jpg$/),
    });
  });

  it('partial: only what was read is marked; what the user typed before stays', async () => {
    __setFeatureFlagsForTests({ OCR_ENABLED: true });
    ocrReplies(urls.ocrDocument, { data: { policy_no: 'P-9', insurer: '', end_date: null } });
    await openUploadDocuments();
    await fireEvent.press(screen.getByTestId('document-insurance-manual'));
    await fireEvent.changeText(await screen.findByTestId('document-insurance-details-policyNo'), 'OLD-1');
    await fireEvent.changeText(screen.getByTestId('document-insurance-details-insurer'), 'HDFC Ergo');
    await fireEvent.press(screen.getByTestId('document-insurance-details-expiry'));
    const picker = await screen.findByTestId('document-insurance-details-expiry-picker');
    await act(() => picker.props.onChange({ type: 'set' }, new Date(2030, 0, 1)));
    await fireEvent.press(screen.getByTestId('document-insurance-details-expiry-done'));
    await fireEvent.press(screen.getByTestId('document-insurance-details-save'));
    await screen.findByTestId('document-insurance-added');
    await pickFile('insurance');
    await screen.findByTestId('document-insurance-autofill');
    expect(screen.getByTestId('document-insurance-autofill-policyNo').props.value).toBe('P-9');
    expect(screen.getByTestId('document-insurance-autofill-insurer').props.value).toBe('HDFC Ergo');
    expect(screen.getByTestId('document-insurance-autofill-policyNo-auto')).toBeTruthy();
    expect(screen.queryByTestId('document-insurance-autofill-insurer-auto')).toBeNull();
    expect(screen.queryByTestId('document-insurance-autofill-validUpto-auto')).toBeNull();
  });

  it('failure: the toast "Could not read the document. Please enter the details." + the manual form', async () => {
    __setFeatureFlagsForTests({ OCR_ENABLED: true });
    ocrReplies(urls.ocrDocument, ocrFixtures.couldNotRead, 400);
    await openUploadDocuments();
    await pickFile('fastag');
    expect(await screen.findByText(a.couldNotRead)).toBeTruthy();
    await screen.findByTestId('document-fastag-autofill');
    expect(screen.getByTestId('document-fastag-autofill-fastagId').props.value).toBe('');
    expect(screen.queryByTestId('document-fastag-autofill-fastagId-auto')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('document-fastag-autofill-fastagId'), 'ft9');
    await fireEvent.press(screen.getByTestId('document-fastag-autofill-confirm'));
    await screen.findByTestId('document-fastag-added');
  });

  it('flag off: no reading, no review form, no OCR call (as before)', async () => {
    const calls = ocrReplies(urls.ocrDocument, ocrFixtures.insurance);
    await openUploadDocuments();
    await pickFile('insurance');
    expect(screen.queryByTestId('document-insurance-reading')).toBeNull();
    expect(screen.queryByTestId('document-insurance-autofill')).toBeNull();
    expect(screen.getByTestId('document-insurance-needs-details')).toBeTruthy();
    expect(calls()).toBe(0);
  });
});

describe('autofill on the driving licence (2/3)', () => {
  async function onStep2() {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await fireEvent.press(await screen.findByTestId('profile-skip'));
    await screen.findByTestId('onboarding-dl');
  }
  async function pickLicence() {
    mockedLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///tmp/dl.jpg', type: 'image/jpeg', fileName: 'dl.jpg', fileSize: 2048 }] });
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    await fireEvent.press(await screen.findByTestId('dl-photo-source-gallery'));
    await screen.findByTestId('dl-upload-image');
  }

  it('reads the licence → review (number upper-case, dates YYYY-MM-DD) → Confirm fills the form → Next saves it', async () => {
    __setFeatureFlagsForTests({ OCR_ENABLED: true });
    ocrReplies(urls.ocrDrivingLicense, { data: { dl_number: ' ts0120110012345 ', issued_on: '15/01/2020', valid_upto: '2040-01-14', vehicle_classes: ['LMV'] } });
    await onStep2();
    expect(screen.getByTestId('onboarding-dl')).toHaveTextContent(new RegExp(strings.onboarding.drivingLicence.or)); // "Or" with OCR on
    await pickLicence();
    expect(await screen.findByTestId('dl-upload-busy')).toHaveTextContent(a.reading);
    await screen.findByTestId('dl-autofill');
    expect(screen.getByTestId('dl-autofill-dlNumber').props.value).toBe('TS0120110012345');
    expect(screen.getByTestId('dl-autofill-dlNumber-auto')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dl-autofill-confirm'));
    await waitFor(() => expect(screen.getByTestId('dl-number').props.value).toBe('TS0120110012345'));

    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(requestLog.find(r => r.method === 'POST' && r.url.startsWith(urls.drivingLicenses))?.body).toMatchObject({
      dl_number: 'TS0120110012345',
      issued_on: '2020-01-15',
      valid_upto: '2040-01-14',
    });
  });

  it('a network failure → the toast + the manual form (no retry)', async () => {
    __setFeatureFlagsForTests({ OCR_ENABLED: true });
    server.use(http.post(urls.ocrDrivingLicense, () => HttpResponse.error()));
    await onStep2();
    await pickLicence();
    expect(await screen.findByText(a.couldNotRead)).toBeTruthy();
    expect(screen.getByTestId('dl-autofill-dlNumber').props.value).toBe('');
  });

  it('flag off: picking the licence does nothing more', async () => {
    const calls = ocrReplies(urls.ocrDrivingLicense, ocrFixtures.dlFull);
    await onStep2();
    await pickLicence();
    expect(screen.queryByTestId('dl-upload-busy')).toBeNull();
    expect(screen.queryByTestId('dl-autofill')).toBeNull();
    expect(calls()).toBe(0);
  });
});
