import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { generateTOTPSecret, verifyTOTP } from '@/lib/auth/totp';

// Generate TOTP secret and QR code
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate TOTP secret
    const { secret, qrCode } = await generateTOTPSecret(user.email);

    // Store secret (but don't enable yet)
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret },
    });

    return NextResponse.json({
      secret,
      qrCode,
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Enable TOTP after verification
export async function PATCH(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { totpToken } = body;

    if (!totpToken) {
      return NextResponse.json(
        { error: 'TOTP token required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.totpSecret) {
      return NextResponse.json(
        { error: 'TOTP not configured' },
        { status: 400 }
      );
    }

    // Verify token
    const isValid = verifyTOTP(totpToken, user.totpSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid TOTP token' },
        { status: 401 }
      );
    }

    // Enable TOTP
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TOTP enable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
