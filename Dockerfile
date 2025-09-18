FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Generate Prisma Client during build
RUN npx prisma generate --schema ./src/database/prisma/schema.prisma
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
# Include Prisma artifacts for runtime (schema and migrations)
COPY --from=builder /app/src/database/prisma ./src/database/prisma
ARG PORT=3001
ENV NODE_ENV=production
ENV PORT=$PORT
ENV GENERATE_SOURCEMAP=false
EXPOSE $PORT
# Run Prisma migrations then start app
CMD ["sh", "-c", "npx prisma migrate deploy --schema ./src/database/prisma/schema.prisma && node dist/src/main"]