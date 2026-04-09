FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/web/package.json packages/web/

# Install dependencies
RUN npm ci --workspace=packages/web

# Copy source
COPY packages/web/ packages/web/

# NEXT_PUBLIC_API_URL must be set at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js (standalone output)
RUN npm run build -w packages/web

# Production stage — standalone output
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/packages/web/.next/standalone/ ./
COPY --from=builder /app/packages/web/.next/static packages/web/.next/static
COPY --from=builder /app/packages/web/public packages/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/web/server.js"]
