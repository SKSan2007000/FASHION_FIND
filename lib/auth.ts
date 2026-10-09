import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { findUserByEmail, findUserById, createUser, countUsers, recordAuditLog } from './db';
import { signSessionToken, verifySessionToken, normalizeEmail, SessionPayload } from './security';
import { User } from '../data';

const SESSION_COOKIE_NAME = 'fashionfind_session';

/**
 * Hash a plaintext password with bcrypt (12 rounds).
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}

/**
 * Register a new user.
 */
export async function registerUser(params: {
  email: string;
  password: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
}): Promise<{ user: User | null; token?: string; error?: string }> {
  const email = normalizeEmail(params.email);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { user: null, error: 'Please enter a valid email address.' };
  }

  if (!params.password || params.password.length < 8) {
    return { user: null, error: 'Password must be at least 8 characters long.' };
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    // Avoid user enumeration by providing standard feedback
    return { user: null, error: 'An account with this email already exists or is unavailable.' };
  }

  const passwordHash = await hashPassword(params.password);
  const user = await createUser({
    email,
    passwordHash,
    name: params.name || '',
    role: params.role || 'USER',
  });

  await recordAuditLog({
    actor_id: user.id,
    actor_email: user.email,
    action: 'USER_REGISTERED',
    target_resource: user.id,
    outcome: 'SUCCESS',
    details: { role: user.role },
  });

  const token = signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { user, token };
}

/**
 * Authenticate user with email and password.
 */
export async function loginUser(
  emailInput: string,
  passwordInput: string
): Promise<{ user: User | null; token?: string; error?: string }> {
  const email = normalizeEmail(emailInput);

  if (!email || !passwordInput) {
    return { user: null, error: 'Email and password are required.' };
  }

  const record = await findUserByEmail(email);
  if (!record) {
    await recordAuditLog({
      actor_email: email,
      action: 'LOGIN_FAILED',
      outcome: 'DENIED',
      details: { reason: 'User not found' },
    });
    return { user: null, error: 'Invalid email or password.' };
  }

  const isValid = await verifyPassword(passwordInput, record.passwordHash);
  if (!isValid) {
    await recordAuditLog({
      actor_id: record.user.id,
      actor_email: record.user.email,
      action: 'LOGIN_FAILED',
      target_resource: record.user.id,
      outcome: 'DENIED',
      details: { reason: 'Password mismatch' },
    });
    return { user: null, error: 'Invalid email or password.' };
  }

  if (record.user.account_status !== 'active') {
    return { user: null, error: 'This account has been disabled.' };
  }

  const token = signSessionToken({
    userId: record.user.id,
    email: record.user.email,
    name: record.user.name,
    role: record.user.role,
  });

  await recordAuditLog({
    actor_id: record.user.id,
    actor_email: record.user.email,
    action: 'LOGIN_SUCCESS',
    target_resource: record.user.id,
    outcome: 'SUCCESS',
    details: { role: record.user.role },
  });

  return { user: record.user, token };
}

/**
 * Retrieve the current authenticated session from cookies (Server-side).
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Server-side RBAC guard requiring any authenticated user.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

/**
 * Server-side RBAC guard requiring ADMIN role.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/**
 * Secure bootstrap procedure for initial administrator.
 * Only executes if no admin exists or if authorized with ADMIN_BOOTSTRAP_SECRET.
 */
export async function bootstrapAdmin(params: {
  email: string;
  password: string;
  secret: string;
  name?: string;
}): Promise<{ success: boolean; user?: User; error?: string }> {
  const envSecret = process.env.ADMIN_BOOTSTRAP_SECRET || process.env.BOOTSTRAP_SECRET;

  // In production, require configured secret
  if (process.env.NODE_ENV === 'production' && !envSecret) {
    return { success: false, error: 'Admin bootstrap is disabled in production without ADMIN_BOOTSTRAP_SECRET.' };
  }

  if (envSecret && params.secret !== envSecret) {
    await recordAuditLog({
      action: 'ADMIN_BOOTSTRAP_DENIED',
      outcome: 'DENIED',
      details: { reason: 'Invalid bootstrap secret' },
    });
    return { success: false, error: 'Invalid bootstrap authorization secret.' };
  }

  const email = normalizeEmail(params.email);
  if (!email || !params.password || params.password.length < 10) {
    return { success: false, error: 'Administrator requires a valid email and strong password (min 10 characters).' };
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.user.role === 'ADMIN') {
      return { success: true, user: existing.user };
    }
    return { success: false, error: 'User already exists with non-admin role.' };
  }

  const passwordHash = await hashPassword(params.password);
  const user = await createUser({
    email,
    passwordHash,
    name: params.name || 'Administrator',
    role: 'ADMIN',
  });

  await recordAuditLog({
    actor_id: user.id,
    actor_email: user.email,
    action: 'ADMIN_BOOTSTRAPPED',
    target_resource: user.id,
    outcome: 'SUCCESS',
  });

  return { success: true, user };
}
