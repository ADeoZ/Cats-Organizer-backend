const uuid = require('uuid');

module.exports = class Storage {
  constructor(ws, dB, categorydB) {
    this.ws = ws;
    this.dB = dB;
    this.category = categorydB;
  }

  init() {
    this.ws.on('message', (message) => {
      const command = typeof (message) === 'string' ? JSON.parse(message) : { event: 'file' };
      console.log(command);

      // Запрос на данные из БД
      if (command.event === 'load') {
        this.eventLoad(command.message);
      }

      // Запрос на данные из категории
      if (command.event === 'storage') {
        this.eventStorage(command.message);
      }

      // Запрос на выдачу сообщения из БД
      if (command.event === 'select') {
        this.eventSelect(command.message);
      }

      // Новое сообщение
      if (command.event === 'message') {
        this.eventMessage(command.message);
      }
    });
  }

  // Запрос на данные из БД
  eventLoad(position) {
    // Для "ленивой" подгрузки
    const startPosition = position || this.dB.length;
    const itemCounter = startPosition > 10 ? 10 : startPosition;
    const returnDB = [];
    for (let i = 1; i <= itemCounter; i += 1) {
      returnDB.push(this.dB[startPosition - i]);
    }

    const data = {
      type: 'database',
      dB: returnDB,
      side: { links: this.category.links.length },
      position: startPosition - 10,
    };
    this.wsSend(data);
  }

  // Запрос на данные из категории
  eventStorage(category) {
    this.wsSend({ type: 'storage', category, data: this.category[category] });
  }

  // Запрос на выдачу сообщения из БД
  eventSelect(select) {
    const message = this.dB.find((item) => item.id === select);
    this.wsSend({ type: 'select', message });
  }

  // Новое сообщение
  eventMessage(message) {
    const data = {
      id: uuid.v1(),
      message,
      date: Date.now(),
    };
    this.dB.push(data);
    this.linksToLinks(message, data.id);
    this.wsSend({ ...data, type: 'text', side: { links: this.category.links.length } });
  }

  // Отправка ответа сервера
  wsSend(data) {
    this.ws.send(JSON.stringify(data));
  }

  // Запись в базу ссылок
  linksToLinks(text, messageId) {
    const links = text.match(/(http:\/\/|https:\/\/){1}(www)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-?%#&-]*)*\/?/gi);
    if (links) {
      this.category.links.push(...links.map((item) => ({ link: item, messageId })));
    }
  }
};
