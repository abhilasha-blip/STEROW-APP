import { http, HttpResponse } from 'msw';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import {
  drivingLicenseOverrides,
  drivingLicenseRow,
  makeSession,
  resetMyVehicles,
  setDrivingLicense,
  setOnboardingBackend,
  setVdocs,
  TEST_OTP,
  vehicleRow,
} from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const sd = strings.savedDocument;
const md = strings.myDocuments;

beforeEach(() => {
  resetAppState();
  mockedLibrary.mockReset();
});
afterEach(resetAppState);

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const ACTIVE = iso(200);
const SOON = iso(10);
const EXPIRED = iso(-3);

const writes = () => requestLog.filter(r => r.method !== 'GET' && r.method !== 'HEAD' && !r.url.includes('/object/sign/'));

/** Signed in (onboarding done, two vehicles) → My Documents → "Upload documents" for v-1. */
async function openUploadDocuments() {
  setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 2 });
  resetMyVehicles([vehicleRow('v-1', 'TS09EV2345'), vehicleRow('v-2', 'TS09AB1234')]);
  await getSupabase().auth.setSession(makeSession());
  __resetSupabaseForTests();
  await renderApp();
  await fireEvent.press(await screen.findByTestId('dashboard-menu'));
  await fireEvent.press(screen.getByTestId('drawer-documents'));
  await fireEvent.press(await screen.findByTestId('my-documents-upload'));
  await screen.findByTestId('upload-documents');
}

