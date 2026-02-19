import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const refreshToken = body?.refreshToken;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json(
        { error: 'refreshToken is required', code: 'REFRESH_REQUIRED' },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid refresh token', code: 'REFRESH_INVALID' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'REFRESH_USER_NOT_FOUND' },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const nextAccessToken = generateAccessToken(tokenPayload);
    const nextRefreshToken = generateRefreshToken(tokenPayload);

    return NextResponse.json({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}