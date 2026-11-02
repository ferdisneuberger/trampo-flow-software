FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache tini \
    && chown node:node /app

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma

USER node

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
