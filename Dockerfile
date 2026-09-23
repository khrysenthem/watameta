# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# --- deps: install dependencies only, cached separately from source changes ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: compile the Next.js standalone server ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No env vars (DATABASE_URL, AUTH_*) are needed here — every route is
# server-rendered on demand, not statically evaluated, so nothing actually
# runs against them at build time. They're only ever provided at `docker run`
# time (see README).
RUN npm run build

# --- runner: minimal runtime image, no build tooling or source ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Required any time the app is reached through something other than the exact
# host/port it thinks it's on (docker -p port-mapping, a reverse proxy, a load
# balancer) — otherwise Auth.js refuses the request as UntrustedHost. Not a
# secret; genuine per-deployment config (DATABASE_URL, AUTH_SECRET,
# AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET) still comes from `docker run -e`/your
# platform's env config, never baked into the image. See README.
ENV AUTH_TRUST_HOST=true

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
