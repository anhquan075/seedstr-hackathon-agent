# Seedstr Agent Server - Railway Deployment
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy all source code first
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN pnpm install && pnpm run build

# Build backend (use tsc directly, not the build script that tries to cd to frontend)
WORKDIR /app/backend
RUN pnpm install && npx tsc -p tsconfig.json

# Copy frontend build output to backend's out directory (where SSE server expects it)
RUN mkdir -p out && cp -r ../frontend/out/* out/ 2>/dev/null || true

# Create state directory
RUN mkdir -p /root/.seedstr && chmod 755 /root/.seedstr

# Set environment
ENV NODE_ENV=production

# Set working directory back to backend for startup
WORKDIR /app/backend
ENV NODE_ENV=production

# Expose port 8080 for Railway
EXPOSE 8080

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Start the agent server
CMD ["pnpm", "run", "start"]
