const http = require('http');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const PORT = 8000;
const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('SQLite DB を開けませんでした:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    project TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    username TEXT NOT NULL,
    mode TEXT NOT NULL,
    data TEXT NOT NULL,
    updatedAt TEXT,
    PRIMARY KEY(username, mode)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    username TEXT,
    mode TEXT,
    action TEXT,
    payload TEXT
  )`);
});

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url ? req.url.split('?')[0] : '/';
  const query = req.url?.includes('?') ? new URLSearchParams(req.url.split('?')[1]) : new URLSearchParams();
  console.log(`Request: ${req.method} ${req.url}`);

  try {
    if (req.method === 'GET' && urlPath === '/api/users') {
      const username = query.get('username');
      if (username) {
        db.get('SELECT username, password FROM users WHERE username = ?', [username], (err, row) => {
          if (err) return sendJson(res, 500, { error: 'DBエラー' });
          if (!row) return sendJson(res, 200, { user: null });
          return sendJson(res, 200, { user: { username: row.username, password: row.password } });
        });
        return;
      }
      db.all('SELECT username, password FROM users', (err, rows) => {
        if (err) return sendJson(res, 500, { error: 'DBエラー' });
        const users = {};
        rows.forEach((row) => { users[row.username] = { password: row.password }; });
        sendJson(res, 200, { users });
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/users') {
      const body = await parseRequestBody(req);
      if (body.users && typeof body.users === 'object') {
        const stmt = db.prepare('INSERT OR REPLACE INTO users(username, password) VALUES (?, ?)');
        db.serialize(() => {
          for (const [username, value] of Object.entries(body.users)) {
            stmt.run(username, value.password || '');
          }
          stmt.finalize((err) => {
            if (err) return sendJson(res, 500, { error: 'DBエラー' });
            return sendJson(res, 200, { status: 'ok' });
          });
        });
        return;
      }
      if (body.username && body.password) {
        db.run('INSERT OR REPLACE INTO users(username, password) VALUES (?, ?)', [body.username, body.password], (err) => {
          if (err) return sendJson(res, 500, { error: 'DBエラー' });
          sendJson(res, 200, { status: 'ok' });
        });
        return;
      }
      return sendJson(res, 400, { error: '無効なパラメーター' });
    }

    if (req.method === 'GET' && urlPath === '/api/projects') {
      const username = query.get('user');
      if (!username) return sendJson(res, 400, { error: 'userが必要です' });
      db.all('SELECT project FROM projects WHERE username = ? ORDER BY id', [username], (err, rows) => {
        if (err) return sendJson(res, 500, { error: 'DBエラー' });
        const projects = rows.map((row) => row.project);
        sendJson(res, 200, { projects });
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/projects') {
      const body = await parseRequestBody(req);
      if (!body.user || !Array.isArray(body.projects)) return sendJson(res, 400, { error: '無効なパラメーター' });
      db.serialize(() => {
        db.run('DELETE FROM projects WHERE username = ?', [body.user], (err) => {
          if (err) return sendJson(res, 500, { error: 'DBエラー' });
          const stmt = db.prepare('INSERT INTO projects(username, project) VALUES (?, ?)');
          body.projects.forEach((project) => stmt.run(body.user, project));
          stmt.finalize((err2) => {
            if (err2) return sendJson(res, 500, { error: 'DBエラー' });
            sendJson(res, 200, { status: 'ok' });
          });
        });
      });
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/tasks') {
      const username = query.get('user');
      const mode = query.get('mode');
      if (!username || !mode) return sendJson(res, 400, { error: 'user と mode が必要です' });
      db.get('SELECT data FROM tasks WHERE username = ? AND mode = ?', [username, mode], (err, row) => {
        if (err) return sendJson(res, 500, { error: 'DBエラー' });
        if (!row) return sendJson(res, 200, { tasks: {} });
        try {
          return sendJson(res, 200, { tasks: JSON.parse(row.data) });
        } catch {
          return sendJson(res, 200, { tasks: {} });
        }
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/tasks') {
      const body = await parseRequestBody(req);
      if (!body.user || !body.mode || typeof body.tasks !== 'object') return sendJson(res, 400, { error: '無効なパラメーター' });
      const data = JSON.stringify(body.tasks || {});
      const updatedAt = new Date().toISOString();
      db.run(
        'INSERT INTO tasks(username, mode, data, updatedAt) VALUES(?, ?, ?, ?) ON CONFLICT(username, mode) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt',
        [body.user, body.mode, data, updatedAt],
        (err) => {
          if (err) return sendJson(res, 500, { error: 'DBエラー' });
          sendJson(res, 200, { status: 'ok' });
        }
      );
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/log') {
      const body = await parseRequestBody(req);
      const payload = JSON.stringify(body.payload || {});
      db.run(
        'INSERT INTO logs(timestamp, username, mode, action, payload) VALUES(?, ?, ?, ?, ?)',
        [body.timestamp || new Date().toISOString(), body.user || '', body.mode || '', body.action || '', payload],
        (err) => {
          if (err) {
            console.error('Failed to write log', err);
            return sendJson(res, 500, { status: 'error' });
          }
          sendJson(res, 200, { status: 'ok' });
        }
      );
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/logs') {
      db.all('SELECT timestamp, username, mode, action, payload FROM logs ORDER BY id DESC LIMIT 100', (err, rows) => {
        if (err) return sendJson(res, 500, { error: 'DBエラー' });
        const items = rows.map((row) => {
          let payload;
          try { payload = JSON.parse(row.payload); } catch (_) { payload = { raw: row.payload }; }
          return { timestamp: row.timestamp, user: row.username, mode: row.mode, action: row.action, payload };
        });
        sendJson(res, 200, items);
      });
      return;
    }

    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      let contentType = 'text/plain';
      const ext = path.extname(filePath);
      switch (ext) {
        case '.html':
          contentType = 'text/html; charset=utf-8';
          break;
        case '.css':
          contentType = 'text/css; charset=utf-8';
          break;
        case '.js':
          contentType = 'application/javascript; charset=utf-8';
          break;
        case '.json':
          contentType = 'application/json; charset=utf-8';
          break;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } catch (err) {
    console.error('Server error', err);
    sendJson(res, 500, { error: 'サーバーエラー' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
