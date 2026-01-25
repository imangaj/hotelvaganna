FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_APP_MODE
ARG VITE_API_URL
ENV VITE_APP_MODE=$VITE_APP_MODE
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "run", "preview", "--", "--host", "--port", "3000"]
