# syntax=docker/dockerfile:1
# MCP server, HTTP/SSE transport (arch#§6.1). The stdio transport is a local-only
# launch mode (`npx @wechat-flow/mcp-server`) and is not containerized here.
# Build context must be the repo root: `docker build -f apps/mcp-server/Dockerfile .`

FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/mcp-server/package.json apps/mcp-server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ruleset/package.json packages/ruleset/package.json
COPY packages/palette/package.json packages/palette/package.json
COPY packages/zh-typo/package.json packages/zh-typo/package.json
COPY packages/blocks/package.json packages/blocks/package.json
COPY packages/marks/package.json packages/marks/package.json
COPY packages/themes/default/package.json packages/themes/default/package.json
COPY packages/themes/magazine/package.json packages/themes/magazine/package.json
COPY packages/themes/literary/package.json packages/themes/literary/package.json
COPY packages/themes/business/package.json packages/themes/business/package.json
COPY packages/themes/tech/package.json packages/themes/tech/package.json
RUN pnpm install --frozen-lockfile --filter @wechat-flow/mcp-server...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/mcp-server/node_modules ./apps/mcp-server/node_modules
COPY --from=deps /repo/packages ./packages
COPY apps/mcp-server ./apps/mcp-server
COPY tsconfig.base.json ./tsconfig.base.json

RUN groupadd --system --gid 1001 wechatflow \
  && useradd --system --uid 1001 --gid wechatflow --home /repo mcpserver
USER mcpserver

WORKDIR /repo/apps/mcp-server
EXPOSE 8788
# http-sse.ts has no /health route (only POST /mcp/tools/:tool) — TCP-connect probe
# until a dedicated health endpoint is added (see deploy-spec §2 已知差距).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('node:net').createConnection(Number(process.env.PORT||8788),'127.0.0.1').on('connect',function(){this.end();process.exit(0)}).on('error',function(){process.exit(1)})"

# index.ts exports startHttpTransport but does not self-invoke (library entry point);
# the container CMD is the production bootstrap for the HTTP/SSE transport.
CMD ["node", "--experimental-strip-types", "-e", \
  "import('./src/transport/http-entry.ts').then(m => m.startHttpTransport(Number(process.env.PORT ?? 8788)))"]
