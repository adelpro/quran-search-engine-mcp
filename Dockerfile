# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN yarn build

# --- runtime ---
FROM node:22-alpine
ENV NODE_ENV=production TRANSPORT=http HOST=0.0.0.0 PORT=4000
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production \
 && yarn cache clean \
 && find node_modules/quran-search-engine -name '*.map' -delete
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]