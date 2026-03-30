const net = require('net');
const WebSocket = require('ws');

const TARGET_HOST = process.env.TARGET_HOST || 'example.com';
const TARGET_PORT = process.env.TARGET_PORT || 23;
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  const client = new net.Socket();
  client.connect(TARGET_PORT, TARGET_HOST);

  client.on('data', (data) => {
    ws.send(data.toString());
  });

  ws.on('message', (msg) => {
    client.write(msg);
  });

  ws.on('close', () => {
    client.destroy();
  });

  client.on('close', () => {
    ws.close();
  });
});

console.log(`Proxy running on port ${PORT}`);
