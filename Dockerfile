FROM node:22-bullseye

WORKDIR /app

COPY package*.json ./

# Install dependencies (including optional ones for rollup native binary)
RUN npm install --include=optional

# Copy rest of the source
COPY . .

# Build frontend assets (vite)
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