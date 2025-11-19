FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./
COPY frontend/index.html ./frontend/

EXPOSE 5000

CMD ["node", "server.js"]