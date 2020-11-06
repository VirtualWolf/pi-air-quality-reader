FROM arm32v6/node:12.19.0-alpine AS base

FROM base AS build
RUN apk add --no-cache make gcc g++ python linux-headers
RUN mkdir -p /opt/build
WORKDIR /opt/build
COPY package*.json tsconfig.json ./
RUN npm install
COPY src src
RUN npm run build
RUN npm prune --production && rm -r /opt/build/src /opt/build/tsconfig.json

FROM base AS release
RUN mkdir -p /opt/service && \
    chown -R node: /opt/service && \
    # We need to add the node user to the "dialout" group in order to access
    # /dev/ttyS0 from inside the container
    adduser node dialout
USER node
WORKDIR /opt/service
COPY --from=build --chown=node:node /opt/build /opt/service

EXPOSE 3000

CMD ["npm", "start"]
