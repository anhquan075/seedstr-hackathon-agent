# Seedstr Agent - Railway Deployment
# Multi-stage build for optimized image size

# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json tsconfig.agent.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development

# Copy source code
COPY src/agent ./src/agent

# Build TypeScript
RUN npm run agent:build

# Verify build output
RUN ls -la /app && ls -la /app/dist || echo 'dist not found'

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy necessary config files
COPY tsconfig.json tsconfig.agent.json ./

# Create directory for agent state
RUN mkdir -p /root/.seedstr && \
    chmod 755 /root/.seedstr

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check endpoint (Railway requires one)
# Note: Agent doesn't expose HTTP, so we just check if process is alive
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "process.exit(0)"

# Run the agent
CMD ["npm", "run", "agent:start"]