describe('document cards: locked until the saved document expires (per vehicle)', () => {
  it('Active → read-only card (details, Active pill, View, helper); no upload / manual / remove', async () => {
    setVdocs('vdocs_insurance', [
      { id: 'i1', vehicle_id: 'v-1', policy_no: 'POL-1', insurer: 'ICICI Lombard', end_date: ACTIVE, document_path: 'u/vdocs_insurance/a.pdf' },
    ]);
    await openUploadDocuments();
    const saved = await screen.findByTestId('document-insurance-saved');
    expect(within(screen.getByTestId('document-insurance-status')).getByText(md.active)).toBeTruthy();
    expect(saved).toHaveTextContent(/POL-1/);
    expect(saved).toHaveTextContent(/ICICI Lombard/);
    expect(screen.getByTestId('document-insurance-saved-helper')).toHaveTextContent(sd.locked);
    expect(screen.getByTestId('document-insurance-saved-view')).toBeTruthy();
    for (const tile of ['upload', 'manual', 'remove', 'file']) {
      expect(screen.queryByTestId(`document-insurance-${tile}`)).toBeNull();
    }
  });

  it('View opens the file through a signed URL', async () => {
    const { Linking } = require('react-native');
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    setVdocs('vdocs_insurance', [
      { id: 'i1', vehicle_id: 'v-1', policy_no: 'POL-1', insurer: 'X', end_date: ACTIVE, document_path: 'u/vdocs_insurance/a.pdf' },
    ]);
    await openUploadDocuments();
    await fireEvent.press(await screen.findByTestId('document-insurance-saved-view'));
    await waitFor(() => expect(openURL).toHaveBeenCalledWith(expect.stringContaining('/object/sign/vehicle-docs/u/vdocs_insurance/a.pdf')));
    openURL.mockRestore();
  });

  it('Expiring soon → also read-only, with the "Expiring soon" pill', async () => {
    setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1', registration_number: 'TS09EV2345', valid_upto: SOON }]);
    await openUploadDocuments();
    expect(await screen.findByTestId('document-rc-saved')).toHaveTextContent(/TS09EV2345/);
    expect(within(screen.getByTestId('document-rc-status')).getByText(md.expiringSoon)).toBeTruthy();
    expect(screen.queryByTestId('document-rc-upload')).toBeNull();
    expect(screen.queryByTestId('document-rc-manual')).toBeNull();
  });

  it('Expired → Upload / Add Manually are back, with the Expired pill; the new one is saved', async () => {
    setVdocs('vdocs_insurance', [{ id: 'i1', vehicle_id: 'v-1', policy_no: 'OLD', insurer: 'X', end_date: EXPIRED }]);
    await openUploadDocuments();
    await waitFor(() => expect(within(screen.getByTestId('document-insurance-status')).getByText(md.expired)).toBeTruthy());
    expect(screen.queryByTestId('document-insurance-saved')).toBeNull();
    expect(screen.getByTestId('document-insurance-upload')).toBeTruthy();
    expect(screen.getByTestId('document-insurance-expired-hint')).toHaveTextContent(sd.expired);
    await fireEvent.press(screen.getByTestId('document-insurance-manual'));
    await fireEvent.changeText(await screen.findByTestId('document-insurance-details-policyNo'), 'NEW-1');
    await fireEvent.changeText(screen.getByTestId('document-insurance-details-insurer'), 'HDFC Ergo');
    await fireEvent.press(screen.getByTestId('document-insurance-details-expiry'));
    const picker = await screen.findByTestId('document-insurance-details-expiry-picker');
    await act(() => picker.props.onChange({ type: 'set' }, new Date(2030, 0, 1)));
    await fireEvent.press(screen.getByTestId('document-insurance-details-expiry-done'));
    await fireEvent.press(screen.getByTestId('document-insurance-details-save'));
    await screen.findByTestId('document-insurance-added');
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('upload-documents-save'));
    expect(await screen.findByTestId('my-documents')).toBeTruthy();
    expect(writes().find(r => r.url.startsWith(urls.table('vdocs_insurance')))?.body).toMatchObject({ policy_no: 'NEW-1' });
  });

  it('no expiry stored (FASTag) → Active → read-only', async () => {
    setVdocs('vdocs_fastag', [{ id: 'f1', vehicle_id: 'v-1', fastag_id: 'FT-77' }]);
    await openUploadDocuments();
    expect(await screen.findByTestId('document-fastag-saved')).toHaveTextContent(/FT-77/);
    expect(within(screen.getByTestId('document-fastag-status')).getByText(md.active)).toBeTruthy();
    expect(screen.queryByTestId('document-fastag-upload')).toBeNull();
  });

  it('Pollution shows its status but stays uploadable', async () => {
    setVdocs('vdocs_pollution', [{ id: 'p1', vehicle_id: 'v-1', certificate_no: 'PUC-1', validity_expiry_date: ACTIVE }]);
    await openUploadDocuments();
    await waitFor(() => expect(within(screen.getByTestId('document-pollution-status')).getByText(md.active)).toBeTruthy());
    expect(screen.getByTestId('document-pollution-upload')).toBeTruthy();
    expect(screen.getByTestId('document-pollution-manual')).toBeTruthy();
    expect(screen.queryByTestId('document-pollution-saved')).toBeNull();
  });

  it('nothing saved → upload as before; a picked file is removable before it is saved', async () => {
    await openUploadDocuments();
    await waitFor(() => expect(requestLog.some(r => r.url.includes('vdocs_fastag'))).toBe(true));
    expect(screen.queryByTestId('document-rc-status')).toBeNull();
    mockedLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///tmp/rc.jpg', type: 'image/jpeg', fileName: 'rc.jpg', fileSize: 1024 }] });
    await fireEvent.press(screen.getByTestId('document-rc-upload'));
    await fireEvent.press(await screen.findByTestId('document-rc-source-gallery'));
    await screen.findByTestId('document-rc-file');
    await fireEvent.press(screen.getByTestId('document-rc-remove'));
    expect(screen.getByTestId('document-rc-upload')).toBeTruthy();
  });

  it('the lock comes from the saved API data, so it survives a relaunch', async () => {
    setVdocs('vdocs_insurance', [{ id: 'i1', vehicle_id: 'v-1', policy_no: 'POL-1', insurer: 'X', end_date: ACTIVE }]);
    const first = await (async () => {
      await openUploadDocuments();
      return screen.findByTestId('document-insurance-saved');
    })();
    expect(first).toBeTruthy();
    // Relaunch: same Keychain (session), new client, app tree and query cache; the same backend rows.
    await screen.unmount();
    resetAppState();
    requestLog.length = 0;
    await renderApp();
    await fireEvent.press(await screen.findByTestId('dashboard-menu'));
    await fireEvent.press(screen.getByTestId('drawer-documents'));
    await fireEvent.press(await screen.findByTestId('my-documents-upload'));
    expect(await screen.findByTestId('document-insurance-saved')).toBeTruthy();
    expect(screen.queryByTestId('document-insurance-upload')).toBeNull();
    expect(requestLog.some(r => r.method === 'GET' && r.url.startsWith(urls.table('vdocs_insurance')))).toBe(true);
  });
});

