FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
# SQLite DB persistence
RUN mkdir -p /data
ENV DATABASE_URL=/data/junimo-db.sqlite

# Docker socket access
RUN apk add --no-cache docker-cli

EXPOSE 3000
CMD ["npm", "start"]
