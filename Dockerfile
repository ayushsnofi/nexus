FROM node

RUN apt-get update && apt-get install -y curl nodejs npm build-essential postgresql-client redis-server supervisor

WORKDIR /app

COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]