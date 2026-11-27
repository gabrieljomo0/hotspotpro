# HotspotPro API + RADIUS (UDP 1812/1813) + WinBox TCP relay (8291).
# Build context must be the repo root (fly.toml dockerfile = backend/Dockerfile).

FROM golang:1.23-bookworm AS relay
WORKDIR /src
COPY backend/cmd/winbox-relay/ ./
ENV GOTOOLCHAIN=auto
# Use wireguard module's built-in netstack; exclude the obsolete separate module.
RUN go mod tidy \
 && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /winbox-relay .

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --include=dev
COPY backend/ ./
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOTSPOTPRO_RADIUS=on
ENV HOTSPOTPRO_WINBOX_RELAY=on
ENV PORT=4000
COPY --from=build /app/dist/server.mjs ./dist/server.mjs
COPY --from=relay /winbox-relay /usr/local/bin/winbox-relay
COPY backend/scripts/start-fly.mjs /app/start-fly.mjs
RUN chmod +x /usr/local/bin/winbox-relay && mkdir -p /app/data
EXPOSE 4000
EXPOSE 1812/udp
EXPOSE 1813/udp
EXPOSE 8291/tcp
VOLUME ["/app/data"]
CMD ["node", "start-fly.mjs"]
