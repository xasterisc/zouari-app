/**
 * --- Real-World API Validation Entry Point ---
 *
 * This file serves as the main entry point for all API validation schemas.
 *
 * We use a "namespaced export" pattern. Instead of exporting everything
 * individually (which can lead to name collisions), we group
 * schemas by their domain (auth, user, etc.).
 *
 * This makes it very clean to import and use in other packages:
 *
 * import { apiValidation } from '@zouari-app/validation';
 *
 * const validatedBody = apiValidation.auth.authRegisterSchema.parse(req.body);
 * const safeUser = apiValidation.user.userResponseSchema.parse(user);
_ */

import * as auth from './auth.schema.js';
import * as common from './common.schema.js';
import * as user from './user.schema.js';
// As your app grows, you'll add more here:
// import * as project from './project.schema.js';
// import * as billing from './billing.schema.js';

export const apiValidation = {
  auth,
  common,
  user,
  // project,
  // billing,
};

// We also re-export all *types* for convenience.
// This allows for clean type-only imports.
export * from './auth.schema.js';
export * from './common.schema.js';
export * from './user.schema.js';
// export * from './project.schema.js';
// export * from './billing.schema.js';
