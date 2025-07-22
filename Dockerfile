FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ARG PORT=3001
ENV NODE_ENV=production
ENV PORT=$PORT
ENV GENERATE_SOURCEMAP=false
EXPOSE $PORT
CMD ["node", "dist/src/main"]