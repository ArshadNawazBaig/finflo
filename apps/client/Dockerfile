FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy the monorepo source code
COPY package.json package-lock.json ./
COPY . .

# Install dependencies using workspaces
RUN npm ci

# Build the client workspace
# Passing environment variables during build might be needed if using VITE_ prefix.
RUN npm run build --workspace=apps/client

# Stage 2: Serve the application with Nginx
FROM nginx:alpine AS runner

# Remove the default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application from the builder stage
# Client is built into `apps/client/dist` from the root directory based on Vite default output
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
