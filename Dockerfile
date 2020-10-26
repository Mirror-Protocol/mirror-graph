FROM node:12-alpine

WORKDIR /app

COPY package*.json /app/

RUN npm i

COPY src src
COPY jest.config.js /app/jest.config.js
COPY tsconfig.json /app/tsconfig.json

ENTRYPOINT ["npm"]
