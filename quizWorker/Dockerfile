# Use the official Node.js image as a base
FROM node:20 AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Install Node.js dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Set build-time environment variables
ARG MONGODB_URL
ARG SQS_REGION
ARG QUIZ_QUEUE_URL
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG QUIZ_NOTIFICATION_API_URL

# Environment variables for production
ENV MONGODB_URL=${MONGODB_URL}
ENV SQS_REGION=${SQS_REGION}
ENV QUIZ_QUEUE_URL=${QUIZ_QUEUE_URL}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV QUIZ_NOTIFICATION_API_URL=${QUIZ_NOTIFICATION_API_URL}

# Specify the command to run the application
CMD ["node", "quizWorker.js"]
