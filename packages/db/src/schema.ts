import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Users table
 * This is the central table for user accounts.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Sessions table for Lucia auth
 * This stores active user sessions.
 */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // Session ID as text (required by Lucia)
  userId: uuid('user_id') // Foreign key to users.id (must be uuid)
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // Cascade delete
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

/**
 * Type exports for use in application code
 * Provides application-wide type safety for users and sessions.
 */
export type User = typeof users.$inferSelect; // Type for selecting users
export type NewUser = typeof users.$inferInsert; // Type for inserting new users
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Add other app-specific tables here
// export const posts = pgTable(...)
