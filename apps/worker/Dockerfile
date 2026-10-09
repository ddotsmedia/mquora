# Build on GitHub runners; the VPS only pulls the finished image.
FROM node:22-alpine AS builder
WORKDIR /repo
RUN apk add --no-cache python3 make g++ openssl libc6-compat \
 && npm install -g pnpm@10.28.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mquora/db exec prisma generate
RUN pnpm --filter @mquora/worker... run build

FROM node:22-alpine
WORKDIR /repo
RUN apk add --no-cache openssl libc6-compat \
 && npm install -g pnpm@10.28.0
ENV NODE_ENV=production PORT=3023
COPY --from=builder /repo ./
USER node
EXPOSE 3023
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3023/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "apps/worker/dist/apps/worker/src/main.js"]
