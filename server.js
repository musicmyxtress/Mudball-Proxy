const http = require('http');
const net = require('net');
const WebSocket = require('ws');

const PORT = parseInt(process.env.PORT || '8080', 10);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Mudball proxy is running.\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const client = new net.Socket();
  let closed = false;
  let connectedToMud = false;
  let targetHost = '';
  let targetPort = 23;

  const safeClose = () => {
    if (!closed) {
      closed = true;
      try { client.destroy(); } catch (e) {}
      try { ws.close(); } catch (e) {}
    }
  };

  const sendToBrowser = (text) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(text);
    }
  };

  client.setTimeout(30000);

  client.on('data', (data) => {
    sendToBrowser(data.toString('utf8'));
  });

  client.on('timeout', () => {
    sendToBrowser('Proxy timeout.\n');
    safeClose();
  });

 client.on('error', (err) => {
    sendToBrowser(`Proxy socket error: ${err.message}\n`);
    safeClose();
  });

  client.on('close', () => {
    safeClose();
  });

  ws.on('message', (msg) => {
    if (closed) return;

    const text = msg.toString().trim();

    if (!connectedToMud) {
      const parts = text.split(':');
      if (parts.length !== 2) {
        sendToBrowser('Invalid connection format. Use host:port\n');
        safeClose();
        return;
      }

      targetHost = parts[0].trim();
      targetPort = parseInt(parts[1].trim(), 10);

      if (!targetHost || Number.isNaN(targetPort) || targetPort < 1 || targetPort > 65535) {
        sendToBrowser('Invalid host or port.\n');
        safeClose();
        return;
      }

      client.connect(targetPort, targetHost, () => {
        connectedToMud = true;
        sendToBrowser(`Connected to ${targetHost}:${targetPort}\n`);
      });

      return;
    }

    client.write(msg);
  });

  ws.on('close', () => { safeClose();
  });

  ws.on('error', () => {
    safeClose();
  });
});

server.listen(PORT, () => {
  console.log(`Mudball proxy listening on port ${PORT}`);
});