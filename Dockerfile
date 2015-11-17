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
RUN touch /usr/src/app/logs/mazeGames.log
USER root
RUN chmod 777 logs/mazeGames.log
USER node
RUN npm install
ENV PORT 8080  
EXPOSE 8080

CMD ["node", "gameserver.js"]

