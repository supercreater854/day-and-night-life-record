import test from 'node:test';
import assert from 'node:assert/strict';
import { userId } from '../src/cloudbaseUser.js';

test('CloudBase session user id supports uid, id, and sub in priority order', () => {
  assert.equal(userId({ uid: 'uid-user' }), 'uid-user');
  assert.equal(userId({ id: 'id-user' }), 'id-user');
  assert.equal(userId({ sub: 'sub-user' }), 'sub-user');
  assert.equal(
    userId({ uid: 'uid-user', id: 'id-user', sub: 'sub-user', openid: 'openid-user' }),
    'uid-user',
  );
});

test('CloudBase session user id keeps openid compatibility', () => {
  assert.equal(userId({ openid: 'openid-user' }), 'openid-user');
  assert.equal(userId(null), '');
});
