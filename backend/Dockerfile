# HotspotPro API + RADIUS (UDP 1812/1813). Use on a VPS or Fly.io — not Render.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --include=dev
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOTSPOTPRO_RADIUS=on
ENV PORT=4000
COPY --from=build /app/dist/server.mjs ./dist/server.mjs
RUN mkdir -p /app/data
EXPOSE 4000
EXPOSE 1812/udp
EXPOSE 1813/udp
VOLUME ["/app/data"]
CMD ["node", "dist/server.mjs"]
