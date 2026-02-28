import {
  clearSessionTokens,
  getAccessToken,
  refreshSessionTokens,
} from '@/lib/auth/session';

function redirectToLoginOnClient(reason: 'sessionExpired' | 'authRequired' = 'sessionExpired') {
  if (typeof window === 'undefined') {
    return;
  }

  const isLoginPage = window.location.pathname === '/login';
  if (isLoginPage) {
    return;
  }

  const query = reason === 'authRequired' ? 'authRequired=1' : 'sessionExpired=1';
  window.location.replace(`/login?${query}`);
}

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout')
  );
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});

  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (typeof window === 'undefined' || response.status !== 401) {
    return response;
  }

  const url = typeof input === 'string' ? input : input.toString();
  if (isAuthEndpoint(url)) {
    return response;
  }

  const retryAttempted = headers.get('X-Auth-Retry') === '1';
  if (retryAttempted) {
    clearSessionTokens();
    redirectToLoginOnClient('sessionExpired');
    return response;
  }

  const refreshed = await refreshSessionTokens();
  if (!refreshed) {
    redirectToLoginOnClient('sessionExpired');
    return response;
  }

  const retryHeaders = new Headers(init.headers ?? {});
  const nextAccessToken = getAccessToken();
  if (nextAccessToken) {
    retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`);
  }
  retryHeaders.set('X-Auth-Retry', '1');

  return fetch(input, {
    ...init,
    headers: retryHeaders,
  });
}