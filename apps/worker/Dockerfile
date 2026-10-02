# The worker's image (D-055). The worker runs @housemate/core from source, so
# the build context is the repo root:
#
#   docker build -f apps/worker/Dockerfile .
#
# Nothing secret goes into the image: .dockerignore keeps every .env file out,
# and the host sets the environment (`fly secrets set` for anything secret).

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /app

# Production dependencies of the worker and the packages it uses, and nothing
# else in the workspace.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile --prod --filter "@housemate/worker..."

FROM base
ENV NODE_ENV=production
COPY --from=deps /app ./
COPY tsconfig.base.json ./
COPY packages/core/tsconfig.json packages/core/
COPY packages/core/src packages/core/src
COPY apps/worker/tsconfig.json apps/worker/
COPY apps/worker/src apps/worker/src

USER node
WORKDIR /app/apps/worker
# The health check the host polls: 200 while the job loop is turning over.
EXPOSE 8080
# Same as `pnpm start`, without pnpm in the way of SIGTERM.
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
