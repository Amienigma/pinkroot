import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = Number.parseInt(process.env.PORT || '8108', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const PINKROOT_PASSWORD = process.env.PINKROOT_PASSWORD;

if (!JWT_SECRET || !PINKROOT_PASSWORD) {
  console.error('Missing JWT_SECRET or PINKROOT_PASSWORD in server/.env');
  process.exit(1);
}

let pty = null;
let ptyError = null;
try {
  const ptyMod = await import('node-pty');
  pty = ptyMod.default ?? ptyMod;
  if (typeof pty.spawn !== 'function') {
    throw new Error('node-pty loaded but spawn() is missing');
  }
} catch (err) {
  ptyError = err?.message || String(err);
  console.warn(`node-pty failed to load: ${ptyError}`);
  console.warn('The server will still run. The terminal endpoint will return an error until node-pty is rebuilt.');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (typeof req.query.token === 'string') return req.query.token;
  return null;
}

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

app.post('/api/login', (req, res) => {
  const password = req.body?.password;
  if (typeof password !== 'string' || password !== PINKROOT_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ sub: 'pinkroot' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get('/api/system', requireAuth, (_req, res) => {
  const cpus = os.cpus() || [];
  const total = os.totalmem();
  const free = os.freemem();
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: os.uptime(),
    loadavg: os.loadavg(),
    cpus: {
      count: cpus.length,
      model: cpus[0]?.model || 'unknown',
    },
    mem: {
      total,
      free,
      used: total - free,
    },
  });
});

const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
} else {
  console.warn('No dist/ folder found. Run npm run build in the repo root to serve the UI.');
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const index = path.join(distDir, 'index.html');
  if (req.method === 'GET' && fs.existsSync(index)) {
    return res.sendFile(index);
  }
  next();
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

function pickShell() {
  const candidates = [process.env.SHELL, '/bin/bash', '/bin/sh'];
  for (const shell of candidates) {
    if (shell && fs.existsSync(shell)) return shell;
  }
  return '/bin/sh';
}

server.on('upgrade', (request, socket, head) => {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  } catch {
    socket.destroy();
    return;
  }
  if (url.pathname !== '/ws/terminal') {
    socket.destroy();
    return;
  }
  const token = url.searchParams.get('token');
  try {
    verifyToken(token);
  } catch {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  if (!pty) {
    const message = `Terminal unavailable: node-pty failed to load (${ptyError || 'unknown error'}). Install build-essential and python3, then run npm install inside server/.`;
    try { ws.send(`\r\n\x1b[31m${message}\x1b[0m\r\n`); } catch {}
    ws.close(1011, 'node-pty unavailable');
    return;
  }

  const shell = pickShell();
  let term;
  try {
    term = pty.spawn(shell, ['-l'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME || process.cwd(),
      env: process.env,
    });
  } catch (err) {
    const message = `Failed to spawn terminal: ${err.message}`;
    try { ws.send(`\r\n\x1b[31m${message}\x1b[0m\r\n`); } catch {}
    ws.close(1011, 'pty spawn failed');
    return;
  }

  term.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });
  term.onExit(() => {
    try { ws.close(); } catch {}
  });

  ws.on('message', (msg) => {
    const raw = Buffer.isBuffer(msg) ? msg.toString() : String(msg);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.type === 'resize') {
        const cols = Number(parsed.cols);
        const rows = Number(parsed.rows);
        if (cols > 0 && rows > 0) term.resize(cols, rows);
        return;
      }
    } catch {
      // raw keystrokes / pasted text
    }
    try { term.write(raw); } catch {}
  });

  const cleanup = () => {
    try { term.kill(); } catch {}
  };
  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PINKROOT listening on http://0.0.0.0:${PORT}`);
  if (ptyError) console.log('Terminal backend disabled until node-pty loads.');
});
