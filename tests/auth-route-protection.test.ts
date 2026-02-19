import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { generateAccessToken } from '@/lib/auth/jwt';
import { requireAuth } from '@/lib/auth/guard';
import { GET as getClients } from '@/app/api/clients/route';
import { POST as refreshPost } from '@/app/api/auth/refresh/route';
import { POST as loginPost } from '@/app/api/auth/login/route';

function requestFor(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(url, options);
}

test('requireAuth rejects when Authorization header is missing', async () => {
  const request = requestFor('http://localhost/api/clients');
  const auth = requireAuth(request);

  assert.equal(auth.ok, false);
  if (auth.ok) {
    assert.fail('Expected auth failure');
  }

  assert.equal(auth.response.status, 401);
  const body = await auth.response.json();
  assert.equal(body.code, 'AUTH_REQUIRED');
});

test('requireAuth accepts valid bearer token', () => {
  const token = generateAccessToken({
    userId: 'user-1',
    email: 'clinician@iljar.is',
  });

  const request = requestFor('http://localhost/api/clients', {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const auth = requireAuth(request);
  assert.equal(auth.ok, true);

  if (!auth.ok) {
    assert.fail('Expected auth success');
  }

  assert.equal(auth.payload.userId, 'user-1');
  assert.equal(auth.payload.email, 'clinician@iljar.is');
});

test('protected clients route returns 401 without token', async () => {
  const request = requestFor('http://localhost/api/clients');
  const response = await getClients(request);

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, 'AUTH_REQUIRED');
});

test('refresh endpoint returns REFRESH_REQUIRED when token is missing', async () => {
  const request = requestFor('http://localhost/api/auth/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const response = await refreshPost(request);
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.code, 'REFRESH_REQUIRED');
});

test('refresh endpoint returns REFRESH_INVALID for malformed refresh token', async () => {
  const request = requestFor('http://localhost/api/auth/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: 'not-a-valid-jwt' }),
  });

  const response = await refreshPost(request);
  assert.equal(response.status, 401);

  const body = await response.json();
  assert.equal(body.code, 'REFRESH_INVALID');
});

test('public login route is not guarded by auth middleware', async () => {
  const request = requestFor('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const response = await loginPost(request);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, 'Email and password are required');
});
