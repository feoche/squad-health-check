# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY src/types.ts ./src/types.ts

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "--import", "tsx", "server/index.ts"]

