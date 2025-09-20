FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm rebuild bcrypt
RUN npx prisma generate --schema ./src/database/prisma/schema.prisma
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/prisma ./src/database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
RUN npm rebuild bcrypt

ARG PORT=3001
ENV NODE_ENV=production
ENV PORT=$PORT
ENV GENERATE_SOURCEMAP=false
EXPOSE $PORT

CMD ["node", "dist/main"]