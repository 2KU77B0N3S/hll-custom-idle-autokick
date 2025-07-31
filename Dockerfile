# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the application code into the container
COPY app.js /app/app.js

# Install dependencies
RUN npm install axios dotenv

# Expose any ports if needed (this app doesn't expose ports, it's a script)
# EXPOSE 3000 (uncomment if your app listens on a port)

# Command to run the application
CMD ["node", "main.mjs"]
