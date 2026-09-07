import cloudbase from '@cloudbase/js-sdk/app';
import { registerAuth } from '@cloudbase/js-sdk/auth';
import { registerMySQL } from '@cloudbase/js-sdk/mysql';

export const CLOUD_BASE_ENV = 'daynight-d2g3dj5fs4734fda7';
export const CLOUD_BASE_REGION = 'ap-shanghai';

registerAuth(cloudbase);
registerMySQL(cloudbase);

const app = cloudbase.init({
  env: CLOUD_BASE_ENV,
  region: CLOUD_BASE_REGION,
  persistence: 'local',
  auth: { detectSessionInUrl: true },
});

export const cloudbaseAuth = app.auth();
export const cloudbaseDb = app.rdb();

export function sessionUser(result) {
  return result?.data?.user ?? result?.data?.session?.user ?? null;
}

export function userEmail(user) {
  return user?.email ?? user?.username ?? '';
}

export function userId(user) {
  return typeof user?.uid === 'string' ? user.uid : typeof user?.openid === 'string' ? user.openid : '';
}
