const clients = new Set();

const PING_INTERVAL_MS = 20000;

setInterval(() => {
  for (const res of clients) res.write(": ping\n\n");
}, PING_INTERVAL_MS).unref();

export function addClient(res) {
  clients.add(res);
}

export function removeClient(res) {
  clients.delete(res);
}

export function broadcast(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}
