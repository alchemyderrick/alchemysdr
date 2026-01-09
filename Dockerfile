# Use Node.js 20 base image
FROM node:20-slim

# Install system dependencies for Puppeteer and better-sqlite3
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    ca-certificates \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libgbm1 \
    python3 \
    make \
    g++ \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create app directory
WORKDIR /app

# Copy package files for both root and frontend
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install all dependencies (including devDependencies needed for build)
RUN npm install
RUN cd frontend && npm install

# Copy application code
COPY . .

# Build frontend with production settings
RUN NODE_ENV=production npm run build

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start application (environment variables available here)
CMD ["npm", "start"]
