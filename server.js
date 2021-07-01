const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
const Router = require('koa-router');
const cors = require('koa2-cors');
const WS = require('ws');
const path = require('path');
const Storage = require('./Storage');


const app = new Koa();
const router = new Router();

// Body Parsers
app.use(koaBody({
  json: true, text: true, urlencoded: true, multipart: true,
}));

// CORS
app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

// Routers
app.use(router.routes()).use(router.allowedMethods());

// Files Directory
const filesDir = path.join(__dirname, '/files');
app.use(koaStatic(filesDir));

// Starting Server
const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

// DATABASE
const dB = [
  {id: '123', message: 'Тестовый текст', date: Date.now(), type: 'text'},
  {id: '124', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam pellentesque massa vitae libero luctus, et luctus orci consequat. Fusce fringilla venenatis dapibus.', date: Date.now(), type: 'text'},
  {id: '125', message: 'Т', date: Date.now(), type: 'text'},
  {id: '126', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam pellentesque massa vitae libero luctus, et luctus orci consequat. Fusce fringilla venenatis dapibus. Praesent eget sagittis augue. Pellentesque ac nunc dolor. Nullam tortor ipsum, laoreet mattis leo et, congue porttitor magna. Aliquam quis elit sem. Integer semper tristique nisl, ac elementum felis accumsan consequat.', date: Date.now(), type: 'text'},
  {id: '127', message: 'Тестовый текст', date: Date.now(), type: 'text'},
  {id: '29a86030-d83c-11eb-9a19-87bef25338c3', message: 'Ссылки 1 http://ya.ru 2 https://yandex.ru 3 https://google.com 4 http://vk.com', date: Date.now(), type: 'text'},
  {id: 'd4bb4b20-da82-11eb-9154-2d8ca54d4d13', message: 'cat.jpg', date: Date.now(), type: 'image'},
];
const category = {
  links: [
    { link: 'http://ya.ru', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
    { link: 'https://yandex.ru', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
    { link: 'https://google.com', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
    { link: 'http://vk.com', messageId: '29a86030-d83c-11eb-9a19-87bef25338c3' },
  ],
  image: [
    { file: 'cat.jpg', messageId: 'd4bb4b20-da82-11eb-9154-2d8ca54d4d13' },
  ],
  video: [],
  audio: [],
  file: [],
};

let storage = new Storage(dB, category, filesDir);
wsServer.on('connection', (ws) => {
  // let storage = new Storage(ws, dB, category, filesDir);
  storage.ws = ws;
  storage.init();

  router.post('/upload', async (ctx) => {
    storage.loadFile(ctx.request.files.file).then((result) => {
      storage.wsSend({ ...result, event: 'file', side: { links: storage.category.links.length } });
    });
    ctx.response.status = 204;
  });

  // ws.on('close', () => {
  //   storage = '';
  // });
});

server.listen(port, () => console.log('Server started'));
