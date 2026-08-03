// @ts-check

const https = require('https');
const http = require('http');
const fs = require('fs');

const gitstatic = require("./git-serve");
const express = require("express");
const { Server } = require('ws'); // ДОБАВЛЕНО: Подключаем веб-сокеты

const repository = '.git';

const app = express();
app.get(/^\/.+/, gitstatic.route().repository(repository));
app.get(/\//, (req, res) => {
  gitstatic.listAllCommits(repository, (err, commits) => {
    console.log(err, commits);

    res.send(
      commits.map((commit) => {
        return `<a href="/${commit.sha}/public/index.html" target="_blank"><span style="font-family: monospace;">${commit.sha.slice(0, 7)} - ${commit.date.toISOString()}</span></a> - <a href="https://github.com/morethanwords/tweb/commit/${commit.sha}" target="_blank">${commit.subject}</a><br>`;
      }).join('')
    );
  });
});

const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const results = {};

for(const name of Object.keys(nets)) {
  for(const net of nets[name]) {
    if(net.family === 'IPv4' && !net.internal) {
      if(!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
    }
  }
}

const useHttp = true; // ИЗМЕНЕНО: Для бесплатного Render ставим true, так как Render сам дает HTTPS снаружи
const transport = http; // ИЗМЕНЕНО: Используем базовый http
let options = {};

console.log(results);

const port = process.env.PORT || 3000; // ИЗМЕНЕНО: Render требует читать порт из окружения
console.log('Listening port:', port);

// Создаем один главный сервер, который поймет и Render, и Telegram
const server = transport.createServer(app);

// ДОБАВЛЕНО: Запуск WebSocket сервера поверх сервера Telegram
const wss = new Server({ server });
wss.on('connection', (ws) => {
  console.log('Csanaks Client connected');
  ws.on('message', (message) => {
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(message.toString());
      }
    });
  });
});

server.listen(port, () => {
  console.log('Server is running on port:', port);
});
