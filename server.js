const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const DATA_DIR = path.join(__dirname, 'data');
const ATTACHMENTS_DIR = path.join(__dirname, 'attachments');

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(filename, defaultValue) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    if (!text) return defaultValue;
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') return defaultValue;
    console.error(`JSON読み込みエラー: ${filename}`, err);
    return defaultValue;
  }
}

function writeJson(filename, value) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function getNextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

ensureDirectory(DATA_DIR);
ensureDirectory(ATTACHMENTS_DIR);

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
      const users = readJson('users.json', {});
      const username = query.get('username');
      if (username) {
        const user = users[username] || null;
        return sendJson(res, 200, { user });
      }
      return sendJson(res, 200, { users });
    }

    if (req.method === 'POST' && urlPath === '/api/users') {
      const body = await parseRequestBody(req);
      const users = readJson('users.json', {});
      if (body.users && typeof body.users === 'object') {
        for (const [username, value] of Object.entries(body.users)) {
          users[username] = { password: value.password || '' };
        }
        writeJson('users.json', users);
        return sendJson(res, 200, { status: 'ok' });
      }
      if (body.username && body.password) {
        users[body.username] = { password: body.password };
        writeJson('users.json', users);
        return sendJson(res, 200, { status: 'ok' });
      }
      return sendJson(res, 400, { error: '無効なパラメーター' });
    }

    if (req.method === 'GET' && urlPath === '/api/projects') {
      const username = query.get('user');
      const mode = query.get('mode');
      if (!username || !mode) return sendJson(res, 400, { error: 'user と mode が必要です' });
      const projects = readJson('projects.json', []).filter((row) => row.username === username && row.mode === mode);
      return sendJson(res, 200, { projects: projects.map((row) => row.project) });
    }

    if (req.method === 'POST' && urlPath === '/api/projects') {
      const body = await parseRequestBody(req);
      if (!body.user || !body.mode || !Array.isArray(body.projects)) return sendJson(res, 400, { error: '無効なパラメーター' });
      let projects = readJson('projects.json', []);
      projects = projects.filter((row) => !(row.username === body.user && row.mode === body.mode));
      for (const project of body.projects) {
        projects.push({ username: body.user, mode: body.mode, project });
      }
      writeJson('projects.json', projects);
      return sendJson(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && urlPath === '/api/tasks') {
      const username = query.get('user');
      const mode = query.get('mode');
      if (!username || !mode) return sendJson(res, 400, { error: 'user と mode が必要です' });
      const tasks = readJson('tasks.json', []);
      const row = tasks.find((item) => item.username === username && item.mode === mode);
      return sendJson(res, 200, { tasks: row ? row.data : {} });
    }

    if (req.method === 'POST' && urlPath === '/api/tasks') {
      const body = await parseRequestBody(req);
      if (!body.user || !body.mode || typeof body.tasks !== 'object') return sendJson(res, 400, { error: '無効なパラメーター' });
      const tasks = readJson('tasks.json', []);
      const existingIndex = tasks.findIndex((item) => item.username === body.user && item.mode === body.mode);
      const entry = { username: body.user, mode: body.mode, data: body.tasks, updatedAt: new Date().toISOString() };
      if (existingIndex >= 0) {
        tasks[existingIndex] = entry;
      } else {
        tasks.push(entry);
      }
      writeJson('tasks.json', tasks);
      return sendJson(res, 200, { status: 'ok' });
    }

    if (req.method === 'POST' && urlPath === '/api/log') {
      const body = await parseRequestBody(req);
      const logs = readJson('logs.json', []);
      logs.push({
        timestamp: body.timestamp || new Date().toISOString(),
        username: body.user || '',
        mode: body.mode || '',
        action: body.action || '',
        payload: body.payload || {}
      });
      writeJson('logs.json', logs);
      return sendJson(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && urlPath === '/api/attachments') {
      const username = query.get('user');
      const mode = query.get('mode');
      if (!username || !mode) return sendJson(res, 400, { error: 'user と mode が必要です' });
      const attachments = readJson('attachments.json', []).filter((row) => row.username === username && row.mode === mode);
      return sendJson(res, 200, { attachments });
    }

    if (req.method === 'POST' && urlPath === '/api/attachments') {
      const body = await parseRequestBody(req);
      if (!body.user || !body.mode || !Array.isArray(body.files)) return sendJson(res, 400, { error: '無効なパラメーター' });
      const saved = [];
      const baseDir = path.join(ATTACHMENTS_DIR, `${body.user}_${body.mode}`);
      ensureDirectory(baseDir);
      const attachments = readJson('attachments.json', []);
      for (const file of body.files) {
        try {
          const name = file.name || `file_${Date.now()}`;
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
          const id = getNextId(attachments);
          attachments.push({
            id,
            username: body.user,
            mode: body.mode,
            filename: saveName,
            filepath: relPath,
            size: buffer.length,
            type: file.type || '',
            date: file.date || '',
            project: file.project || '',
            taskTitle: file.taskTitle || '',
            createdAt: now
          });
          saved.push({ name: saveName, url: relPath, size: buffer.length, type: file.type || '' });
        } catch (e) {
          console.error('Failed to save attachment', e);
        }
      }
      writeJson('attachments.json', attachments);
      return sendJson(res, 200, { status: 'ok', files: saved });
    }

    if (req.method === 'DELETE' && urlPath === '/api/attachments') {
      const username = query.get('user');
      const mode = query.get('mode');
      const filename = query.get('filename');
      if (!username || !mode || !filename) return sendJson(res, 400, { error: 'user, mode, filename が必要です' });
      const filePath = path.join(ATTACHMENTS_DIR, `${username}_${mode}`, filename);
      if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'ファイルが見つかりません' });
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete file', e);
        return sendJson(res, 500, { error: 'ファイル削除エラー' });
      }
      let attachments = readJson('attachments.json', []);
      attachments = attachments.filter((row) => !(row.username === username && row.mode === mode && row.filename === filename));
      writeJson('attachments.json', attachments);
      return sendJson(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && urlPath === '/api/download') {
      const username = query.get('user');
      const mode = query.get('mode');
      const filename = query.get('filename');
      console.log(`Download request: user=${username}, mode=${mode}, filename=${filename}`);
      if (!username || !mode || !filename) return sendJson(res, 400, { error: 'user, mode, filename が必要です' });
      const filePath = path.join(ATTACHMENTS_DIR, `${username}_${mode}`, filename);
      console.log(`Checking file at: ${filePath}`);
      console.log(`File exists: ${fs.existsSync(filePath)}`);
      if (!fs.existsSync(filePath)) {
        console.log(`File not found. Directory contents:`, fs.existsSync(path.join(ATTACHMENTS_DIR, `${username}_${mode}`)) ? fs.readdirSync(path.join(ATTACHMENTS_DIR, `${username}_${mode}`)) : []);
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
      const logs = readJson('logs.json', []);
      const items = logs.slice(-100).reverse().map((row) => ({
        timestamp: row.timestamp,
        user: row.username,
        mode: row.mode,
        action: row.action,
        payload: row.payload
      }));
      return sendJson(res, 200, items);
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
