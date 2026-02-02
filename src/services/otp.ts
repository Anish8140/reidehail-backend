/**
 * OTP service – in-memory for dev; replace with Redis/SMS (Twilio, etc.) in production.
 */

const otpStore = new Map<
  string,
  { code: string; expiresAt: number; purpose: 'login' | 'signup' }
>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

function generateCode(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

export function createOtp(phone: string, purpose: 'login' | 'signup' = 'signup'): string {
  const key = normalizePhone(phone);
  const code = process.env.OTP_MOCK_CODE || generateCode();
  otpStore.set(key, {
    code: process.env.OTP_MOCK_CODE || code,
    expiresAt: Date.now() + OTP_TTL_MS,
    purpose,
  });
  // In production: send code via SMS (Twilio, etc.)
  if (process.env.NODE_ENV !== 'production' && !process.env.OTP_MOCK_CODE) {
    console.log(`[OTP] ${key} -> ${code} (expires in ${OTP_TTL_MS / 60000} min)`);
  }
  return process.env.OTP_MOCK_CODE || code;
}

export function verifyOtp(phone: string, code: string): boolean {
  const key = normalizePhone(phone);
  const entry = otpStore.get(key);
  if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
    return false;
  }
  otpStore.delete(key);
  return true;
}

export function getOtpPurpose(phone: string): 'login' | 'signup' | null {
  const entry = otpStore.get(normalizePhone(phone));
  return entry ? entry.purpose : null;
}
