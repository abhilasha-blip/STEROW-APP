import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import {
  makeSession,
  resetMyVehicles,
  setOnboardingBackend,
  setShareRows,
  setVdocs,
  vehicleRow,
} from '../../../test/msw/fixtures';
import { requestLog } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

/** Signed in, onboarding done, two vehicles; then a drawer row. */
async function openFromDrawer(row: string) {
  setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 2 });
  resetMyVehicles([vehicleRow('v-1', 'TS09EV2345'), vehicleRow('v-2', 'TS09AB1234')]);
  await getSupabase().auth.setSession(makeSession());
  __resetSupabaseForTests();
  await renderApp();
  await fireEvent.press(await screen.findByTestId('dashboard-menu'));
  await fireEvent.press(screen.getByTestId(`drawer-${row}`));
}

describe('My Documents', () => {
  it('the first vehicle + its documents with status pills; Change switches the vehicle', async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setVdocs('vdocs_insurance', [{ id: 'i1', vehicle_id: 'v-1', insurer: 'ICICI Lombard', end_date: '2099-01-15' }]);
    setVdocs('vdocs_pollution', [{ id: 'p1', vehicle_id: 'v-1', validity_expiry_date: iso(soon) }]);
    setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1', valid_upto: '2020-03-20' }]);
    setVdocs('vdocs_fastag', [{ id: 'f1', vehicle_id: 'v-2', fastag_id: 'FT1' }]);
    await openFromDrawer('documents');
    expect(await screen.findByTestId('my-documents-vehicle')).toHaveTextContent(/TS09EV2345/);
    const insurance = await screen.findByTestId('my-document-insurance');
    expect(insurance).toHaveTextContent(/ICICI Lombard • Expires: 15\/01\/2099/);
    expect(screen.getByTestId('my-document-insurance-status')).toHaveTextContent(strings.myDocuments.active);
    expect(screen.getByTestId('my-document-pollution-status')).toHaveTextContent(strings.myDocuments.expiringSoon);
    expect(screen.getByTestId('my-document-rc-status')).toHaveTextContent(strings.myDocuments.expired);
    expect(screen.getByTestId('my-document-drivingLicence')).toHaveTextContent(new RegExp(strings.myDocuments.names.drivingLicence));

    await fireEvent.press(screen.getByTestId('my-documents-change'));
    await fireEvent.press(await screen.findByTestId('my-documents-picker-option-v-2'));
    await waitFor(() => expect(screen.getByTestId('my-documents-vehicle')).toHaveTextContent(/TS09AB1234/));
    expect(await screen.findByTestId('my-document-fastag')).toBeTruthy();
    expect(screen.queryByTestId('my-document-insurance')).toBeNull();
  });

  it('"Upload documents" → the document cards → Save adds them to the selected vehicle', async () => {
    await openFromDrawer('documents');
    await fireEvent.press(await screen.findByTestId('my-documents-upload'));
    await screen.findByTestId('upload-documents');
    expect(screen.getByTestId('upload-documents-save').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('document-fastag-manual'));
    await fireEvent.changeText(await screen.findByTestId('document-fastag-details-fastagId'), 'ft-1');
    await fireEvent.press(screen.getByTestId('document-fastag-details-save'));
    await screen.findByTestId('document-fastag-added');
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('upload-documents-save'));
    expect(await screen.findByTestId('my-documents')).toBeTruthy();
    expect(requestLog.find(r => r.method === 'POST' && r.url.startsWith(urls.table('vdocs_fastag')))?.body).toMatchObject({
      vehicle_id: 'v-1',
      fastag_id: 'FT-1',
    });
  });

  it('RC "Add Manually" opens the full RC form (not the one-field sheet); Save sends its fields', async () => {
    await openFromDrawer('documents');
    await fireEvent.press(await screen.findByTestId('my-documents-upload'));
    await screen.findByTestId('upload-documents');
    await fireEvent.press(screen.getByTestId('document-rc-manual'));
    await screen.findByTestId('rc-details');
    expect(screen.queryByTestId('document-rc-details-registrationNumber')).toBeNull();
    expect(screen.getByTestId('rc-details-registration').props.value).toBe('TS09EV2345');
    for (const id of ['reg-date', 'valid-upto', 'address', 'body-type', 'fuel', 'chassis', 'engine', 'colour', 'seating', 'gross-weight', 'unladen-weight']) {
      expect(screen.getByTestId(`rc-details-${id}`)).toBeTruthy();
    }
    await waitFor(() => expect(screen.getByTestId('rc-details-next').props.accessibilityState).toMatchObject({ disabled: false }));
    await fireEvent.changeText(screen.getByTestId('rc-details-engine'), 'en9');
    await fireEvent.changeText(screen.getByTestId('rc-details-seating'), '5');
    await fireEvent.press(screen.getByTestId('rc-details-next'));
    await screen.findByTestId('document-rc-added');
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('upload-documents-save'));
    expect(await screen.findByTestId('my-documents')).toBeTruthy();
    expect(requestLog.find(r => r.method === 'POST' && r.url.startsWith(urls.table('vdocs_regcertificate')))?.body).toMatchObject({
      vehicle_id: 'v-1',
      registration_number: 'TS09EV2345',
      engine_number: 'EN9',
      seating_capacity: 5,
    });
  });
});

