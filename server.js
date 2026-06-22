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

// Ensure existing projects table has 'mode' column (for older DBs)
db.get("PRAGMA table_info('projects')", (err, row) => {
  // If single row returned, need to check all columns instead
});
db.all("PRAGMA table_info('projects')", (err, rows) => {
  if (err) return;
  const hasMode = rows.some((c) => c.name === 'mode');
  if (!hasMode) {
    try {
      db.run("ALTER TABLE projects ADD COLUMN mode TEXT DEFAULT 'private'", (alterErr) => {
        if (alterErr) console.warn('projects テーブルに mode カラムを追加できませんでした', alterErr);
        else console.log('projects テーブルに mode カラムを追加しました');
      });
    } catch (e) {
      console.warn('mode カラム追加処理でエラー', e);
    }
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
    mode TEXT NOT NULL,
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
  db.run(`CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    mode TEXT,
    filename TEXT,
    filepath TEXT,
    size INTEGER,
    type TEXT,
    date TEXT,
    project TEXT,
    taskTitle TEXT,
    createdAt TEXT
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
  console.log(`Request: ${req.method} ${req.url} -> urlPath: ${urlPath}`);

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
      const mode = query.get('mode');
      if (!username || !mode) return sendJson(res, 400, { error: 'user と mode が必要です' });
      db.all('SELECT project FROM projects WHERE username = ? AND mode = ? ORDER BY id', [username, mode], (err, rows) => {
        if (err) return sendJson(res, 500, { error: 'DBエラー' });
        const projects = rows.map((row) => row.project);
        sendJson(res, 200, { projects });
      });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/projects') {
      const body = await parseRequestBody(req);
      if (!body.user || !body.mode || !Array.isArray(body.projects)) return sendJson(res, 400, { error: '無効なパラメーター' });
      db.serialize(() => {
        db.run('DELETE FROM projects WHERE username = ? AND mode = ?', [body.user, body.mode], (err) => {
          if (err) return sendJson(res, 500, { error: 'DBエラー' });
          const stmt = db.prepare('INSERT INTO projects(username, mode, project) VALUES (?, ?, ?)');
          body.projects.forEach((project) => stmt.run(body.user, body.mode, project));
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

    // attachments upload via base64 JSON
    if (req.method === 'POST' && urlPath === '/api/attachments') {
      const body = await parseRequestBody(req);
      if (!body.user || !body.mode || !Array.isArray(body.files)) return sendJson(res, 400, { error: '無効なパラメーター' });
      const saved = [];
      const baseDir = path.join(__dirname, 'attachments', `${body.user}_${body.mode}`);
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

      for (const file of body.files) {
        try {
          const name = file.name || `file_${Date.now()}`;
          // ensure unique filename
          let saveName = name;
          let counter = 1;
          while (fs.existsSync(path.join(baseDir, saveName))) {
            const ext = path.extname(name);
            const base = path.basename(name, ext);
            saveName = `${base}_${counter}${ext}`;
            counter += 1;
          }
          const filePath = path.join(baseDir, saveName);
          const buffer = Buffer.from(file.base64 || '', 'base64');
          fs.writeFileSync(filePath, buffer);
          const relPath = `/attachments/${body.user}_${body.mode}/${saveName}`;
          const now = new Date().toISOString();
          db.run(
            'INSERT INTO attachments(username, mode, filename, filepath, size, type, date, project, taskTitle, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [body.user, body.mode, saveName, relPath, buffer.length, file.type || '', file.date || '', file.project || '', file.taskTitle || '', now]
          );
          saved.push({ name: saveName, url: relPath, size: buffer.length, type: file.type || '' });
        } catch (e) {
          console.error('Failed to save attachment', e);
        }
      }
      return sendJson(res, 200, { status: 'ok', files: saved });
    }

    if (req.method === 'GET' && urlPath === '/api/attachments') {
      const username = query.get('user');
      const mode = query.get('mode');
      if (!username || !mode) return sendJson(res, 400, { error: 'user と mode が必要です' });
      db.all('SELECT filename, filepath, size, type, date, project, taskTitle, createdAt FROM attachments WHERE username = ? AND mode = ? ORDER BY id DESC', [username, mode], (err, rows) => {
        if (err) return sendJson(res, 500, { error: 'DBエラー' });
        sendJson(res, 200, { attachments: rows || [] });
      });
      return;
    }

    if (req.method === 'DELETE' && urlPath === '/api/attachments') {
      const username = query.get('user');
      const mode = query.get('mode');
      const filename = query.get('filename');
      if (!username || !mode || !filename) return sendJson(res, 400, { error: 'user, mode, filename が必要です' });
      const filePath = path.join(__dirname, 'attachments', `${username}_${mode}`, filename);
      if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'ファイルが見つかりません' });
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete file', e);
        return sendJson(res, 500, { error: 'ファイル削除エラー' });
      }
      db.run('DELETE FROM attachments WHERE username = ? AND mode = ? AND filename = ?', [username, mode, filename], (err) => {
        if (err) {
          console.error('Failed to delete attachment metadata', err);
          return sendJson(res, 500, { error: 'DB削除エラー' });
        }
        sendJson(res, 200, { status: 'ok' });
      });
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/download') {
      const username = query.get('user');
      const mode = query.get('mode');
      const filename = query.get('filename');
      console.log(`Download request: user=${username}, mode=${mode}, filename=${filename}`);
      if (!username || !mode || !filename) return sendJson(res, 400, { error: 'user, mode, filename が必要です' });
      const filePath = path.join(__dirname, 'attachments', `${username}_${mode}`, filename);
      console.log(`Checking file at: ${filePath}`);
      console.log(`File exists: ${fs.existsSync(filePath)}`);
      if (!fs.existsSync(filePath)) {
        console.log(`File not found. Directory contents:`, fs.readdirSync(path.join(__dirname, 'attachments'), { recursive: true }));
        return sendJson(res, 404, { error: 'ファイルが見つかりません' });
      }
      try {
        const fileContent = fs.readFileSync(filePath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.writeHead(200);
        res.end(fileContent);
      } catch (e) {
        console.error('Failed to read file', e);
        return sendJson(res, 500, { error: 'ファイル読込エラー' });
      }
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/logs') {
      db.all('SELECT timestamp, username, mode, action, payload FROM logs ORDER BY id DESC LIMIT 100', (err, rows) => {
        if (err) {
          console.error('Logs query error:', err);
          return sendJson(res, 500, { error: 'DBエラー' });
        }
        const items = (rows || []).map((row) => {
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
