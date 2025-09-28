# Use Node.js LTS image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the app
COPY . .

# Set environment variable for port
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the app
CMD ["node", "index.js"]
