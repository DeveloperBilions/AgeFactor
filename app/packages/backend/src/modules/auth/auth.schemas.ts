import { z } from 'zod';

const indianPhoneRegex = /^\+91\d{10}$/;

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .regex(indianPhoneRegex, 'Phone must be a valid Indian number starting with +91 followed by 10 digits'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .regex(indianPhoneRegex, 'Phone must be a valid Indian number starting with +91 followed by 10 digits'),
    otp: z
      .string()
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    heightCm: z.number().min(50).max(250).optional(),
    weightKg: z.number().min(10).max(300).optional(),
    language: z.enum(['en', 'hi']).optional(),
  }),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
