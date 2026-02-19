import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { TokenPayload, verifyAccessToken } from '@/lib/auth/jwt';

type AuthSuccess = {
  ok: true;
  payload: TokenPayload;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

export function requireAuth(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  try {
    const payload = verifyAccessToken(token);
    return { ok: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Token expired', code: 'TOKEN_EXPIRED' },
          { status: 401 }
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid token', code: 'TOKEN_INVALID' },
        { status: 401 }
      ),
    };
  }
}