# 프론트엔드 빌드 단계
FROM node:20 AS builder

WORKDIR /app

# 환경 변수 전달
ARG REACT_APP_API_URL
ARG REACT_APP_WEBSOCKET_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WEBSOCKET_URL=$REACT_APP_WEBSOCKET_URL

COPY package*.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

# 정적 파일 제공 단계
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
