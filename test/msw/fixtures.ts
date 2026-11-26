/**
 * Fixtures derived from the redacted live captures in docs/api/examples/ (2026-11-19).
 * Tokens are fake but structurally valid (supabase-js decodes the JWT `exp`).
 */
import authUserExample from '../../docs/api/examples/auth-user.json';
import permissionsExample from '../../docs/api/examples/my_permissions.json';
import otpRequestExample from '../../docs/api/examples/otp-request.signin.response.json';
import userDetailsExample from '../../docs/api/examples/user_details.json';
import userRolesExample from '../../docs/api/examples/user_roles.json';

// Node 22 (the jest runtime) provides btoa; the RN type environment doesn't declare it.
declare function btoa(data: string): string;
const b64url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]+$/, '');

export const UID = authUserExample.id;
export const TEST_OTP = '123456';
export const TEST_PHONE = '9999999999';

let tokenCounter = 0;
/** Unsigned JWT with the claims supabase-js reads. */
export function makeAccessToken(expiresInS = 3600, sub = UID): string {
  tokenCounter += 1;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ sub, exp: now + expiresInS, iat: now, role: 'authenticated', n: tokenCounter }),
  );
  return `${header}.${payload}.c2lnbmF0dXJl`;
}

export const authUser = {
  ...authUserExample,
  email: '9999999999@phone.local',
  user_metadata: { ...authUserExample.user_metadata, full_name: 'Test User', phone: TEST_PHONE },
};

export function makeSession(expiresInS = 3600) {
  return {
    access_token: makeAccessToken(expiresInS),
    refresh_token: `refresh-${Math.random().toString(36).slice(2, 10)}`,
    expires_in: expiresInS,
    expires_at: Math.floor(Date.now() / 1000) + expiresInS,
    token_type: 'bearer',
    user: authUser,
  };
}

export const otpRequestData = otpRequestExample.body.data;

export const userDetailsRow = { ...userDetailsExample[0], full_name: 'Test User', phone: TEST_PHONE };
/** Per-test changes to the user_details row the GET returns (e.g. an avatar); reset before each test. */
export const userDetailsOverrides: Record<string, unknown> = {};
export function setUserDetails(patch: Record<string, unknown>): void {
  Object.assign(userDetailsOverrides, patch);
}
export function resetUserDetails(): void {
  for (const k of Object.keys(userDetailsOverrides)) {
    delete userDetailsOverrides[k];
  }
}
export const userRolesRows = userRolesExample;
export const permissionsRows = permissionsExample;

export const backendMessages = {
  alreadyRegistered: 'This mobile number is already registered. Please sign in.',
  noAccount: 'No account found for this mobile number.',
  cooldown: 'Please wait 30 seconds before requesting another OTP.',
  incorrectOtp: 'Incorrect OTP.',
  incorrectTestOtp: 'Incorrect, expired or disabled test OTP.',
  expired: 'OTP expired. Request a new one.',
  invalidPhone: 'Enter a valid India or UAE mobile number',
} as const;

export const appError = (message: string) => ({ error: { code: 'bad_request', message } });

/** user_driving_licenses row (columns as read by the web's DL form). */
export const drivingLicenseRow = {
  id: 'dl-1',
  user_id: UID,
  dl_number: 'TS0120110012345',
  issued_on: null,
  valid_upto: null,
  vehicle_classes: [],
  document_path: `${UID}/1795400000000-dl.jpg`,
};

/**
 * What the post-login routing reads (onboardingProgress.service). Default: onboarding done (a DL and
 * one active vehicle) so auth tests land on the Dashboard; routing tests switch it per test.
 */
export const onboardingBackend = { hasDrivingLicense: true, vehicleCount: 1 };
/** Per-test changes to the saved licence (e.g. valid_upto for its status). */
export const drivingLicenseOverrides: Partial<Record<keyof typeof drivingLicenseRow, unknown>> = {};
export function setDrivingLicense(next: Partial<Record<keyof typeof drivingLicenseRow, unknown>>): void {
  Object.assign(drivingLicenseOverrides, next);
}
export function setOnboardingBackend(next: Partial<typeof onboardingBackend>): void {
  Object.assign(onboardingBackend, next);
}
export function resetOnboardingBackend(): void {
  Object.assign(onboardingBackend, { hasDrivingLicense: true, vehicleCount: 1 });
  for (const k of Object.keys(drivingLicenseOverrides) as (keyof typeof drivingLicenseOverrides)[]) {
    delete drivingLicenseOverrides[k];
  }
}

/** Vehicle master data: two makes, two models, two variants (+ one inactive variant). */
export const vehicleMakes = [
  { id: 'make-mg', name: 'MG', is_active: true },
  { id: 'make-hy', name: 'Hyundai', is_active: true },
];
export const vehicleModels = [
  { id: 'model-zs', name: 'ZS EV', make_id: 'make-mg', is_active: true },
  { id: 'model-verna', name: 'Verna', make_id: 'make-hy', is_active: true },
];
export const vehicleVariants = [
  { id: 'variant-essence', variant_name: 'Essence', model_id: 'model-zs', fuel_type: 'Electric', transmission_type: 'Automatic', is_active: true },
  { id: 'variant-sx', variant_name: '1.6 VTVT SX', model_id: 'model-verna', fuel_type: 'Petrol', transmission_type: 'Manual', is_active: true },
  { id: 'variant-old', variant_name: 'Old', model_id: 'model-verna', fuel_type: 'Diesel', transmission_type: 'Manual', is_active: false },
];
export const CREATED_VEHICLE_ID = 'vehicle-1';

/** Dashboard tile counts (HEAD + count=exact). Per table; reset before each test. */
export const countsBackend: Record<string, number> = {};
export function setCounts(next: Record<string, number>): void {
  Object.assign(countsBackend, next);
}
export function resetCounts(): void {
  for (const k of Object.keys(countsBackend)) {
    delete countsBackend[k];
  }
}

/** service_bookings HEAD with `status=in.(…serviced…)` (the Service History tile) reads this key. */
export const SERVICE_HISTORY_COUNT = 'service_bookings:history';

/** vehicle_shares rows (GET, Share Access); reset before each test. Default: none. */
export const shareRows: Record<string, unknown>[] = [];
export function setShareRows(rows: Record<string, unknown>[]): void {
  shareRows.length = 0;
  shareRows.push(...rows);
}

/** vdocs rows per table (GET <table>?vehicle_id=eq.<id> or in.(<ids>)); reset before each test. */
export const vdocsRows: Record<string, Record<string, unknown>[]> = {};
export function setVdocs(table: string, rows: Record<string, unknown>[]): void {
  vdocsRows[table] = rows;
}
export function resetVdocs(): void {
  for (const k of Object.keys(vdocsRows)) {
    delete vdocsRows[k];
  }
}

/** A user_vehicles row as listMyVehicles reads it (names embedded). */
export const vehicleRow = (id: string, number: string) => ({
  id,
  vehicle_number: number,
  make_id: 'make-mg',
  model_id: 'model-zs',
  variant_id: 'variant-essence',
  fuel_type: 'Electric',
  transmission_type: 'Automatic' as string,
  color: null as string | null,
  make: { name: 'MG' },
  model: { name: 'ZS EV' },
  variant: { variant_name: 'Essence' },
});
/** The signed-in user's vehicles (GET user_vehicles); vehicles created in a test are appended. */
export const myVehicles: ReturnType<typeof vehicleRow>[] = [];
export function resetMyVehicles(rows: ReturnType<typeof vehicleRow>[] = []): void {
  myVehicles.length = 0;
  myVehicles.push(...rows);
}
