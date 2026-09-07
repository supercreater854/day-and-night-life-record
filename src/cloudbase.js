import cloudbase from '@cloudbase/js-sdk/app';
import { registerAuth } from '@cloudbase/js-sdk/auth';

export const CLOUD_BASE_ENV = 'daynight-d2g3dj5fs4734fda7';
export const CLOUD_BASE_REGION = 'ap-shanghai';

registerAuth(cloudbase);

const app = cloudbase.init({
  env: CLOUD_BASE_ENV,
  region: CLOUD_BASE_REGION,
  persistence: 'local',
  auth: { detectSessionInUrl: true },
});

export const cloudbaseAuth = app.auth();

export function sessionUser(result) {
  return result?.data?.user ?? result?.data?.session?.user ?? null;
}

export function userEmail(user) {
  return user?.email ?? user?.username ?? '';
}
