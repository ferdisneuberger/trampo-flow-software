FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN chown node:node /app

COPY --chown=node:node package*.json ./

USER node

RUN npm ci

COPY --chown=node:node . .

RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1:5173/ || exit 1
