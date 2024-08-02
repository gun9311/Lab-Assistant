# 백엔드 빌드 단계
FROM node:20

WORKDIR /app

COPY package*.json yarn.lock ./
RUN yarn install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
