# 프론트엔드 빌드 단계
FROM node:20 AS builder

WORKDIR /app

COPY package*.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

# 정적 파일 제공 단계
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