describe('onboarding 3/3: switching the vehicle switches the locks', () => {
  it('v-1 has an active RC (locked); v-2 has none (upload)', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345'), vehicleRow('v-2', 'TS09AB1234')]);
    setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1', registration_number: 'TS09EV2345', valid_upto: ACTIVE }]);
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await screen.findByTestId('onboarding-documents');
    expect(await screen.findByTestId('document-rc-saved')).toBeTruthy();
    expect(screen.queryByTestId('document-rc-upload')).toBeNull();

    await waitFor(() => expect(screen.getByTestId('vehicle-select').props.accessibilityState?.disabled).toBe(false));
    await fireEvent.press(screen.getByTestId('vehicle-select'));
    await fireEvent.press(await screen.findByTestId('vehicle-select-option-v-2'));
    expect(await screen.findByTestId('document-rc-upload')).toBeTruthy();
    expect(screen.queryByTestId('document-rc-saved')).toBeNull();
    expect(screen.queryByTestId('document-rc-status')).toBeNull();

    // And back: locked again, and nothing typed for a locked card is counted / saved.
    await fireEvent.press(screen.getByTestId('vehicle-select'));
    await fireEvent.press(await screen.findByTestId('vehicle-select-option-v-1'));
    expect(await screen.findByTestId('document-rc-saved')).toBeTruthy();
    expect(screen.getByTestId('documents-next').props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('driving licence: per user, locked until it expires', () => {
  /** 2/3 with a saved licence: routing (select=id) is told there is none, so sign-in opens 1/3 → Skip → 2/3. */
  async function onStep2() {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
    server.use(
      http.get(urls.drivingLicenses, ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get('select') === 'id' ? [] : [{ ...drivingLicenseRow, ...drivingLicenseOverrides }],
        ),
      ),
    );
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await fireEvent.press(await screen.findByTestId('profile-skip'));
    await screen.findByTestId('onboarding-dl');
  }

  it('saved licence with no expiry → Active, read-only on My Profile (no upload)', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 1 });
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests();
    await renderApp();
    await fireEvent.press(await screen.findByTestId('dashboard-menu'));
    await fireEvent.press(screen.getByTestId('drawer-profile'));
    const card = await screen.findByTestId('my-profile-dl-saved-card');
    expect(card).toHaveTextContent(/TS0120110012345/);
    expect(within(card).getByText(md.active)).toBeTruthy();
    expect(screen.getByTestId('my-profile-dl-saved-helper')).toHaveTextContent(sd.locked);
    expect(screen.queryByTestId('my-profile-dl-upload')).toBeNull();
  });

  it('expired licence → Expired pill + "Upload new licence" → the form', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 1 });
    setDrivingLicense({ valid_upto: EXPIRED });
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests();
    await renderApp();
    await fireEvent.press(await screen.findByTestId('dashboard-menu'));
    await fireEvent.press(screen.getByTestId('drawer-profile'));
    const card = await screen.findByTestId('my-profile-dl-saved-card');
    expect(within(card).getByText(md.expired)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('my-profile-dl-upload'));
    await screen.findByTestId('dl-edit');
    expect(await screen.findByTestId('dl-number')).toBeTruthy();
    expect(screen.getByTestId('dl-number').props.value).toBe(''); // a new licence: no prefill from the old one
  });

  it('2/3 with an Expiring soon licence: read-only card; Next continues without saving', async () => {
    setDrivingLicense({ valid_upto: SOON });
    await onStep2();
    const card = await screen.findByTestId('dl-saved-card');
    expect(within(card).getByText(md.expiringSoon)).toBeTruthy();
    expect(screen.queryByTestId('dl-number')).toBeNull();
    expect(screen.queryByTestId('dl-upload-empty')).toBeNull();
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(writes()).toEqual([]);
  });

  it('2/3 with an expired licence: Expired card + an empty form for the new one', async () => {
    setDrivingLicense({ valid_upto: EXPIRED });
    await onStep2();
    const card = await screen.findByTestId('dl-saved-card');
    expect(within(card).getByText(md.expired)).toBeTruthy();
    expect(screen.getByTestId('dl-saved-helper')).toHaveTextContent(sd.expired);
    expect(screen.getByTestId('dl-number').props.value).toBe('');
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
  });
});

describe('licence save refused: 42501 "Hide deleted rows" (backend bug)', () => {
  const HIDDEN_ROW = {
    code: '42501',
    details: null,
    hint: null,
    message: 'new row violates row-level security policy "Hide deleted rows" for table "user_driving_licenses"',
  };

  async function fillAndSubmitOnStep2() {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await fireEvent.press(await screen.findByTestId('profile-skip'));
    await screen.findByTestId('onboarding-dl');
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'ts0120110012345');
    mockedLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///tmp/dl.jpg', type: 'image/jpeg', fileName: 'dl.jpg', fileSize: 2048 }] });
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    await fireEvent.press(await screen.findByTestId('dl-photo-source-gallery'));
    await screen.findByTestId('dl-upload-image');
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('dl-next'));
  }

  it('shows the inline card (no toast), sends the upsert once (no retry), "Skip for now" → 3/3', async () => {
    let upserts = 0;
    server.use(
      http.post(urls.drivingLicenses, () => {
        upserts += 1;
        return HttpResponse.json(HIDDEN_ROW, { status: 403 });
      }),
    );
    await fillAndSubmitOnStep2();
    const notice = await screen.findByTestId('dl-blocked');
    expect(screen.getByTestId('dl-blocked-message')).toHaveTextContent(strings.errors.dlDeletedBlocked);
    expect(screen.getAllByText(strings.errors.dlDeletedBlocked)).toHaveLength(1); // inline only, no error toast
    await act(() => new Promise<void>(r => setTimeout(r, 300)));
    expect(upserts).toBe(1);
    await fireEvent.press(within(notice).getByTestId('dl-blocked-action'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(upserts).toBe(1);
  });

  it('a bare 42501 on the licence save means the same (the message may be generic)', async () => {
    server.use(http.post(urls.drivingLicenses, () => HttpResponse.json({ code: '42501', message: 'permission denied' }, { status: 403 })));
    await fillAndSubmitOnStep2();
    expect(await screen.findByTestId('dl-blocked-message')).toHaveTextContent(strings.errors.dlDeletedBlocked);
  });
});
