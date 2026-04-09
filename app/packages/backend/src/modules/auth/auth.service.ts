import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '../../config/database';
import redis from '../../config/redis';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { UpdateProfileInput } from './auth.schemas';

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;
const MAX_OTP_REQUESTS_PER_HOUR = 5;
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
const JWT_EXPIRY = env.JWT_EXPIRY || '7d';

async function sendSms(phone: string, otp: string): Promise<void> {
  // Placeholder for SMS provider integration
  // This would call MSG91 or Twilio API in production
  console.log(`[SMS] Sending OTP ${otp} to ${phone}`);
}

async function getRateLimitKey(phone: string): Promise<string> {
  return `otp_request:${phone}:${new Date().toISOString().slice(0, 13)}`;
}

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string; expiresIn: number }> {
  const rateKey = await getRateLimitKey(phone);
  const requestCount = await redis.incr(rateKey);

  if (requestCount === 1) {
    await redis.expire(rateKey, 3600); // 1 hour
  }

  if (requestCount > MAX_OTP_REQUESTS_PER_HOUR) {
    throw new AppError('Too many OTP requests. Please try again in 1 hour.', 429);
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Hash OTP with bcrypt
  const otpHash = await bcrypt.hash(otp, 10);

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  // Store OTP in database
  await query(
    `INSERT INTO otp_requests (phone, otp_hash, expires_at, attempts, verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [phone, otpHash, expiresAt, 0, false]
  );

  // TODO: Integrate SMS provider (MSG91/Twilio) for production
  // For now, log OTP and accept any phone number
  console.log(`[OTP] ${phone}: ${otp}`);

  return {
    success: true,
    message: 'OTP sent successfully',
    expiresIn: OTP_EXPIRY_SECONDS,
  };
}

export async function verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
  // Find latest non-expired OTP for this phone
  const otpResult = await query<{
    id: string;
    otp_hash: string;
    attempts: number;
    verified: boolean;
    expires_at: string;
  }>(
    `SELECT id, otp_hash, attempts, verified, expires_at
     FROM otp_requests
     WHERE phone = $1 AND verified = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (otpResult.rows.length === 0 || new Date(otpResult.rows[0].expires_at) < new Date()) {
    throw new AppError('OTP expired or not found', 400);
  }

  const otpRecord = otpResult.rows[0];

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError('Maximum OTP verification attempts exceeded', 400);
  }

  // Increment attempts
  await query('UPDATE otp_requests SET attempts = attempts + 1 WHERE id = $1', [otpRecord.id]);

  // Compare OTP with hash
  const isValidOtp = await bcrypt.compare(otp, otpRecord.otp_hash);

  if (!isValidOtp) {
    const remainingAttempts = MAX_OTP_ATTEMPTS - otpRecord.attempts - 1;
    throw new AppError(
      `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      400
    );
  }

  // Mark OTP as verified
  await query('UPDATE otp_requests SET verified = true WHERE id = $1', [otpRecord.id]);

  // Find or create user
  const userResult = await query<{ id: string; created_at: string }>(
    `INSERT INTO users (phone, language, created_at, updated_at)
     VALUES ($1, 'en', NOW(), NOW())
     ON CONFLICT (phone) DO NOTHING
     RETURNING id, created_at`,
    [phone]
  );

  let userId: string;
  let isNewUser = false;

  if (userResult.rows.length > 0) {
    userId = userResult.rows[0].id;
    isNewUser = true;
  } else {
    // User already exists, fetch the ID
    const existingUser = await query<{ id: string }>(
      'SELECT id FROM users WHERE phone = $1 AND deleted_at IS NULL',
      [phone]
    );
    if (existingUser.rows.length === 0) {
      throw new AppError('User not found', 500);
    }
    userId = existingUser.rows[0].id;
    isNewUser = false;
  }

  // Generate JWT access token
  const signOptions: SignOptions = { expiresIn: JWT_EXPIRY as any };
  const accessToken: string = jwt.sign(
    {
      userId,
      phone,
    } as object,
    env.JWT_SECRET,
    signOptions
  );

  // Generate refresh token
  const refreshToken = crypto.randomBytes(64).toString('hex');

  // Calculate refresh token expiry
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  // Store refresh token in sessions table
  await query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [userId, refreshToken, refreshTokenExpiresAt]
  );

  // Fetch user details
  const userDetailsResult = await query<{
    id: string;
    phone: string;
    name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    height_cm: string | null;
    weight_kg: string | null;
    language: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, phone, name, date_of_birth, gender, height_cm, weight_kg, language, created_at, updated_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  if (userDetailsResult.rows.length === 0) {
    throw new AppError('User not found', 500);
  }

  const userDetails = userDetailsResult.rows[0];

  const user: AuthUser = {
    id: userDetails.id,
    phone: userDetails.phone,
    name: userDetails.name,
    dateOfBirth: userDetails.date_of_birth,
    gender: userDetails.gender,
    heightCm: userDetails.height_cm ? parseFloat(userDetails.height_cm) : null,
    weightKg: userDetails.weight_kg ? parseFloat(userDetails.weight_kg) : null,
    language: userDetails.language,
    createdAt: userDetails.created_at,
    updatedAt: userDetails.updated_at,
  };

  return {
    accessToken,
    refreshToken,
    user,
    isNewUser,
  };
}

export async function refreshAccessToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  // Find session by refresh token
  const sessionResult = await query<{ user_id: string; expires_at: string; id: string }>(
    `SELECT id, user_id, expires_at
     FROM sessions
     WHERE refresh_token = $1 AND expires_at > NOW()`,
    [token]
  );

  if (sessionResult.rows.length === 0) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const session = sessionResult.rows[0];

  // Fetch user details for JWT
  const userResult = await query<{ phone: string }>(
    'SELECT phone FROM users WHERE id = $1 AND deleted_at IS NULL',
    [session.user_id]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const userPhone = userResult.rows[0].phone;

  // Delete old session
  await query('DELETE FROM sessions WHERE id = $1', [session.id]);

  // Generate new JWT access token
  const signOptions: SignOptions = { expiresIn: JWT_EXPIRY as any };
  const accessToken: string = jwt.sign(
    {
      userId: session.user_id,
      phone: userPhone,
    } as object,
    env.JWT_SECRET,
    signOptions
  );

  // Generate new refresh token
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  const newRefreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  // Store new session
  await query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [session.user_id, newRefreshToken, newRefreshTokenExpiresAt]
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
  if (refreshToken) {
    // Delete specific session
    await query('DELETE FROM sessions WHERE user_id = $1 AND refresh_token = $2', [userId, refreshToken]);
  } else {
    // Delete all sessions for user
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  return { success: true };
}

export async function getMe(userId: string): Promise<AuthUser> {
  const userResult = await query<{
    id: string;
    phone: string;
    name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    height_cm: string | null;
    weight_kg: string | null;
    language: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, phone, name, date_of_birth, gender, height_cm, weight_kg, language, created_at, updated_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const userDetails = userResult.rows[0];

  return {
    id: userDetails.id,
    phone: userDetails.phone,
    name: userDetails.name,
    dateOfBirth: userDetails.date_of_birth,
    gender: userDetails.gender,
    heightCm: userDetails.height_cm ? parseFloat(userDetails.height_cm) : null,
    weightKg: userDetails.weight_kg ? parseFloat(userDetails.weight_kg) : null,
    language: userDetails.language,
    createdAt: userDetails.created_at,
    updatedAt: userDetails.updated_at,
  };
}

export async function updateProfile(userId: string, data: UpdateProfileInput): Promise<AuthUser> {
  const updates: string[] = [];
  const values: any[] = [userId];
  let paramIndex = 2;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(data.name);
    paramIndex++;
  }

  if (data.dateOfBirth !== undefined) {
    updates.push(`date_of_birth = $${paramIndex}`);
    values.push(data.dateOfBirth);
    paramIndex++;
  }

  if (data.gender !== undefined) {
    updates.push(`gender = $${paramIndex}`);
    values.push(data.gender);
    paramIndex++;
  }

  if (data.heightCm !== undefined) {
    updates.push(`height_cm = $${paramIndex}`);
    values.push(data.heightCm);
    paramIndex++;
  }

  if (data.weightKg !== undefined) {
    updates.push(`weight_kg = $${paramIndex}`);
    values.push(data.weightKg);
    paramIndex++;
  }

  if (data.language !== undefined) {
    updates.push(`language = $${paramIndex}`);
    values.push(data.language);
    paramIndex++;
  }

  if (updates.length === 0) {
    return getMe(userId);
  }

  const updateQuery = `
    UPDATE users
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING id, phone, name, date_of_birth, gender, height_cm, weight_kg, language, created_at, updated_at
  `;

  const userResult = await query<{
    id: string;
    phone: string;
    name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    height_cm: string | null;
    weight_kg: string | null;
    language: string;
    created_at: string;
    updated_at: string;
  }>(updateQuery, values);

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const userDetails = userResult.rows[0];

  return {
    id: userDetails.id,
    phone: userDetails.phone,
    name: userDetails.name,
    dateOfBirth: userDetails.date_of_birth,
    gender: userDetails.gender,
    heightCm: userDetails.height_cm ? parseFloat(userDetails.height_cm) : null,
    weightKg: userDetails.weight_kg ? parseFloat(userDetails.weight_kg) : null,
    language: userDetails.language,
    createdAt: userDetails.created_at,
    updatedAt: userDetails.updated_at,
  };
}
