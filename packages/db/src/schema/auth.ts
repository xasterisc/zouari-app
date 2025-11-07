import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';
import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * --------------------------------------------------------------------------
 * ENUMS
 * --------------------------------------------------------------------------
 */

/**
 * Defines the possible roles a user can have within the system.
 * This is the foundation for Role-Based Access Control (RBAC).
 */
export const roleEnum = pgEnum('role', ['admin', 'user']);

/**
 * Defines the types of one-time verification tokens we can issue.
 * - 'email_verification': Ensure a user's email is valid.
 * - 'password_reset': Allow a user to reset a forgotten password.
 * - 'magic_link': Passwordless sign-in.
 */
export const verificationTokenTypeEnum = pgEnum('verification_token_type', [
  'email_verification',
  'password_reset',
  'magic_link',
]);

/**
 * --------------------------------------------------------------------------
 * USERS TABLE
 * --------------------------------------------------------------------------
 * Holds the core user identity.
 * This table stores information about the user, but not their credentials.
 */
export const users = pgTable(
  'users',
  {
    /**
     * Unique user identifier (CUID2).
     * Secure, collision-resistant, and URL-safe.
     */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),

    /**
     * The user's primary email address.
     * Marked as unique, as it will be used for login/identification.
     */
    email: text('email').notNull().unique(),

    /**
     * Timestamp of when the user's email was verified.
     * Null if not yet verified. More informative than a boolean.
     */
    emailVerified: timestamp('email_verified', { withTimezone: true }),

    /**
     * User's display name. Can be null.
     */
    name: text('name'),

    /**
     * URL to the user's avatar/profile picture. Can be null.
     */
    avatarUrl: text('avatar_url'),

    /**
     * The user's role, pulled from the 'roleEnum'.
     * Defaults to 'user'. Critical for RBAC.
     */
    role: roleEnum('role').default('user').notNull(),

    /**
     * Enterprise-grade: Foreign key for multi-tenancy.
     * Can be null if users are not part of an organization.
     */
    organizationId: text('organization_id'),

    /**
     * Enterprise-grade: A flexible JSONB column for storing arbitrary
     * user-related metadata (e.g., preferences, flags).
     */
    metadata: jsonb('metadata'),

    /**
     * Timestamp when the user was created.
     */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    /**
     * Timestamp when the user was last updated.
     * Automatically updates on any change.
     */
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  // Add a unique index on email (which is good practice)
  (table) => [uniqueIndex('users_email_idx').on(table.email)]
);

/**
 * Drizzle relations for the 'users' table.
 * Enables powerful, type-safe relational queries.
 */
export const usersRelations = relations(users, ({ many, one }) => ({
  // A user can have many sessions.
  sessions: many(authSessions),
  // A user can have at most one password.
  password: one(authPasswords),
  // A user can have many passkeys (e.g., phone, laptop, YubiKey).
  passkeys: many(authPasskeys),
  // A user can have many OAuth accounts (e.g., Google, GitHub).
  oauthAccounts: many(authOAuthAccounts),
}));

/**
 * --------------------------------------------------------------------------
 * AUTH SESSIONS TABLE
 * --------------------------------------------------------------------------
 * Stores active user sessions (e.g., 'who is logged in').
 */
export const authSessions = pgTable(
  'auth_sessions',
  {
    /**
     * Session ID (secure random string). Primary key.
     * This ID is the value stored in the user's session cookie.
     */
    id: text('id').primaryKey(),

    /**
     * Foreign key linking to the 'users' table.
     */
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /**
     * Timestamp when the session expires.
     */
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    /**
     * Security: IP address of the client.
     */
    ipAddress: text('ip_address'),

    /**
     * Security: User agent of the client.
     */
    userAgent: text('user_agent'),

    /**
     * Auditing: Timestamps for session creation and updates.
     */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)]
);

/**
 * Drizzle relations for the 'authSessions' table.
 */
export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  // Each session belongs to exactly one user.
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

/**
 * --------------------------------------------------------------------------
 * AUTH PASSWORDS TABLE (Traditional Auth)
 * --------------------------------------------------------------------------
 * Stores traditional password credentials.
 */
export const authPasswords = pgTable('auth_passwords', {
  /**
   * User ID. This is both the Primary Key and a Foreign Key to the 'users' table.
   * This enforces a one-to-one relationship: one user, one password.
   */
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  /**
   * The hashed password, created using a secure algorithm (e.g., Argon2).
   */
  hashedPassword: text('hashed_password').notNull(),
});

/**
 * Drizzle relations for the 'authPasswords' table.
 */
export const authPasswordsRelations = relations(authPasswords, ({ one }) => ({
  // Each password entry belongs to exactly one user.
  user: one(users, {
    fields: [authPasswords.userId],
    references: [users.id],
  }),
}));

/**
 * --------------------------------------------------------------------------
 * AUTH PASSKEYS TABLE (WebAuthn)
 * --------------------------------------------------------------------------
 * Stores passkey credentials (e.g., Face ID, YubiKeys).
 * This is the core of modern, passwordless authentication.
 */
