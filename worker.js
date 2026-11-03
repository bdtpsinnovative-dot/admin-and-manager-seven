const http = require('http');
const path = require('path');
const next = require('next');

const port = parseInt(process.argv[2] || process.env.PORT, 10) || 8010;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[Worker ${port}] Next.js ready and listening on 127.0.0.1:${port}`);
    if (process.send) {
      process.send({ status: 'ready', port });
    }
  });

  // Graceful termination
  process.on('SIGTERM', () => {
    server.close(() => {
      process.exit(0);
    });
  });
}).catch((err) => {
  console.error(`[Worker ${port}] Startup error:`, err);
  process.exit(1);
});
