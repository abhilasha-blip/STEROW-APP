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
} from './fixtures';
import { urls } from './urls';

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
  // Post-login routing: the DL row (select=id, limit 1) and the vehicle count (HEAD, count=exact).
  http.get(urls.drivingLicenses, async ({ request }) => {
    await log(request);
    return HttpResponse.json(onboardingBackend.hasDrivingLicense ? [drivingLicenseRow] : []);
  }),
  http.head(urls.userVehicles, async ({ request }) => {
    await log(request);
    const n = onboardingBackend.vehicleCount;
    return new HttpResponse(null, {
      status: 200,
      headers: { 'Content-Range': n ? `0-${n - 1}/${n}` : '*/0' },
    });
  }),
];
