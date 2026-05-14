# ── deps ─────────────────────────────────────────────────────────────────────
# Install node_modules once; shared by both dev and build stages.
# Node 22 LTS: better-sqlite3 has prebuilt binaries (no source compile needed).
FROM node:22-slim AS deps
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
# Compile the static site. Skip tinacms build — the admin panel is not served
# in the container and tinacms build requires TinaCloud credentials.
FROM deps AS build
COPY . .
RUN pnpm astro build

# ── prod ──────────────────────────────────────────────────────────────────────
# Serve the compiled static output. Kept separate so the image is tiny.
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
