const http = require('http');
const net = require('net');
const WebSocket = require('ws');

const TARGET_HOST = process.env.TARGET_HOST || 'example.com';
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '23', 10);
const PORT = parseInt(process.env.PORT || '8080', 10);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Mudball proxy is running.\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const client = new net.Socket();
  let closed = false;

  const safeClose = () => {
    if (!closed) {
      closed = true;
      try { client.destroy(); } catch (e) {}
      try { ws.close(); } catch (e) {}
    }
  };

  client.setTimeout(30000);

  client.connect(TARGET_PORT, TARGET_HOST, () => {
    ws.send(`Connected to ${TARGET_HOST}:${TARGET_PORT}\n`);
  });

  client.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data.toString('utf8'));
    }
  });

  client.on('timeout', () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('Proxy timeout.\n');
    }
    safeClose();
  });

  client.on('error', (err) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`Proxy socket error: ${err.message}\n`);
    }
    safeClose();
  });

  client.on('close', () => {
    safeClose();
  });

  ws.on('message', (msg) => {
    if (!closed) {
      client.write(msg);
    }
  });

  ws.on('close', () => {
    safeClose();
  });

  ws.on('error', () => {
    safeClose();
  });
});

server.listen(PORT, () => {
  console.log(`Mudball proxy listening on port ${PORT}`);
});