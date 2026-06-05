# Use Node.js 20 lightweight Alpine image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Expose the backend port (default 5001)
EXPOSE 5001

# Command to run the application
CMD ["node", "server.js"]
