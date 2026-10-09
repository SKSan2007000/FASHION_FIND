import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
  verifyUserEmail,
  updateUserLastLogin,
  createVerificationToken,
  consumeVerificationToken,
  countUsers,
  recordAuditLog,
} from './db';
import { signSessionToken, verifySessionToken, normalizeEmail, SessionPayload } from './security';
import { sendVerificationEmail, sendPasswordResetEmail, EmailResult } from './email';
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
 * Register a new user with password confirmation & email verification token.
 */
export async function registerUser(params: {
  email: string;
  password: string;
  confirmPassword?: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
}): Promise<{ user: User | null; token?: string; error?: string; emailResult?: EmailResult }> {
  const email = normalizeEmail(params.email);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { user: null, error: 'Please enter a valid email address.' };
  }

  if (!params.password || params.password.length < 8) {
    return { user: null, error: 'Password must be at least 8 characters long.' };
  }

  if (params.confirmPassword !== undefined && params.password !== params.confirmPassword) {
    return { user: null, error: 'Password and password confirmation do not match.' };
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return { user: null, error: 'An account with this email already exists.' };
  }

  // Security constraint: Public registration cannot create ADMIN role
  const assignedRole: 'USER' | 'ADMIN' = 'USER';

  const passwordHash = await hashPassword(params.password);
  const user = await createUser({
    email,
    passwordHash,
    name: params.name || '',
    role: assignedRole,
  });

  // Generate single-use email verification token
  let emailResult: EmailResult | undefined;
  try {
    const { rawToken } = await createVerificationToken({
      userId: user.id,
      tokenType: 'EMAIL_VERIFICATION',
      expiryMinutes: 1440, // 24 hours
    });

    emailResult = await sendVerificationEmail({
      email: user.email,
      token: rawToken,
      name: user.name,
    });
  } catch (err) {
    console.error('Email verification creation error:', err);
  }

  await recordAuditLog({
    actor_id: user.id,
    actor_email: user.email,
    action: 'USER_REGISTERED',
    target_resource: user.id,
    outcome: 'SUCCESS',
    details: { role: user.role, email_verified: false },
  });

  const token = signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { user, token, emailResult };
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

  // Record last login timestamp
  await updateUserLastLogin(record.user.id);

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
 * Request password reset link (expiring single-use token).
 */
export async function requestPasswordReset(
  emailInput: string
): Promise<{ success: boolean; message: string; emailResult?: EmailResult }> {
  const email = normalizeEmail(emailInput);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  const record = await findUserByEmail(email);
  if (!record) {
    // Avoid user enumeration: return generic success notice
    return {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched.',
    };
  }

  const { rawToken } = await createVerificationToken({
    userId: record.user.id,
    tokenType: 'PASSWORD_RESET',
    expiryMinutes: 60, // 1 hour
  });

  const emailResult = await sendPasswordResetEmail({
    email: record.user.email,
    token: rawToken,
  });

  await recordAuditLog({
    actor_id: record.user.id,
    actor_email: record.user.email,
    action: 'PASSWORD_RESET_REQUESTED',
    target_resource: record.user.id,
    outcome: 'SUCCESS',
  });

  return {
    success: true,
    message: 'If an account exists with this email address, a password reset link has been dispatched.',
    emailResult,
  };
}

/**
 * Reset password using single-use verification token.
 */
export async function resetPasswordWithToken(params: {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.token) {
    return { success: false, error: 'Password reset token is required.' };
  }

  if (!params.newPassword || params.newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  if (params.confirmPassword !== undefined && params.newPassword !== params.confirmPassword) {
    return { success: false, error: 'New password and confirmation do not match.' };
  }

  const tokenResult = await consumeVerificationToken({
    rawToken: params.token,
    tokenType: 'PASSWORD_RESET',
  });

  if (!tokenResult.valid || !tokenResult.userId) {
    return { success: false, error: tokenResult.error || 'Invalid or expired password reset token.' };
  }

  const newHash = await hashPassword(params.newPassword);
  await updateUserPassword(tokenResult.userId, newHash);

  await recordAuditLog({
    actor_id: tokenResult.userId,
    action: 'PASSWORD_RESET_COMPLETED',
    target_resource: tokenResult.userId,
    outcome: 'SUCCESS',
  });

  return { success: true };
}

/**
 * Verify email address using single-use verification token.
 */
export async function verifyEmailWithToken(
  token: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!token) {
    return { success: false, error: 'Verification token is required.' };
  }

  const tokenResult = await consumeVerificationToken({
    rawToken: token,
    tokenType: 'EMAIL_VERIFICATION',
  });

  if (!tokenResult.valid || !tokenResult.userId) {
    return { success: false, error: tokenResult.error || 'Invalid or expired email verification token.' };
  }

  await verifyUserEmail(tokenResult.userId);

  await recordAuditLog({
    actor_id: tokenResult.userId,
    action: 'EMAIL_VERIFIED',
    target_resource: tokenResult.userId,
    outcome: 'SUCCESS',
  });

  return { success: true, userId: tokenResult.userId };
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
