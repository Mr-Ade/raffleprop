FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY packages/api/ ./packages/api/
RUN pnpm --filter=@raffleprop/shared build
RUN pnpm --filter=@raffleprop/db generate
RUN pnpm --filter=@raffleprop/api build

# Production image
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules

EXPOSE 3001
CMD ["node", "packages/api/dist/server.js"]
