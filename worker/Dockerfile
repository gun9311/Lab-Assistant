FROM node:20

WORKDIR /app

# package.json과 yarn.lock 파일을 복사
COPY package*.json yarn.lock ./

# 패키지 설치
RUN yarn install

# 현재 디렉토리의 모든 파일을 복사
COPY . .

# backend 디렉토리의 models 폴더를 복사
COPY backend/models ./backend/models

# Python과 필요한 패키지 설치
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install torch transformers

CMD ["node", "quizWorker.js"]
