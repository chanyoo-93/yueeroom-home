FROM node:22-alpine AS builder

RUN npm install -g pnpm@10.33.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN pnpm --filter @yueeroom/backend build


FROM node:22-alpine AS runner

RUN npm install -g prisma@6

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "prisma migrate deploy && node dist/main"]
