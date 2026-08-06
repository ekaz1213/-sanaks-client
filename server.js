const compression = require('compression');
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const {WebSocketServer} = require('ws');

const app = express();

const thirdTour = process.argv[2] == 3;
const forcePort = process.argv[3];
const useHttp = process.argv[4] !== 'https';

const publicFolderName = thirdTour ? 'public3' : 'public';
const serveDist = process.argv.includes('--dist');
const indexFolderName = serveDist ? 'dist' : publicFolderName;
const port = forcePort ? +forcePort : (thirdTour ? 8443 : 80);

const DB_FILE = __dirname + '/auth-db.json';

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch(err) {
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const users = loadUsers();

app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(compression());
if(serveDist) {
  app.use(express.static('dist'));
}
app.use(express.static(publicFolderName));

app.get('/', (req, res) => {
  res.sendFile(__dirname + `/${indexFolderName}/index.html`);
});

const server = useHttp ? http.createServer(app) : https.createServer({
  key: fs.readFileSync(__dirname + '/certs/server-key.pem'),
  cert: fs.readFileSync(__dirname + '/certs/server-cert.pem')
}, app);

const wss = new WebSocketServer({server, path: '/ws'});

wss.on('connection', (socket) => {
  socket.on('message', (message) => {
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch(err) {
      socket.send(JSON.stringify({type: 'AUTH_ERROR', error: 'INVALID_JSON', message: 'Invalid JSON payload'}));
      return;
    }

    if(!payload || typeof payload.type !== 'string') {
      socket.send(JSON.stringify({type: 'AUTH_ERROR', error: 'INVALID_PAYLOAD', message: 'Missing type field'}));
      return;
    }

    const login = typeof payload.login === 'string' ? payload.login.trim() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';

    if(!login || !password) {
      socket.send(JSON.stringify({type: 'AUTH_ERROR', error: 'EMPTY_CREDENTIALS', message: 'Login and password are required'}));
      return;
    }

    switch(payload.type) {
      case 'AUTH_REGISTER':
        if(users[login]) {
          socket.send(JSON.stringify({type: 'AUTH_REGISTER_FAIL', error: 'USER_EXISTS', message: 'Пользователь уже существует'}));
          return;
        }

        users[login] = hashPassword(password);
        saveUsers(users);
        socket.send(JSON.stringify({type: 'AUTH_REGISTER_SUCCESS', message: 'Регистрация выполнена'}));
        return;

      case 'AUTH_LOGIN':
        if(!users[login] || users[login] !== hashPassword(password)) {
          socket.send(JSON.stringify({type: 'AUTH_FAILURE', error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль'}));
          return;
        }

        socket.send(JSON.stringify({type: 'AUTH_SUCCESS', message: 'Авторизация успешна'}));
        return;

      default:
        socket.send(JSON.stringify({type: 'AUTH_ERROR', error: 'UNKNOWN_TYPE', message: 'Unknown auth request type'}));
        return;
    }
  });
});

server.listen(port, () => {
  console.log('Listening port:', port, 'folder:', indexFolderName);
});
