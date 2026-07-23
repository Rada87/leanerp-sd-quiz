FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache python3 make g++ \
  && ln -sf python3 /usr/bin/python
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && apk del python3 make g++
COPY --from=builder /app/dist ./dist
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server/index.js"]
