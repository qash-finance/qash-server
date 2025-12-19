FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for Puppeteer/Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy source code
COPY . .

# Rebuild native dependencies
RUN pnpm rebuild bcrypt

# Generate Prisma client with v7 config
RUN pnpm run prisma:generate

# Build the application
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app

# Install dependencies for Puppeteer/Chromium in production
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY --from=builder /app/package*.json /app/pnpm-lock.yaml ./

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy Prisma files (schema and config)
COPY --from=builder /app/src/database/prisma ./src/database/prisma

# Copy generated Prisma client
COPY --from=builder /app/src/database/generated ./src/database/generated

# Rebuild native dependencies for production
RUN pnpm rebuild bcrypt

ARG PORT=3001
ENV NODE_ENV=production
ENV PORT=$PORT
ENV GENERATE_SOURCEMAP=false
EXPOSE $PORT

CMD ["node", "dist/main"]