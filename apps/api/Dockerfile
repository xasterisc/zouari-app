# syntax=docker/dockerfile:1

# --- Builder Stage ---
# Installs all dependencies, builds the app, and creates a
# pruned production-only deployment package.
FROM node:24-alpine AS builder

# 1. Install pnpm (using version from your package.json)
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
# Install build tools for any native Node modules
RUN apk add --no-cache libc6-compat python3 g++ make

WORKDIR /app

# 2. Copy only the files needed for installation
# This leverages Docker's cache. `pnpm install` only re-runs
# if these manifest files change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY config ./config
COPY packages/api/package.json ./packages/api/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/cache/package.json ./packages/cache/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/errors/package.json ./packages/errors/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/tracing/package.json ./packages/tracing/package.json
COPY packages/validation/package.json ./packages/validation/package.json
COPY apps/api/package.json ./apps/api/package.json
# Add any other workspace package.json files here

# 3. Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# 4. Copy all source code
COPY . .

# 5. Build the target app and its dependencies
# (Using the package name from your provided package.json)
RUN pnpm --filter @zouari-app/api-server build

# 6. Generate a pruned, production-only deployment folder
# This is the "magic": it copies only the built app, its package
# dependencies, and the production node_modules to /prod/api
RUN pnpm --filter @zouari-app/api-server deploy --prod /prod/api

# --- Runner Stage ---
# Creates the final, small, and secure image for production.
FROM node:24-alpine AS runner

# 1. Install 'curl' for the healthcheck
RUN apk add --no-cache curl

WORKDIR /app
ENV NODE_ENV=production

# 2. Copy the pruned production app from the builder
# This copies the built code and production node_modules
# with no source code or dev dependencies.
COPY --from=builder /prod/api .

# 3. Add a non-root user for security
RUN addgroup -S node && adduser -S node -G node
RUN chown -R node:node /app
USER node

# 4. Expose port (matches your index.ts and env)
EXPOSE 3001

# 5. Healthcheck (uses the same 'curl' method as your web app)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["curl", "-f", "http://localhost:3001/health"]

# 6. Start server
# The path is relative to the new root, pointing to the built file
CMD ["node", "apps/api/dist/index.js"]
