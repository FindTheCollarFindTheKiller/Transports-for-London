# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /app

# Install production dependencies first to leverage Docker layer caching
COPY london-underground-timetable/package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY london-underground-timetable/server.js ./
COPY london-underground-timetable/public ./public
COPY london-underground-timetable/README.md london-underground-timetable/TFL_INTEGRATION.md ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "server.js"]
