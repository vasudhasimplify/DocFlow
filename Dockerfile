# Use official Node.js image as the base
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Increase Node.js memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies based on lock file if available
COPY package.json ./
COPY package-lock.json* ./
COPY yarn.lock* ./

# Install dependencies using npm (more reliable in Docker)
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build arguments for environment variables
ARG VITE_FAST_API_URL
ARG VITE_FASTAPI_URL
ARG VITE_API_BASE_URL
ARG VITE_API_URL
ARG VITE_BACKEND_URL
ARG VITE_BULK_API_URL
ARG VITE_BULK_WS_URL
ARG VITE_EDITOR_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAX_PAYLOAD_SIZE
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_URI
ARG VITE_MICROSOFT_CLIENT_ID

# Set environment variables for build
ENV VITE_FAST_API_URL=$VITE_FAST_API_URL
ENV VITE_FASTAPI_URL=$VITE_FASTAPI_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_BULK_API_URL=$VITE_BULK_API_URL
ENV VITE_BULK_WS_URL=$VITE_BULK_WS_URL
ENV VITE_EDITOR_URL=$VITE_EDITOR_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_MAX_PAYLOAD_SIZE=$VITE_MAX_PAYLOAD_SIZE
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI
ENV VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID

# Build the React app
RUN npm run build

# Production image, copy built assets and serve with nginx
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx config
RUN rm -rf ./*

# Copy built assets from build stage
COPY --from=build /app/dist .

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 4173
EXPOSE 4173

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
