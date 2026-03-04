# Seedstr Agent + Dashboard - Railway Deployment
# Multi-stage build: TypeScript agent + Next.js dashboard

# Stage 1: Build TypeScript Agent + Next.js Dashboard
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all package files
COPY package*.json ./
COPY tsconfig.json tsconfig.agent.json next.config.ts tailwind.config.ts postcss.config.mjs ./

# Install ALL dependencies (both agent and Next.js)
RUN npm ci

# Copy ALL source code
COPY src ./src
COPY public ./public

# Build TypeScript agent
RUN npm run agent:build

# Build Next.js dashboard
RUN npm run build

# Verify build outputs
RUN ls -la /app/dist && ls -la /app/.next

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy necessary config files
COPY tsconfig.json tsconfig.agent.json next.config.ts ./

# Create directory for agent state
RUN mkdir -p /root/.seedstr && \
    chmod 755 /root/.seedstr

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run the agent (which includes SSE server with dashboard)
CMD ["npm", "run", "agent:start"]
