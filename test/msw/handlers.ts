import { http, HttpResponse } from 'msw';
import {
  appError,
  authUser,
  backendMessages,
  drivingLicenseRow,
  makeSession,
  onboardingBackend,
  resetOnboardingBackend,
  otpRequestData,
  permissionsRows,
  TEST_OTP,
  userDetailsRow,
  userRolesRows,
  vehicleMakes,
  vehicleModels,
  vehicleVariants,
  CREATED_VEHICLE_ID,
} from './fixtures';
import { urls } from './urls';
import { ENDPOINTS } from '@/api/endpoints';

const { REST } = ENDPOINTS.SUPABASE;

/** Every request the tests saw, for asserting bodies / headers. */
export const requestLog: Array<{ url: string; method: string; body: unknown; headers: Headers }> = [];

async function log(request: Request) {
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    body = undefined;
  }
  requestLog.push({ url: request.url, method: request.method, body, headers: request.headers });
}

let requestCounter = 0;
/** Each test starts at req-1. */
export function resetHandlerState(): void {
  requestCounter = 0;
  requestLog.length = 0;
  resetOnboardingBackend();
}

/** Happy-path defaults; tests override with server.use(...). */
export const handlers = [
  http.post(urls.otpRequest, async ({ request }) => {
    await log(request);
    requestCounter += 1;
    return HttpResponse.json({
      data: { ...otpRequestData, requestId: `req-${requestCounter}`, isNewUser: false },
    });
  }),
  http.post(urls.otpVerify, async ({ request }) => {
    await log(request);
    const body = (await request.json()) as { otp?: string };
    if (body.otp !== TEST_OTP) {
      return HttpResponse.json(appError(backendMessages.incorrectOtp), { status: 400 });
    }
    return HttpResponse.json({ data: makeSession() });
  }),
  http.get(urls.sbUser, async ({ request }) => {
    await log(request);
    return HttpResponse.json(authUser);
  }),
  http.post(urls.sbToken, async ({ request }) => {
    await log(request);
    return HttpResponse.json(makeSession());
  }),
  http.post(urls.sbVerify, async ({ request }) => {
    await log(request);
    return HttpResponse.json(makeSession());
  }),
  http.post(urls.sbLogout, async ({ request }) => {
    await log(request);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(urls.userDetails, async ({ request }) => {
    await log(request);
    return HttpResponse.json([userDetailsRow]);
  }),
  http.get(urls.userRoles, async ({ request }) => {
    await log(request);
    return HttpResponse.json(userRolesRows);
  }),
  http.post(urls.myPermissions, async ({ request }) => {
    await log(request);
    return HttpResponse.json(permissionsRows);
  }),
  // PATCH user_details?id=eq.<uid>&select=id → the updated rows.
  http.patch(urls.userDetails, async ({ request }) => {
    await log(request);
    return HttpResponse.json([{ id: userDetailsRow.id }]);
  }),
  // Post-login routing (select=id, limit 1) and onboarding 2/3 (select=*, maybeSingle).
  http.get(urls.drivingLicenses, async ({ request }) => {
    await log(request);
    return HttpResponse.json(onboardingBackend.hasDrivingLicense ? [drivingLicenseRow] : []);
  }),
  // Upsert on_conflict=user_id (.select().single() → one object).
  http.post(urls.drivingLicenses, async ({ request }) => {
    await log(request);
    const body = (await request.clone().json()) as Record<string, unknown>;
    return HttpResponse.json({ ...drivingLicenseRow, ...body }, { status: 201 });
  }),
  // Storage: upload → { Key, Id }; sign → { signedURL } (relative, storage-js prefixes the base).
  http.post(`${urls.storageRoot}/object/sign/*`, async ({ request, params }) => {
    await log(request);
    const objectPath = String(params[0]);
    return HttpResponse.json({ signedURL: `/object/sign/${objectPath}?token=signed-${objectPath.length}` });
  }),
  http.post(`${urls.storageRoot}/object/*`, async ({ request, params }) => {
    requestLog.push({ url: request.url, method: request.method, body: undefined, headers: request.headers });
    const key = String(params[0]);
    return HttpResponse.json({ Key: key, Id: `obj-${key.length}` });
  }),
  http.delete(`${urls.storageRoot}/object/*`, async ({ request }) => {
    await log(request);
    return HttpResponse.json([]);
  }),
  // Post-login routing: active vehicle count (HEAD, count=exact, is_active=eq.true).
  http.head(urls.userVehicles, async ({ request }) => {
    await log(request);
    const n = onboardingBackend.vehicleCount;
    return new HttpResponse(null, { status: 200, headers: { 'Content-Range': n ? `0-${n - 1}/${n}` : '*/0' } });
  }),
  // 3/3: vehicle master data, the vehicle insert and the document inserts (.select('id').single()).
  http.get(urls.vehicleMakes, async ({ request }) => {
    await log(request);
    return HttpResponse.json(vehicleMakes);
  }),
  http.get(urls.vehicleModels, async ({ request }) => {
    await log(request);
    return HttpResponse.json(vehicleModels);
  }),
  http.get(urls.vehicleVariants, async ({ request }) => {
    await log(request);
    return HttpResponse.json(vehicleVariants);
  }),
  http.post(urls.userVehicles, async ({ request }) => {
    await log(request);
    return HttpResponse.json({ id: CREATED_VEHICLE_ID }, { status: 201 });
  }),
  ...[REST.VDOCS_RC, REST.VDOCS_INSURANCE, REST.VDOCS_POLLUTION, REST.VDOCS_FASTAG].map(table =>
    http.post(urls.vdocs(table), async ({ request }) => {
      await log(request);
      return HttpResponse.json({ id: `${table}-1` }, { status: 201 });
    }),
  ),
];
