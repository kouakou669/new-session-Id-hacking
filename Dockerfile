FROM node:lts-buster

RUN git clone https://github.com/kouakou669/new-session-Id-hacking /root/HACKING-MD 

WORKDIR /root/HACKING-MD 

COPY package.json .
RUN npm i
COPY . .

EXPOSE 8000

CMD ["npm","run","Ovl"]