describe('My Profile', () => {
  it('shows name, email (unverified), mobile (verified), completion; DOB / emergency are "Add"', async () => {
    await openFromDrawer('profile');
    await screen.findByTestId('my-profile');
    await waitFor(() => expect(screen.getByTestId('my-profile-name')).toHaveTextContent(/Test User/));
    expect(screen.getByTestId('my-profile-email')).toHaveTextContent(/test-user@sterow\.test/);
    expect(screen.getByLabelText(strings.myProfile.unverifiedA11y)).toBeTruthy();
    expect(screen.getByTestId('my-profile-mobile')).toHaveTextContent(/\+91 99999 99999/);
    expect(screen.getByTestId('my-profile-dob')).toHaveTextContent(new RegExp(strings.myProfile.add));
    expect(screen.getByTestId('my-profile-emergency')).toHaveTextContent(new RegExp(strings.myProfile.add));
    // Same getProfileCompletion as the dashboard: name, email, mobile, licence = 4/6 (no photo / vehicle doc).
    await waitFor(() => expect(screen.getByTestId('my-profile-completion')).toHaveTextContent(/67% Completed/));
    await fireEvent.press(screen.getByTestId('my-profile-dob'));
    expect(await screen.findByText(strings.myProfile.pendingBackend)).toBeTruthy();
  });

  it('Edit (personal) → name → PATCH user_details.full_name', async () => {
    await openFromDrawer('profile');
    await fireEvent.press(await screen.findByTestId('my-profile-personal-edit'));
    const input = await screen.findByTestId('my-profile-edit-input');
    await fireEvent.changeText(input, '  Ravi   Kumar ');
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('my-profile-edit-save'));
    expect(await screen.findByText(strings.myProfile.saved)).toBeTruthy();
    expect(requestLog.find(r => r.method === 'PATCH')?.body).toEqual({ full_name: 'Ravi Kumar' });
  });
});

describe('Share Access and My Vehicles', () => {
  it('Share Access: one card per person from vehicle_shares (verified, role, Call, vehicle chips) + the button', async () => {
    setShareRows([
      { id: 's1', vehicle_id: 'v-1', member_user_id: 'u-2', member_phone: '9000000001', member_name: 'Asha Rao', member_role: 'driver', status: 'active' },
      { id: 's2', vehicle_id: 'v-2', member_user_id: 'u-2', member_phone: '9000000001', member_name: 'Asha Rao', member_role: 'driver', status: 'active' },
      { id: 's3', vehicle_id: 'v-2', member_user_id: null, member_phone: '9000000002', member_name: 'Dev Rao', member_role: 'family', status: 'pending' },
    ]);
    await openFromDrawer('share');
    const card = await screen.findByTestId('person-s1');
    expect(card).toHaveTextContent(/Asha Rao/);
    expect(within(card).getByText(strings.shareAccess.verified)).toBeTruthy();
    expect(within(card).getByText(strings.shareAccess.roles.driver)).toBeTruthy();
    await waitFor(() => expect(within(card).getByText('TS09EV2345')).toBeTruthy());
    expect(within(card).getByText('TS09AB1234')).toBeTruthy();
    expect(screen.getByTestId('person-s1-call')).toBeTruthy();
    const pending = screen.getByTestId('person-s3');
    expect(pending).toHaveTextContent(new RegExp(strings.shareAccess.roles.family));
    expect(within(pending).queryByText(strings.shareAccess.verified)).toBeNull();
    expect(screen.queryByTestId('share-access-empty')).toBeNull();
    expect(screen.getByTestId('share-access-cta')).toHaveTextContent(strings.shareAccess.cta);
  });

  it('Share Access with no shares: empty state + the button', async () => {
    await openFromDrawer('share');
    expect(await screen.findByTestId('share-access-empty')).toHaveTextContent(new RegExp(strings.shareAccess.emptyTitle));
    expect(screen.queryByText(/Rajesh|Priya/)).toBeNull();
    expect(screen.getByTestId('share-access-cta')).toBeTruthy();
  });

  it('My Vehicles: the vehicle cards + "Add vehicle"', async () => {
    await openFromDrawer('vehicles');
    expect(await screen.findByTestId('my-vehicle-v-1')).toHaveTextContent(/MG ZS EV/);
    expect(screen.getByTestId('my-vehicle-v-2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('my-vehicles-add'));
    expect(await screen.findByTestId('add-vehicle')).toBeTruthy();
  });
});
