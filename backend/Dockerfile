FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache tini \
    && chown node:node /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma

USER node

RUN npm ci

COPY --chown=node:node . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "start:prod"]
