# Start with an official lightweight Node.js runtime
FROM node:18-alpine

# Create and set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of your application source code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run your app
CMD [ "node", "server.js" ]

