# ---- Build Stage ----
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev) for building
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

# Install production dependencies
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy Prisma schema and migrations
COPY prisma ./prisma/

# Generate Prisma client in production
RUN npx prisma generate

# Copy built app from builder
COPY --from=builder /app/build ./build

# Copy public assets
COPY public ./public

EXPOSE 3000

# Run database migrations and start the app
CMD ["npm", "run", "docker-start"]
