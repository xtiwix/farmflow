FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . ./

EXPOSE 5000

CMD ["node", "server.js"]
