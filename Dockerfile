FROM node:20.18.0

WORKDIR /app

COPY ./package.json package.json
COPY ./package-lock.json package-lock.json

RUN npm update
RUN npm install
 
COPY ./*.js .
COPY ./*.html .
COPY ./customConfig/. ./customConfig/.
 
CMD [ "node", "server.js" ]