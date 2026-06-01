const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const server = http.createServer((req, res) => {
  const urlPath = req.url ? req.url.split('?')[0] : '/';
  console.log(`Request: ${req.method} ${req.url}`);
  // ログ受信用API
  if (req.method === 'POST' && urlPath === '/api/log') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        const logLine = JSON.stringify(entry) + '\n';
        const logPath = path.join(__dirname, 'logs.jsonl');
        fs.appendFile(logPath, logLine, (err) => {
          if (err) {
            console.error('Failed to write log', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'invalid' }));
      }
    });
    return;
  }
  // ログ一覧取得API
  if (req.method === 'GET' && urlPath === '/api/logs') {
    const logPath = path.join(__dirname, 'logs.jsonl');
    fs.readFile(logPath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error' }));
        return;
      }
      const lines = data.split('\n').filter(Boolean);
      const items = lines.map((line) => {
        try { return JSON.parse(line); } catch (e) { return { raw: line }; }
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(items));
    });
    return;
  }
  // ルートパスの場合は index.html を返す
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  // ファイルが存在するか確認
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Content-Type を自動判定
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
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
