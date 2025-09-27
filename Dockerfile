FROM node:22-bullseye AS build
WORKDIR /app
ENV NODE_ENV=development
ENV NPM_CONFIG_INCLUDE=optional
COPY package*.json ./
COPY scripts ./scripts
RUN npm install --include=optional
COPY . .
RUN node scripts/check-rollup-native.cjs || npm run fix:rollup
RUN npm run build

FROM node:22-bullseye
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nodejs && chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 5000
CMD ["npm","start"]