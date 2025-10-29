import {
  pgTable, text, timestamp, boolean,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

/**
 * Users table
 * Core user information managed by Better Auth
 */
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  // Custom fields
  role: text("role", { enum: ["admin", "user", "guest"] }).notNull().default("user"),
  organizationId: text("organization_id"),
  metadata: text("metadata"), // JSON as string
});

/**
 * Sessions table
 * Manages user sessions
 */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // <-- ADDED required token (make unique)
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Accounts table
 * OAuth provider accounts linked to users
 */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(), // Provider's user ID
    providerId: text("provider_id").notNull(), // e.g., "google", "github"
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    // Use precise timestamps for expiry
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"), // For email/password auth (hashed)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // CORRECTED: Use array syntax and uniqueIndex
  (table) => ([
    uniqueIndex("accounts_provider_account_idx").on(table.providerId, table.accountId),
  ])
);

/**
 * Verifications table
 * Email verification tokens, password reset tokens, etc.
 */
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  identifier: text("identifier").notNull(), // Email or user ID
  value: text("value").notNull().unique(), // Token value (should be unique)
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// convenient bundle (Good idea)
export const authSchema = { users, sessions, accounts, verifications };

// Infer types for use in application code
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = typeof verifications.$inferInsert;

// Add other app-specific tables here
// export const posts = pgTable(...)
