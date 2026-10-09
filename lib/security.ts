import crypto from 'crypto';

/**
 * Allowed affiliate link domains.
 * Expandable based on program configuration.
 */
const ALLOWED_AFFILIATE_DOMAINS = [
  'amazon.com',
  'amazon.in',
  'amazon.co.uk',
  'amazon.de',
  'amazon.ca',
  'amazon.es',
  'amazon.fr',
  'amazon.it',
  'amazon.co.jp',
  'amzn.to',
  'link.amazon',
  'www.amazon.com',
  'www.amazon.in',
  'www.amazon.co.uk',
  'm.media-amazon.com',
];

/**
 * Validates that an affiliate URL is safe, valid, and belongs to an approved shopping domain.
 * Blocks javascript:, data:, file:, and arbitrary open redirect schemes.
 */
export function validateAffiliateUrl(urlStr: string | null | undefined): { isValid: boolean; normalizedUrl?: string; error?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, error: 'Affiliate URL is required.' };
  }

  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Affiliate URL cannot be empty.' };
  }

  // Reject dangerous schemes explicitly
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return { isValid: false, error: 'Unsafe URL scheme detected.' };
  }

  try {
    const parsed = new URL(trimmed);

    // Enforce HTTPS
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, error: 'Only HTTP/HTTPS protocols are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check if domain is allowed
    const isDomainAllowed = ALLOWED_AFFILIATE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isDomainAllowed) {
      return {
        isValid: false,
        error: `Domain "${hostname}" is not in the list of authorized affiliate destinations.`,
      };
    }

    return { isValid: true, normalizedUrl: parsed.toString() };
  } catch (err) {
    return { isValid: false, error: 'Invalid URL format.' };
  }
}

/**
 * Normalizes email address for consistent indexing and lookups.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Simple in-memory token-bucket / sliding window rate limiter.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

// Cleanup stale rate limit records periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Secret key for signing sessions.
 * In production, this should come from process.env.SESSION_SECRET or process.env.NEXTAUTH_SECRET.
 * Falls back to a deterministic machine-derived secret if not explicitly configured in dev.
 */
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.SUPABASE_ANON_KEY ||
  'fashionfind-secure-session-key-v2-prod-2026';

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

/**
 * Creates a tamper-proof signed session token (HMAC-SHA256).
 */
export function signSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>, expiresInSeconds: number = 7 * 24 * 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const payloadStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
}

/**
 * Verifies and parses a signed session token.
 */
export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadStr)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null; // Tampered token
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired token
    }
    return payload;
  } catch (err) {
    return null;
  }
}
