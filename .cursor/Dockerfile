# Base image for Cursor Cloud Agents — Node 22 required (Wrangler 4 + Playwright CI)
FROM node:22-bookworm

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Playwright browser deps (for optional agent test runs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
