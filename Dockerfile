FROM node:20-bullseye

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies (fix for Rollup optional dependencies issue)
RUN rm -rf node_modules package-lock.json || true
RUN npm config set target_platform linux
RUN npm config set target_arch x64
RUN npm install --include=optional
RUN npm install @rollup/rollup-linux-x64-gnu --save-optional

# Copy source code
COPY . .

# Build the frontend
RUN npm ls @rollup/rollup-linux-x64-gnu || npm install @rollup/rollup-linux-x64-gnu --save-optional
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user (Debian syntax)
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]