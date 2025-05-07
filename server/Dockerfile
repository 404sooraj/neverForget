# Use Node.js slim image for easier package installs
FROM node:20-slim

# Install system dependencies: ffmpeg, python3, pip
RUN apt-get update \
    && apt-get install -y ffmpeg python3 python3-pip git \
    && rm -rf /var/lib/apt/lists/*

# Install Whisper and Torch (CUDA not included in this image)
RUN pip3 install --no-cache-dir openai-whisper torch torchvision torchaudio

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the server code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (default 3000, can be overridden by env)
EXPOSE 3000

# Start the server
CMD ["npm", "start"] 