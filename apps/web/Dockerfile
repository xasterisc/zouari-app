# syntax=docker/dockerfile:1

# --- Builder Stage ---
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# Copy only the files needed for installation
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY config ./config
COPY packages/api/package.json ./packages/api/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/validation/package.json ./packages/validation/package.json
COPY apps/web/package.json ./apps/web/package.json
# Add any other workspace package.json files here

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Build the target app and its dependencies
RUN pnpm --filter web build

# --- Runner Stage ---
# Creates the final, small, and secure image for production.
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Add a non-root user for security
RUN addgroup -S node && adduser -S node -G node
RUN chown -R node:node /app
USER node

# Copy the pruned production app from the builder
# This copies the output from `output: 'standalone'` in next.config.mjs
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

# Expose port
EXPOSE 3000
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["node", "healthcheck.js"]

# Add a simple healthcheck script
# This is more robust than using 'curl' inside a minimal container
RUN echo "const http = require('http'); \
http.get('http://localhost:3000/api/health', (res) => { \
  if (res.statusCode === 200) { process.exit(0); } \
  else { process.exit(1); } \
}).on('error', () => { process.exit(1); });" > healthcheck.js

# Start server
# The path is 'server.js' in the root of the 'standalone' output
CMD ["node", "server.js"]
