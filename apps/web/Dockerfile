# Build on GitHub runners; the VPS only pulls the finished image.
# NEXT_PUBLIC_* values are inlined at build time, so they are build args.
FROM node:22-alpine AS builder
WORKDIR /repo
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache python3 make g++ libc6-compat \
 && npm install -g pnpm@10.28.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mquora/web... run build

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "apps/web/server.js"]
