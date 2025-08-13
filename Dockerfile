FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Generate Prisma Client during build
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
# Include Prisma artifacts for runtime (client + schema/migrations)
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
ARG PORT=3001
ENV NODE_ENV=production
ENV PORT=$PORT
ENV GENERATE_SOURCEMAP=false
EXPOSE $PORT
# Run Prisma migrations then start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]