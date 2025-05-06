# Phase 1: Build phase
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Phase 2: Production run
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app ./

RUN npm install --omit=dev

USER root

EXPOSE 3000

CMD ["npm", "start"]
