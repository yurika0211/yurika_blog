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

# Stage 2: Serve the application with Nginx
FROM nginx:1.25.4-alpine

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
# We will create this file in the next step.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
