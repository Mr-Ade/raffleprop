FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/api/package.json ./packages/api/
COPY packages/queue/package.json ./packages/queue/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY packages/api/ ./packages/api/
COPY packages/queue/ ./packages/queue/
RUN pnpm --filter=@raffleprop/shared build
RUN pnpm --filter=@raffleprop/db generate
RUN pnpm --filter=@raffleprop/queue build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/queue/dist ./packages/queue/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/queue/node_modules ./packages/queue/node_modules

CMD ["node", "packages/queue/dist/worker.js"]
