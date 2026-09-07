export function userId(user) {
  if (typeof user?.uid === 'string') return user.uid;
  if (typeof user?.id === 'string') return user.id;
  if (typeof user?.sub === 'string') return user.sub;
  return typeof user?.openid === 'string' ? user.openid : '';
}
