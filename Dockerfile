FROM node:22-bullseye

WORKDIR /app

# Only Rollup/version related env here (do NOT set NODE_ENV yet)
ENV ROLLUP_VERSION=4.52.2 \
    NPM_CONFIG_INCLUDE=optional

# Copy manifests and scripts
COPY package*.json ./
COPY scripts ./scripts

# Install all deps including dev + optional (vite, rollup, tsx, typescript)
RUN npm install --include=optional

# Copy rest of the source
COPY . .

# Verify rollup native availability (self-heal if needed)
RUN node scripts/check-rollup-native.cjs || npm run fix:rollup && node scripts/check-rollup-native.cjs

# Build frontend (needs devDependencies)
RUN npm run build

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

# Now lock into production mode for runtime
ENV NODE_ENV=production

USER nodejs
EXPOSE 3000
CMD ["npm", "start"]