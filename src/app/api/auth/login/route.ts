import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { verifyTOTP } from '@/lib/auth/totp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, totpToken } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check 2FA if enabled
    if (user.totpEnabled) {
      if (!totpToken) {
        return NextResponse.json(
          { error: '2FA token required', requires2FA: true },
          { status: 401 }
        );
      }

      if (!user.totpSecret) {
        return NextResponse.json(
          { error: 'TOTP not properly configured' },
          { status: 500 }
        );
      }

      const isValidTOTP = verifyTOTP(totpToken, user.totpSecret);
      if (!isValidTOTP) {
        return NextResponse.json(
          { error: 'Invalid 2FA token' },
          { status: 401 }
        );
      }
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        totpEnabled: user.totpEnabled,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
