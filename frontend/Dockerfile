# Stage 1: Build the React application
FROM node:20.19.0-alpine AS build

# Set the working directory
WORKDIR /app

# Optional Vite build-time env vars (wired from docker compose build args)
ARG VITE_API_BASE_URL
ARG VITE_CHAT_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_CHAT_API_BASE_URL=${VITE_CHAT_API_BASE_URL}

# Copy package.json and package-lock.json (or yarn.lock)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx + OG Tag Server
FROM nginx:1.25.4-alpine

# Install Python 3 for the OG tag server (Alpine minimal)
RUN apk add --no-cache python3

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the OG tag server
COPY og-server/og_server.py /app/og_server.py
COPY og-server/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# OG tag server environment (override at runtime if needed)
ENV BLOG_API_BASE=http://backend:3001
ENV HTML_ROOT=/usr/share/nginx/html
ENV OG_SERVER_PORT=8080

# Expose port 80 (nginx) — OG server runs on 8080 internally
EXPOSE 80

# Start both nginx and the OG tag server
CMD ["/app/entrypoint.sh"]