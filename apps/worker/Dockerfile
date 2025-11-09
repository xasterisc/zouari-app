# syntax=docker/dockerfile:1

# --- Builder Stage ---
# Installs all dependencies, builds the app, and creates a
# pruned production-only deployment package.
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
# Install build tools for any native Node modules
RUN apk add --no-cache libc6-compat python3 g++ make

WORKDIR /app

# Copy only the files needed for installation
# This leverages Docker's cache.
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
COPY apps/worker/package.json ./apps/worker/package.json

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Build the target app and its dependencies
RUN pnpm --filter @zouari-app/worker build

# Generate a pruned, production-only deployment folder
RUN pnpm --filter @zouari-app/worker deploy --prod /prod/worker

# --- Runner Stage ---
# Creates the final, small, and secure image for production.
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy the pruned production app from the builder
COPY --from=builder /prod/worker .

# Add a non-root user for security
RUN addgroup -S node && adduser -S node -G node
RUN chown -R node:node /app
USER node

# Start server
CMD ["node", "apps/worker/dist/index.js"]
