const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
const { constants } = require('buffer');

module.exports = class Storage {
  constructor(dB, categorydB, filesDir) {
    // this.ws = ws;
    this.dB = dB;
    this.category = categorydB;
    this.filesDir = filesDir;
    this.allowedTypes = ['image', 'video', 'audio'];
  }

  init() {
    this.ws.on('message', (message) => {
      const command = JSON.parse(message);
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
      
      // Удалить сообщение
      if (command.event === 'delete') {
        this.eventDelete(command.message);
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
      event: 'database',
      dB: returnDB,
      side: this.createSideObject(),
      position: startPosition - 10,
    };
    this.wsSend(data);
  }

  // Запрос на данные из категории
  eventStorage(category) {
    this.wsSend({ event: 'storage', category, data: this.category[category] });
  }

  // Запрос на выдачу сообщения из БД
  eventSelect(select) {
    const message = this.dB.find((item) => item.id === select);
    this.wsSend({ event: 'select', message });
  }

  // Новое сообщение
  eventMessage(message) {
    const data = {
      id: uuid.v1(),
      message,
      date: Date.now(),
      type: 'text',
    };
    this.dB.push(data);
    this.linksToLinks(message, data.id);
    this.wsSend({ ...data, event: 'text', side: this.createSideObject() });
  }

  eventDelete(id) {
    const unlinkFiles = new Set();
    [...this.allowedTypes, 'file'].forEach((type) => {
      const filesInCategory = this.category[type].filter((item) => item.messageId === id).map((item) => item.name);
      filesInCategory.forEach((fileName) => unlinkFiles.add(fileName));
      this.category[type] = this.category[type].filter((item) => item.messageId !== id);
    });
    unlinkFiles.forEach((fileName) => {
      fs.unlink(path.join(this.filesDir, fileName), () => {});
    });

    const messageIndex = this.dB.findIndex((item) => item.id === id);
    this.dB.splice(messageIndex, 1);
    this.wsSend({ id, event: 'delete', side: this.createSideObject() });
  }

  // Отправка ответа сервера
  wsSend(data) {
    this.ws.send(JSON.stringify(data));
  }

  // Формирование объекта side с информацией по категориям хранилища
  createSideObject() {
    const sideLengths = {};
    for (const category in this.category) {
      sideLengths[category] = this.category[category].length;
    }
    console.log(sideLengths);
    return sideLengths;
  }

  // Получение и обработка файлов
  loadFile(file) {
    return new Promise((resolve, reject) => {
      const { fileName, fileType } = this.fileToFile(file);
      const oldPath = file.path;
      const newPath = path.join(this.filesDir, fileName);
  
      const callback = (error) => reject(error);
  
      const readStream = fs.createReadStream(oldPath);
      const writeStream = fs.createWriteStream(newPath);
  
      readStream.on('error', callback);
      writeStream.on('error', callback);
  
      readStream.on('close', () => {
        fs.unlink(oldPath, callback);

        const data = {
          id: uuid.v1(),
          message: fileName,
          date: Date.now(),
          type: fileType,
        };
        this.dB.push(data);

        this.category[fileType].push({ name: fileName, messageId: data.id });

        resolve({ ...data, side: this.createSideObject() });
      });
  
      readStream.pipe(writeStream);
    });
  }

  // Распределение в базу файлов
  fileToFile(file) {
    // Определяем тип файла
    let fileType = file.type.split('/')[0];
    fileType = this.allowedTypes.includes(fileType) ? fileType : 'file';

    // Уточняем уникальность имени файла
    let fileName = file.name;
    let index = 1;
    while (this.category[fileType].findIndex((item) => item.name === fileName) > -1) {
          const fileExtension = file.name.split('.').pop();
      const filePrefName = file.name.split(fileExtension)[0].slice(0, -1);
      fileName = filePrefName + '_' + index + '.' + fileExtension;
      index += 1;
    }

    return { fileName, fileType };
  }

  // Запись в базу ссылок
  linksToLinks(text, messageId) {
    const links = text.match(/(http:\/\/|https:\/\/){1}(www)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-?%#&-]*)*\/?/gi);
    if (links) {
      this.category.links.push(...links.map((item) => ({ name: item, messageId })));
    }
  }
};
