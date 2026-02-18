import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TOTPSecret {
  secret: string;
  qrCode: string;
}

export async function generateTOTPSecret(email: string): Promise<TOTPSecret> {
  const secret = speakeasy.generateSecret({
    name: `iljar (${email})`,
    issuer: 'iljar',
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    qrCode,
  };
}

export function verifyTOTP(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before/after for clock drift
  });
}
