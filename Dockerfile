# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat openssl ca-certificates

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time-only placeholders. Runtime secrets must be injected by the deployment
# platform and are intentionally not copied into the final runner image.
ENV DATABASE_URL="postgresql://apivault:build-only@localhost:5432/apivault?schema=public"
ENV BETTER_AUTH_SECRET="build-only-secret-never-use-this-in-production-1234567890"
ENV BETTER_AUTH_URL="http://localhost:3000"

RUN mkdir -p public
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
