# Use Node.js 20 slim image for smaller size
FROM node:20-slim

# Install Python and pip for yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-setuptools \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY . .

# Create temp directory for yt-dlp
RUN mkdir -p /tmp/yt-dlp && chmod 777 /tmp/yt-dlp

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run the application
CMD ["node", "server.js"]
