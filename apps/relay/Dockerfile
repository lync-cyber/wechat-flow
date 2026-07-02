# syntax=docker/dockerfile:1
# Multi-stage build: install workspace deps once, run relay from TS sources via
# Node 22 native type stripping (matches `pnpm --filter @wechat-flow/relay dev`).
# Build context must be the repo root: `docker build -f apps/relay/Dockerfile .`

FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/relay/package.json apps/relay/package.json
COPY apps/job-worker/package.json apps/job-worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ruleset/package.json packages/ruleset/package.json
COPY packages/palette/package.json packages/palette/package.json
COPY packages/zh-typo/package.json packages/zh-typo/package.json
RUN pnpm install --frozen-lockfile --filter @wechat-flow/relay...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/relay/node_modules ./apps/relay/node_modules
COPY --from=deps /repo/packages ./packages
COPY apps/relay ./apps/relay
COPY tsconfig.base.json ./tsconfig.base.json

RUN groupadd --system --gid 1001 wechatflow \
  && useradd --system --uid 1001 --gid wechatflow --home /repo relay
USER relay

WORKDIR /repo/apps/relay
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-strip-types", "src/main.ts"]