export const authPasskeys = pgTable('auth_passkeys', {
  /**
   * Unique identifier for this passkey credential (CUID2).
   */
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),

  /**
   * Foreign key linking to the 'users' table.
   */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /**
   * The globally unique ID for this credential, provided by the authenticator.
   * Stored in a URL-safe base64 format.
   */
  credentialId: text('credential_id').notNull().unique(),

  /**
   * The public key of the credential, in a storable format (e.g., base64).
   */
  publicKey: text('public_key').notNull(),

  /**
   * The signature counter, used to prevent replay attacks.
   */
  counter: bigint('counter', { mode: 'number' }).notNull(),

  /**
   * User-friendly name for the passkey (e.g., 'My iPhone', 'Work Laptop').
   */
  name: text('name'),

  /**
   * The transports available for this credential (e.g., 'internal', 'usb', 'ble').
   * Storing as a single text field, can be comma-separated.
   */
  transports: text('transports'),

  /**
   * Timestamps for when this passkey was created and last used.
   */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});

/**
 * Drizzle relations for the 'authPasskeys' table.
 */
export const authPasskeysRelations = relations(authPasskeys, ({ one }) => ({
  // Each passkey belongs to exactly one user.
  user: one(users, {
    fields: [authPasskeys.userId],
    references: [users.id],
  }),
}));

/**
 * --------------------------------------------------------------------------
 * AUTH OAUTH ACCOUNTS TABLE (OAuth)
 * --------------------------------------------------------------------------
 * Stores linked OAuth provider accounts (e.g., Google, GitHub).
 */
export const authOAuthAccounts = pgTable(
  'auth_oauth_accounts',
  {
    /**
     * Unique identifier for this linked account (CUID2).
     */
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),

    /**
     * Foreign key linking to the 'users' table.
     */
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /**
     * The provider ID (e.g., 'google', 'github').
     */
    providerId: text('provider_id').notNull(),

    /**
     * The user's unique ID on the provider's system.
     */
    providerAccountId: text('provider_account_id').notNull(),

    /**
     * OAuth tokens.
     */
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    scope: text('scope'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),

    /**
     * Auditing: Timestamps for account linking and updates.
     */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  // A user can only have one account per provider.
  (table) => [
    uniqueIndex('oauth_provider_account_idx').on(table.providerId, table.providerAccountId),
    index('oauth_provider_id_idx').on(table.providerId),
    index('oauth_user_id_idx').on(table.userId),
  ]
);

/**
 * Drizzle relations for the 'authOAuthAccounts' table.
 */
export const authOAuthAccountsRelations = relations(authOAuthAccounts, ({ one }) => ({
  // Each OAuth account belongs to exactly one user.
  user: one(users, {
    fields: [authOAuthAccounts.userId],
    references: [users.id],
  }),
}));

/**
 * --------------------------------------------------------------------------
 * AUTH VERIFICATION TOKENS TABLE
 * --------------------------------------------------------------------------
 * Stores one-time tokens for passwordless auth or verifications.
 */
export const authVerificationTokens = pgTable('auth_verification_tokens', {
  /**
   * Unique identifier for this token (CUID2).
   */
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),

  /**
   * The type of token (magic_link, email_verification, etc.).
   */
  type: verificationTokenTypeEnum('type').notNull(),

  /**
   * The identifier this token is for (e.g., the user's email address).
   */
  identifier: text('identifier').notNull(),

  /**
   * The secure, hashed token value.
   * We store a hash to prevent database leaks from exposing valid tokens.
   */
  token: text('token').notNull().unique(),

  /**
   * Timestamp when this token expires.
   */
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).notNull(),

  /**
   * Timestamp when this token was created.
   */
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * --------------------------------------------------------------------------
 * SCHEMA BUNDLE & INFERRED TYPES
 * --------------------------------------------------------------------------
 * Convenience exports for use throughout the application.
 */

/**
 * A bundle of all auth-related tables and enums.
 * Useful for passing to Drizzle clients or other services.
 */
export const authSchema = {
  // Enums
  roleEnum,
  verificationTokenTypeEnum,
  // Tables
  users,
  authSessions,
  authPasswords,
  authPasskeys,
  authOAuthAccounts,
  authVerificationTokens,
  // Relations
  usersRelations,
  authSessionsRelations,
  authPasswordsRelations,
  authPasskeysRelations,
  authOAuthAccountsRelations,
};

// Infer TS types for use in our application code
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Session = typeof authSessions.$inferSelect;
export type InsertSession = typeof authSessions.$inferInsert;
export type OAuthAccount = typeof authOAuthAccounts.$inferSelect;
export type InsertOAuthAccount = typeof authOAuthAccounts.$inferInsert;
export type Passkey = typeof authPasskeys.$inferSelect;
export type InsertPasskey = typeof authPasskeys.$inferInsert;
export type VerificationToken = typeof authVerificationTokens.$inferSelect;
export type InsertVerificationToken = typeof authVerificationTokens.$inferInsert;
