FROM node:18.16.1

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 8080
CMD ["node", "/app/build/index.js"]