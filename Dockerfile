FROM node:0.12.7

RUN	groupadd -r node \
&&	useradd -r -m -g node node

USER root
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN rm -rf /usr/src/app/node_modules
RUN chown -R node:node /usr/src/app
USER node

COPY . /usr/src/app
USER root
RUN chmod 777 mazeGames.log
USER node
RUN npm install jsdom thingspeakclient
RUN npm install socket.io
ENV PORT 8080  
EXPOSE 8080

CMD ["node", "gameserver.js"]

