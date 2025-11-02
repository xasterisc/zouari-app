import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.schema';

/**
 * Schema for user registration (Sign Up).
 * Validates password confirmation.
 */
export const authRegisterSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'], // Error will be associated with this field
  });

/**
 * Schema for user login (Sign In).
 * Note: We don't use the strong password schema here, just check for presence,
 * as we are checking an *existing* password, not creating a new one.
 */
export const authLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Schema for requesting a password reset.
 */
export const authForgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Schema for submitting a new password after a reset.
 */
export const authResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'New passwords do not match',
    path: ['newPasswordConfirm'],
  });

// --- Type Exports ---

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthForgotPasswordInput = z.infer<typeof authForgotPasswordSchema>;
export type AuthResetPasswordInput = z.infer<typeof authResetPasswordSchema>;
