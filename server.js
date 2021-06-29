const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
// const Router = require('koa-router');
const cors = require('koa2-cors');
const WS = require('ws');
const uuid = require('uuid');

const app = new Koa();

// Body Parsers
app.use(koaBody({ json: true, text: true, urlencoded: true, multipart: true, }));

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

const dB = [
  {id: '123', message: 'Тестовый текст', date: Date.now()},
  {id: '124', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam pellentesque massa vitae libero luctus, et luctus orci consequat. Fusce fringilla venenatis dapibus.', date: Date.now()},
  {id: '125', message: 'Т', date: Date.now()},
  {id: '126', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam pellentesque massa vitae libero luctus, et luctus orci consequat. Fusce fringilla venenatis dapibus. Praesent eget sagittis augue. Pellentesque ac nunc dolor. Nullam tortor ipsum, laoreet mattis leo et, congue porttitor magna. Aliquam quis elit sem. Integer semper tristique nisl, ac elementum felis accumsan consequat.', date: Date.now()},
  {id: '127', message: 'Тестовый текст', date: Date.now()},
  {id: '29a86030-d83c-11eb-9a19-87bef25338c3', message: 'Ссылки 1 http://ya.ru 2 https://yandex.ru 3 https://google.com 4 http://vk.com', date: Date.now()},
  // {type: 'text', message: '1', date: Date.now()},
  // {type: 'text', message: '2', date: Date.now()},
  // {type: 'text', message: '3', date: Date.now()},
  // {type: 'text', message: '4', date: Date.now()},
  // {type: 'text', message: '5', date: Date.now()},
  // {type: 'text', message: '6', date: Date.now()},
  // {type: 'text', message: '7', date: Date.now()},
  // {type: 'text', message: '8', date: Date.now()},
  // {type: 'text', message: '9', date: Date.now()},
  // {type: 'text', message: '10', date: Date.now()},
  // {type: 'text', message: '11', date: Date.now()},
  // {type: 'text', message: '12', date: Date.now()},
  // {type: 'text', message: '13', date: Date.now()},
  // {type: 'text', message: '14', date: Date.now()},
  // {type: 'text', message: '15', date: Date.now()},
  // {type: 'text', message: '16', date: Date.now()},
  // {type: 'text', message: '17', date: Date.now()},
  // {type: 'text', message: '18', date: Date.now()},
  // {type: 'text', message: '19', date: Date.now()},
  // {type: 'text', message: '20', date: Date.now()},
  // {type: 'text', message: '21', date: Date.now()},
];
const category = {
  links: [
    { link: 'http://ya.ru', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
    { link: 'https://yandex.ru', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
    { link: 'https://google.com', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
    { link: 'http://vk.com', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
  ],
};

const wsServer = new WS.Server({ server });
wsServer.on('connection', (ws) => {
  ws.on('message', message => {
    const command = JSON.parse(message);
    console.log(command);

    // Запрос на данные из БД
    if (command.event === 'load') {
      // Для "ленивой" подгрузки
      const startPosition = command.message ? command.message : dB.length;
      const itemCounter = startPosition > 10 ? 10 : startPosition;
      const returnDB = [];
      for (let i = 1; i <= itemCounter; i += 1) {
        
        returnDB.push(dB[startPosition - i]);
      }

      const data = {
        type: 'database',
        dB: returnDB,
        side: { links: category.links.length },
        position: startPosition - 10,
      };
      ws.send(JSON.stringify(data));
    }

    // Запросы на данные из категории
    if (command.event === 'storage') {
      ws.send(JSON.stringify({type: 'storage', category: command.message, data: category[command.message]}));
    }

    // Запрос на выдачу сообщения из БД
    if (command.event === 'select') {
      const message = dB.find((item) => item.id === command.message);
      ws.send(JSON.stringify({type: 'select', message }));
    }

    // Новое сообщение
    if (command.event === 'message') {
      const data = {
        id: uuid.v1(),
        message: command.message,
        date: Date.now(),
      };
      dB.push(data);
      linksToLinks(command.message, data.id);
      ws.send(JSON.stringify({ ...data, type: 'text', side: { links: category.links.length } }));
    }
    // if (command.event === 'login') {
    //   const findNickname = clients.findIndex((client) => client.nick.toLowerCase() === command.message.toLowerCase());
    //   if (findNickname === -1 && command.message != '') {

    //     ws.nick = command.message;
    //     const clientsNicknameList = clients.map((client) => client.nick);
    //     ws.send(JSON.stringify({ event: 'connect', message: clientsNicknameList }))
    //     clients.push(ws);

    //     for(let client of clients) {
    //       const chatMessage = JSON.stringify({ event: 'system', message: { action: 'login', nickname: ws.nick } });
    //       client.send(chatMessage);
    //     }

    //   } else {
    //     ws.close(1000, 'Такой логин уже есть в чате');
    //   }
    // }

    // if (command.event === 'chat') {
    //   for(let client of clients) {
    //     const chatMessage = JSON.stringify({ event: 'chat', message: { nickname: ws.nick, date: Date.now(), text: command.message } });
    //     client.send(chatMessage);
    //   }
    // }
  });

  ws.on('close', () => {
    // const findNickname = clients.findIndex((client) => client.nick === ws.nick);
    // if (findNickname !== -1) {
    //   clients.splice(findNickname, 1);

    //   for(let client of clients) {
    //     const chatMessage = JSON.stringify({ event: 'system', message: { action: 'logout', nickname: ws.nick } });
    //         client.send(chatMessage);
    //   }
    // }
  });
});

function linksToLinks(text, messageId) {
  let links = text.match(/(http:\/\/|https:\/\/){1}(www)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-?%#&-]*)*\/?/gi);
  if (links) {
    category.links.push(...links.map((item) => { return { link: item, messageId }}));
  }
}


server.listen(port, () => console.log('Server started'));
