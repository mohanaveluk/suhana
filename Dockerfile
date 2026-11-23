# ==========================================
# Stage 1: Build Angular Application
# ==========================================
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build Angular Production. Public pages are prerendered to static HTML (angular.json outputMode
# "static"); the `postbuild` npm script then validates SEO/privacy and writes robots.txt + sitemaps.
RUN npm run build -- --configuration production

# ==========================================
# Stage 2: Nginx Web Server
# ==========================================
FROM nginx:alpine

# Remove default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build output (prerendered pages + index.csr.html app shell)
COPY --from=build /app/dist/suhana/browser /usr/share/nginx/html

# nginx config is a template: the image's entrypoint substitutes these variables at start-up.
# Override them per environment (e.g. `gcloud run deploy --set-env-vars ...`).
ENV CANONICAL_HOST=www.auroramatrimony.com \
    APEX_HOST=auroramatrimony.com \
    API_ORIGIN=https://api.auroramatrimony.com \
    INDEXNOW_KEY=indexnow-key-not-configured
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
