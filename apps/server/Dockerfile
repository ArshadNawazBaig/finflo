# Stage 1: Build
FROM node:22-alpine AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace directories
COPY . .

# Install all dependencies (leveraging workspaces)
RUN npm ci

# Stage 2: Production service
FROM node:22-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV production

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Set correct permissions
RUN chown -R expressjs:nodejs /app

USER expressjs

# Copy root workspace configurations
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./

# Copy node_modules from builder
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules

# Copy server application
COPY --from=builder --chown=expressjs:nodejs /app/apps/server ./apps/server

# Expose default port
EXPOSE 5001

ENV PORT 5001

# Start the server workspace
CMD ["npm", "run", "start", "--workspace=apps/server"]
