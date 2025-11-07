import { z } from 'zod';
import { emailSchema, idSchema, passwordSchema, userRoleSchema } from './common.schema.js';

// =================================================================
// --- User Management Schemas (Input for API Endpoints) ---
// =================================================================

/**
 * Schema for an authenticated user updating their *own* profile.
 * All fields are optional.
 */
export const userUpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  bio: z.string().max(160, 'Bio must be 160 characters or less').trim().optional(),
});

/**
 * Schema for an authenticated user changing their *own* password.
 */
export const userChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'New passwords do not match',
    path: ['newPasswordConfirm'],
  });

// =================================================================
// --- Response Schemas (Output from API) ---
// =================================================================

/**
 * Schema for a user object sent from the API to the client.
 *
 * --- SECURITY ---
 * This is CRITICAL for security. It *omits* the password hash
 * and any other sensitive fields, preventing them from ever
 * being accidentally leaked to the client.
 */
export const userResponseSchema = z.object({
  id: idSchema,
  name: z.string().nullable(),
  email: emailSchema,
  role: userRoleSchema,
  createdAt: z.coerce.date({ message: 'Invalid creation timestamp' }),
  updatedAt: z.coerce.date({ message: 'Invalid update timestamp' }),
});

/**
 * Schema for an array of user objects (e.g., for an admin dashboard).
 */
export const userListResponseSchema = z.array(userResponseSchema);

// =================================================================
// --- Type Exports ---
// =================================================================

export type UserUpdateProfileInput = z.infer<typeof userUpdateProfileSchema>;
export type UserChangePasswordInput = z.infer<typeof userChangePasswordSchema>;

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;
