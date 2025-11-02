import { z } from 'zod';

/**
 * Reusable schema for CUID2 IDs.
 */
export const idSchema = z.cuid2({ message: 'Invalid ID' });

/**
 * Base email validation: trims, lowercases, and checks format.
 */
export const emailSchema = z
  .email('Invalid email address')
  .trim()
  .toLowerCase();

/**
 * Base password validation for *new* passwords.
 * Enforces strong password requirements.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^a-zA-Z0-9]/,
    'Password must contain at least one special character',
  );

/**
 * User role enum.
 */
export const userRoleSchema = z.enum(['USER', 'ADMIN']).default('USER');
