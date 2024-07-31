# Node.js 20 이미지 사용
FROM node:20 AS builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 yarn.lock을 복사하고 종속성 설치
COPY package*.json yarn.lock ./
RUN yarn install

# 나머지 애플리케이션 파일을 복사
COPY . .

# 애플리케이션 시작
CMD ["node", "server.js"]