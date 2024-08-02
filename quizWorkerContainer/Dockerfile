# Use the official AWS Lambda base image for Node.js 20
FROM public.ecr.aws/lambda/nodejs:20

# Install dependencies using microdnf
RUN microdnf update -y && microdnf install -y \
    python3 \
    python3-pip \
    python3-devel \
    gcc \
    openssl \
    openssl-devel \
    bzip2-devel \
    libffi-devel \
    make \
    wget \
    tar

# Download and compile Python with OpenSSL support
RUN wget https://www.python.org/ftp/python/3.9.5/Python-3.9.5.tgz && \
    tar xzf Python-3.9.5.tgz && \
    cd Python-3.9.5 && \
    ./configure --with-openssl=/usr/local/ssl --enable-optimizations && \
    make altinstall && \
    ln -sf /usr/local/bin/python3.9 /usr/bin/python3 && \
    cd .. && rm -rf Python-3.9.5*

# Set the working directory
WORKDIR /app

# Install yarn globally
RUN npm install -g yarn

# Copy the package files and install the Node.js dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the Python requirements file and install the Python dependencies
COPY requirements.txt ./
RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy the rest of the application code
COPY . .

# Specify the command to run the Lambda function
CMD ["index.handler"]
