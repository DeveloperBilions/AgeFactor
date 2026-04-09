FROM node:20-alpine AS builder
WORKDIR /app

# Copy monorepo root package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

# Install all dependencies (including devDeps for build)
RUN npm ci --workspace=packages/backend --workspace=packages/shared

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

# Build TypeScript
RUN npm run build -w packages/backend

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy package files for production install
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/packages/backend/dist/ packages/backend/dist/
COPY --from=builder /app/packages/backend/package.json packages/backend/

# Install production dependencies only
RUN npm ci --workspace=packages/backend --workspace=packages/shared --omit=dev

EXPOSE 3001

CMD ["node", "packages/backend/dist/index.js"]
