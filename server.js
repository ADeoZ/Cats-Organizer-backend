const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
// const Router = require('koa-router');
const cors = require('koa2-cors');
const WS = require('ws');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');
const Storage = require('./Storage');


const app = new Koa();

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

const filesDir = path.join(__dirname, '/files');
app.use(koaStatic(filesDir));

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());

const dB = [
  {id: '123', message: 'Тестовый текст', date: Date.now()},
  {id: '124', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam pellentesque massa vitae libero luctus, et luctus orci consequat. Fusce fringilla venenatis dapibus.', date: Date.now()},
  {id: '125', message: 'Т', date: Date.now()},
  {id: '126', message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam pellentesque massa vitae libero luctus, et luctus orci consequat. Fusce fringilla venenatis dapibus. Praesent eget sagittis augue. Pellentesque ac nunc dolor. Nullam tortor ipsum, laoreet mattis leo et, congue porttitor magna. Aliquam quis elit sem. Integer semper tristique nisl, ac elementum felis accumsan consequat.', date: Date.now()},
  {id: '127', message: 'Тестовый текст', date: Date.now()},
  {id: '29a86030-d83c-11eb-9a19-87bef25338c3', message: 'Ссылки 1 http://ya.ru 2 https://yandex.ru 3 https://google.com 4 http://vk.com', date: Date.now()},
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
  const storage = new Storage(ws, dB, category);
  storage.init();

  // Обработка файлов
  app.use(async ctx => {
    const { file } = ctx.request.files;
    const link = await new Promise((resolve, reject) => {
      const oldPath = file.path;
      // const filename = uuid.v4();
      const fileExtension = file.name.split('.').pop();
      const fileName = file.name.split(fileExtension)[0].slice(0, -1);
      console.log(fileName);
      console.log(fileExtension);
      const fileFullName = fileName + '.' + fileExtension;
      const newPath = path.join(filesDir, fileFullName);
  
      const callback = (error) => reject(error);
  
      const readStream = fs.createReadStream(oldPath);
      const writeStream = fs.createWriteStream(newPath);
  
      readStream.on('error', callback);
      writeStream.on('error', callback);
  
      readStream.on('close', () => {
        fs.unlink(oldPath, callback);
        resolve(fileFullName);
      });
  
      readStream.pipe(writeStream);
    });
    console.log(link);
    storage.wsSend({type: 'file', link });
    ctx.response.body = link;
  });

});

server.listen(port, () => console.log('Server started'));
