# Use the official Node.js image as a base
FROM node:20 AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Install Node.js dependencies
RUN yarn install

# Install Python and pip, and clean up cache to reduce image size
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Create and activate a virtual environment
RUN python3 -m venv venv
ENV PATH="/app/venv/bin:$PATH"

# Copy the Python requirements file
COPY requirements.txt ./

# Install Python dependencies in the virtual environment
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Ensure similarity.py is executable
RUN chmod +x similarity.py

# Production image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app /app

# Set environment variable for production
ENV NODE_ENV=production

# ARG variables
ARG MONGODB_URL
ARG SQS_REGION
ARG QUIZ_QUEUE_URL
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG QUIZ_NOTIFICATION_API_URL

# ENV variables
ENV MONGODB_URL=${MONGODB_URL}
ENV SQS_REGION=${SQS_REGION}
ENV QUIZ_QUEUE_URL=${QUIZ_QUEUE_URL}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV QUIZ_NOTIFICATION_API_URL=${QUIZ_NOTIFICATION_API_URL}

# Specify the command to run the application
CMD ["node", "quizWorker.js"]
