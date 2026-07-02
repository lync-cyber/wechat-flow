# syntax=docker/dockerfile:1
# Job Worker: Playwright Chromium headless render pool + BullMQ consumer.
# Build context must be the repo root: `docker build -f apps/job-worker/Dockerfile .`

FROM mcr.microsoft.com/playwright:v1.61.0-noble AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/job-worker/package.json apps/job-worker/package.json
COPY apps/relay/package.json apps/relay/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ruleset/package.json packages/ruleset/package.json
COPY packages/palette/package.json packages/palette/package.json
COPY packages/zh-typo/package.json packages/zh-typo/package.json
RUN pnpm install --frozen-lockfile --filter @wechat-flow/job-worker...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/job-worker/node_modules ./apps/job-worker/node_modules
COPY --from=deps /repo/apps/relay/node_modules ./apps/relay/node_modules
COPY --from=deps /repo/packages ./packages
COPY apps/job-worker ./apps/job-worker
COPY apps/relay ./apps/relay
COPY tsconfig.base.json ./tsconfig.base.json

# Playwright base image ships a non-root `pwuser`; reuse it instead of adding a new user
# so the pre-installed Chromium cache under its $HOME stays readable.
USER pwuser

WORKDIR /repo/apps/job-worker
# No inbound port (arch#§6.3 部署约束基线: Job Worker 无对外端口).
CMD ["node", "--experimental-strip-types", "src/index.ts"]
