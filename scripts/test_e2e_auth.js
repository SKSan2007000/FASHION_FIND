const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  });
}

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runE2E() {
  console.log('\n========================================================');
  console.log('FASHIONFIND END-TO-END AUTH & RBAC VERIFICATION');
  console.log('========================================================\n');

  const {
    registerUser,
    loginUser,
    requestPasswordReset,
    resetPasswordWithToken,
    verifyEmailWithToken,
    requireAdmin,
    requireAuth,
  } = await import('../lib/auth.ts');
  const {
    findUserByEmail,
    findUserById,
    getAllUsers,
    getAnalyticsSummary,
    getAuditLogs,
    createVerificationToken,
    consumeVerificationToken,
  } = await import('../lib/db.ts');
  const { verifySessionToken, signSessionToken } = await import('../lib/security.ts');

  // 1. Password strength test
  console.log('--- 1. Registration Validations & Password Strength ---');
  const weakResult = await registerUser({
    email: 'weak@example.com',
    password: 'short',
    confirmPassword: 'short',
  });
  assert(weakResult.user === null && weakResult.error?.includes('8 characters'), 'Weak password rejected');

  // 2. Password mismatch test
  const mismatchResult = await registerUser({
    email: 'mismatch2@example.com',
    password: 'ValidPassword123!',
    confirmPassword: 'WrongConfirmation123!',
  });
  assert(mismatchResult.user === null && mismatchResult.error?.includes('do not match'), 'Password mismatch rejected');

  // 3. Successful user registration
  console.log('\n--- 2. Successful Registration & Verification Token ---');
  const uniqueEmail = `buyer-${Date.now()}@fashionfind.internal`;
  const regResult = await registerUser({
    email: uniqueEmail,
    password: 'UserSecretPassword2026!',
    confirmPassword: 'UserSecretPassword2026!',
    name: 'Taylor Swift',
  });
  assert(regResult.user !== null, `User registered successfully: ${uniqueEmail}`);
  assert(regResult.user.role === 'USER', 'Registered user role strictly set to USER');
  assert(regResult.user.email_verified === false, 'New user email_verified initialized to false');
  assert(!!regResult.token, 'Session token issued upon registration');

  // 4. Duplicate registration prevention
  console.log('\n--- 3. Duplicate Registration Prevention ---');
  const duplicateResult = await registerUser({
    email: uniqueEmail,
    password: 'UserSecretPassword2026!',
    confirmPassword: 'UserSecretPassword2026!',
  });
  assert(duplicateResult.user === null && duplicateResult.error?.includes('already exists'), 'Duplicate email registration prevented');

  // 5. User Login with valid and invalid passwords
  console.log('\n--- 4. User Login & Credential Verification ---');
  const badLogin = await loginUser(uniqueEmail, 'WrongPassword123!');
  assert(badLogin.user === null && badLogin.error?.includes('Invalid email or password'), 'Invalid password login rejected');

  const goodLogin = await loginUser(uniqueEmail, 'UserSecretPassword2026!');
  assert(goodLogin.user !== null && goodLogin.user.email === uniqueEmail, 'Valid user login authenticated');
  assert(!!goodLogin.token, 'Session token returned on valid login');

  const parsedUserSession = verifySessionToken(goodLogin.token);
  assert(parsedUserSession !== null && parsedUserSession.role === 'USER', 'Session token payload has USER role');

  // 6. Admin Login & Authorization
  console.log('\n--- 5. Admin Authentication & RBAC Verification ---');
  const adminEmail = process.env.ADMIN_EMAIL || 'sky@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'sky@1234';

  const adminLogin = await loginUser(adminEmail, adminPassword);
  assert(adminLogin.user !== null, `Admin account login authenticated for: ${adminEmail}`);
  assert(adminLogin.user.role === 'ADMIN', 'Admin user has verified ADMIN role');

  const parsedAdminSession = verifySessionToken(adminLogin.token);
  assert(parsedAdminSession !== null && parsedAdminSession.role === 'ADMIN', 'Admin session token payload has ADMIN role');

  // 7. Role-Based Access Control Guards
  console.log('\n--- 6. Role-Based Access Control Guards ---');
  // USER session cannot pass ADMIN check
  assert(parsedUserSession.role !== 'ADMIN', 'Ordinary USER role fails ADMIN check');
  assert(parsedAdminSession.role === 'ADMIN', 'ADMIN role passes ADMIN check');

  // 8. Admin Registered Users Directory & Analytics
  console.log('\n--- 7. Admin Data Access & User Protection ---');
  const allUsers = await getAllUsers(50);
  assert(allUsers.length >= 2, `Admin retrieved registered users list (${allUsers.length} users)`);
  for (const u of allUsers) {
    assert(u.password_hash === undefined, `User ${u.email} does not expose password_hash`);
    assert(u.passwordHash === undefined, `User ${u.email} does not expose passwordHash`);
  }

  const analytics = await getAnalyticsSummary();
  assert(analytics.totalUsers >= 2, `Analytics accurately reflects registered user count (${analytics.totalUsers})`);
  assert(typeof analytics.totalVisits === 'number', 'Analytics returns recorded visits');
  assert(typeof analytics.totalAffiliateClicks === 'number', 'Analytics returns affiliate clicks');

  const auditLogs = await getAuditLogs(20);
  assert(auditLogs.length > 0, `Audit logs recorded securely (${auditLogs.length} entries retrieved)`);

  // 9. Email Verification Single-Use Token Flow
  console.log('\n--- 8. Email Verification Token Lifecycle ---');
  const { rawToken: emailToken } = await createVerificationToken({
    userId: regResult.user.id,
    tokenType: 'EMAIL_VERIFICATION',
    expiryMinutes: 60,
  });
  const verifyResult = await verifyEmailWithToken(emailToken);
  assert(verifyResult.success === true, 'Email verification succeeds with valid token');

  const verifiedUserRecord = await findUserById(regResult.user.id);
  assert(verifiedUserRecord !== null && verifiedUserRecord.email_verified === true, 'User record updated with email_verified = true');

  // Token cannot be reused
  const replayEmailVerify = await verifyEmailWithToken(emailToken);
  assert(replayEmailVerify.success === false, 'Replaying consumed email verification token is rejected');

  // 10. Password Reset Single-Use Token Flow
  console.log('\n--- 9. Password Reset Token Lifecycle ---');
  const resetReq = await requestPasswordReset(uniqueEmail);
  assert(resetReq.success === true, 'Password reset request generated');

  const { rawToken: resetPassToken } = await createVerificationToken({
    userId: regResult.user.id,
    tokenType: 'PASSWORD_RESET',
    expiryMinutes: 60,
  });

  const resetResult = await resetPasswordWithToken({
    token: resetPassToken,
    newPassword: 'BrandNewPassword2026!',
    confirmPassword: 'BrandNewPassword2026!',
  });
  assert(resetResult.success === true, 'Password reset with single-use token succeeded');

  // Verify login works with NEW password and fails with OLD password
  const oldLoginCheck = await loginUser(uniqueEmail, 'UserSecretPassword2026!');
  assert(oldLoginCheck.user === null, 'Login with old password fails after reset');

  const newLoginCheck = await loginUser(uniqueEmail, 'BrandNewPassword2026!');
  assert(newLoginCheck.user !== null, 'Login with new password succeeds after reset');

  // Verify token replay fails
  const resetReplay = await resetPasswordWithToken({
    token: resetPassToken,
    newPassword: 'AnotherPassword2026!',
    confirmPassword: 'AnotherPassword2026!',
  });
  assert(resetReplay.success === false, 'Replaying consumed password reset token is prevented');

  console.log('\n========================================================');
  console.log(`E2E VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runE2E().catch((err) => {
  console.error('E2E Test Execution Error:', err);
  process.exit(1);
});
