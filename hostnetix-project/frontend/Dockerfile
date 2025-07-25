# Stage 1: Build environment (not strictly necessary for static files, but good practice)
FROM node:18-alpine as build
WORKDIR /app
COPY . .
# You could add build steps here like minification if needed

# Stage 2: Production environment
FROM nginx:alpine
# Copy the static files from the build stage to the NGINX web root
COPY --from=build /app/ /usr/share/nginx/html
# Expose port 80
EXPOSE 80
# The default NGINX command will start the server
CMD ["nginx", "-g", "daemon off;"]

