# 빌드 단계
FROM node:20 AS builder

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 yarn.lock을 복사하고 종속성 설치
COPY package*.json yarn.lock ./
RUN yarn install

# 나머지 애플리케이션 파일을 복사
COPY . .

# 실행 단계
FROM node:20-slim

# 작업 디렉토리 설정
WORKDIR /app

# 빌드 결과물 복사
COPY --from=builder /app /app

# 환경 변수 설정 (필요한 경우)
# ENV NODE_ENV=production

# 애플리케이션 시작
CMD ["node", "server.js"]
