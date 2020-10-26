FROM node:12-alpine

WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock

RUN yarn

COPY src src
COPY jest.config.js jest.config.js
COPY tsconfig.json tsconfig.json

ENTRYPOINT ["yarn"]
