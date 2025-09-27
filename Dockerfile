FROM node:22-bullseye

WORKDIR /app

COPY package*.json ./

# Install dependencies (attempt 1) including optional native rollup binary
RUN npm install --include=optional \
    && echo "--- After first install: rollup packages ---" \
    && ls -1 node_modules | grep rollup || true \
    && (ls -1 node_modules | grep rollup && echo "Rollup base package present") \
    && ( [ -d node_modules/@rollup ] && ls -1 node_modules/@rollup || echo "@rollup directory missing" ) || true

# Force add platform package explicitly if directory missing
RUN if [ ! -d node_modules/@rollup ]; then \
            echo "@rollup namespace missing; installing platform package"; \
            npm install @rollup/rollup-linux-x64-gnu@4.52.2 --save-optional; \
        else \
            echo "@rollup namespace exists"; \
        fi

# Second pass: ensure main rollup and platform binary resolvable
RUN node -e "try{require('rollup');console.log('rollup JS layer OK')}catch(e){console.error('rollup base load failed',e);process.exit(1)}" \
    && node -e "try{require('@rollup/rollup-linux-x64-gnu');console.log('rollup native OK')}catch(e){console.error('rollup native missing',e);process.exit(1)}"

# Copy rest of the source
COPY . .

# Build frontend assets (vite) - if native still fails we attempt one retry install
RUN npm run build || (echo "Build failed, retrying forced reinstall of rollup native" \
    && npm install @rollup/rollup-linux-x64-gnu@4.52.2 --save-optional \
    && node -e "require('@rollup/rollup-linux-x64-gnu');console.log('Native binary now present')" \
    && npm run build)

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user (Debian syntax)
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]