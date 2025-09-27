FROM node:22-bullseye

WORKDIR /app

ENV NODE_ENV=production \
    ROLLUP_VERSION=4.52.2 \
    NPM_CONFIG_INCLUDE=optional

# Copy package manifests and scripts first for better layer caching
COPY package*.json ./
COPY scripts ./scripts

# Install dependencies (includes dev for build)
RUN npm install --include=optional \
  && node scripts/check-rollup-native.cjs || npm run fix:rollup \
  && node scripts/check-rollup-native.cjs

# Copy application source
COPY . .

# Build frontend assets
RUN npm run build

# Prepare runtime user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]