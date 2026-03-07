# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS frontend-builder
RUN npm install -g pnpm
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# --- Stage 2: Build Backend ---
FROM node:22-alpine AS backend-builder
RUN npm install -g pnpm
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile
COPY backend/ ./
# We use tsc directly to avoid any recursive scripts
RUN npx tsc -p tsconfig.json

# --- Stage 3: Final Production Image ---
FROM node:22-alpine
RUN npm install -g pnpm
WORKDIR /app/backend

# Copy built backend files
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/package.json ./
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/migrations ./migrations

# Copy built frontend files to the static 'out' directory expected by the server
COPY --from=frontend-builder /app/frontend/out ./out

# Setup environment
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the backend agent server
CMD ["node", "dist/agent/cli.js", "start"]
