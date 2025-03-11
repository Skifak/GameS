FROM node:20
WORKDIR /app

# Устанавливаем переменную окружения для определения Docker-контейнера
ENV DOCKER_ENV=true

COPY package*.json ./
RUN npm install
RUN mkdir -p logs
COPY . .
EXPOSE 2567
CMD ["npm", "run", "server:prod"]