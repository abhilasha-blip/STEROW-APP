/**
 * URLs the tests intercept, built from the same env + ENDPOINTS the app uses.
 * The Supabase auth paths are supabase-js internals (not called by app code directly).
 */
import { ENDPOINTS } from '@/api/endpoints';
import { getEnv } from '@/config/env';

const env = getEnv();
const sb = env.SUPABASE_URL;

export const urls = {
  otpRequest: `${env.APP_API_BASE_URL}${ENDPOINTS.APP.AUTH.OTP_REQUEST}`,
  otpVerify: `${env.APP_API_BASE_URL}${ENDPOINTS.APP.AUTH.OTP_VERIFY}`,
  sbUser: `${sb}/auth/v1/user`,
  sbToken: `${sb}/auth/v1/token`,
  sbVerify: `${sb}/auth/v1/verify`,
  sbLogout: `${sb}/auth/v1/logout`,
  userDetails: `${sb}/rest/v1/${ENDPOINTS.SUPABASE.REST.USER_DETAILS}`,
  userRoles: `${sb}/rest/v1/${ENDPOINTS.SUPABASE.REST.USER_ROLES}`,
  myPermissions: `${sb}/rest/v1/rpc/${ENDPOINTS.SUPABASE.RPC.MY_PERMISSIONS}`,
};
