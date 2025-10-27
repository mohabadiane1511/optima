# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

WORKDIR /app

# Install OS deps
RUN apk add --no-cache libc6-compat

# Copy package manifests
COPY package.json package-lock.json* ./

# Install deps (cached)
RUN npm ci --no-audit --no-fund

# Copy rest of the source (incl. prisma/schema.prisma)
COPY . .

# Generate Prisma client (after sources are copied)
RUN npx prisma generate || true

# Build (for prod images). Dev will use bind mount with next dev.
RUN npm run build || true

EXPOSE 3000

CMD ["npm", "run", "dev"]


