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
  drivingLicenses: `${sb}/rest/v1/${ENDPOINTS.SUPABASE.REST.USER_DRIVING_LICENSES}`,
  userVehicles: `${sb}/rest/v1/${ENDPOINTS.SUPABASE.REST.USER_VEHICLES}`,
  vdocs: (table: string) => `${sb}/rest/v1/${table}`,
  vehicleMakes: `${sb}/rest/v1/${ENDPOINTS.SUPABASE.REST.VEHICLE_MAKES}`,
  vehicleModels: `${sb}/rest/v1/${ENDPOINTS.SUPABASE.REST.VEHICLE_MODELS}`,
  vehicleVariants: `${sb}/rest/v1/${ENDPOINTS.SUPABASE.REST.VEHICLE_VARIANTS}`,
  /** Storage: `${storageRoot}/object/<bucket>/<path>` (upload), `/object/sign/<bucket>/<path>` (sign). */
  storageRoot: `${sb}/storage/v1`,
};
