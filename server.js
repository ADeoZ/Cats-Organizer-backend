const http = require('http');
const Koa = require('koa');
const cors = require('koa2-cors');
const WS = require('ws');

const app = new Koa();

// CORS
app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);


const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());

const clients = [];
const wsServer = new WS.Server({ server });
wsServer.on('connection', (ws, req) => {
  ws.on('message', msg => {
    const command = JSON.parse(msg);
    if (command.event === 'login') {
      const findNickname = clients.findIndex((client) => client.nick.toLowerCase() === command.message.toLowerCase());
      if (findNickname === -1 && command.message != '') {

        ws.nick = command.message;
        const clientsNicknameList = clients.map((client) => client.nick);
        ws.send(JSON.stringify({ event: 'connect', message: clientsNicknameList }))
        clients.push(ws);

        for(let client of clients) {
          const chatMessage = JSON.stringify({ event: 'system', message: { action: 'login', nickname: ws.nick } });
          client.send(chatMessage);
        }

      } else {
        ws.close(1000, 'Такой логин уже есть в чате');
      }
    }

    if (command.event === 'chat') {
      for(let client of clients) {
        const chatMessage = JSON.stringify({ event: 'chat', message: { nickname: ws.nick, date: Date.now(), text: command.message } });
        client.send(chatMessage);
      }
    }
  });

  ws.on('close', () => {
    const findNickname = clients.findIndex((client) => client.nick === ws.nick);
    if (findNickname !== -1) {
      clients.splice(findNickname, 1);

      for(let client of clients) {
        const chatMessage = JSON.stringify({ event: 'system', message: { action: 'logout', nickname: ws.nick } });
            client.send(chatMessage);
      }
    }
  });
});


server.listen(port, () => console.log('Server started'));
