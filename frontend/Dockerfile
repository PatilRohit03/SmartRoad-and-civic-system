# Stage 1: Build the React Application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package configuration files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files and build static assets
COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from Stage 1 to Nginx default folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose Nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
