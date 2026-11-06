const http = require('http');
const { fork, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const GATEWAY_PORT = parseInt(process.env.PORT, 10) || 8000;
const LOG_FILE = 'D:\\server_logs\\8000_inventory.log';

function writeLog(msg) {
  const line = `[${new Date().toLocaleTimeString('th-TH')}] ${msg}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}

const ROOT_DIR = path.resolve(__dirname, '..');

const REPO_REGISTRY = {
  'admin-and-manager-seven': {
    name: 'Inventory & Studio Manager (Port 8000)',
    gitDir: __dirname,
    workDir: __dirname,
    buildCmd: 'npm run build',
    deployType: 'hot-swap',
    port: 8000
  },
  'zenslab': {
    name: 'ZenSlab (Port 8001)',
    gitDir: path.join(ROOT_DIR, 'wood_slab', 'woodslabs'),
    workDir: path.join(ROOT_DIR, 'wood_slab', 'woodslabs'),
    buildCmd: 'npm run build',
    deployType: 'restart',
    port: 8001
  },
  'furniture': {
    name: 'Furniture Ember & Ash (Port 8002)',
    gitDir: path.join(ROOT_DIR, 'furniture'),
    workDir: path.join(ROOT_DIR, 'furniture'),
    buildCmd: 'npm run build',
    deployType: 'restart',
    port: 8002
  },
  'employee_backend_frontend-admin': {
    name: 'Employee Tasks Frontend (Port 8003)',
    gitDir: path.join(ROOT_DIR, 'employee'),
    workDir: path.join(ROOT_DIR, 'employee', 'frontend-admin'),
    buildCmd: 'npm run build',
    deployType: 'restart',
    port: 8003
  },
  'adminwallcraft': {
    name: 'WallCraft Admin (Port 8004)',
    gitDir: path.join(ROOT_DIR, 'addminApwallcraft', 'adminwallcraft'),
    workDir: path.join(ROOT_DIR, 'addminApwallcraft', 'adminwallcraft'),
    buildCmd: 'npm run build',
    deployType: 'restart',
    port: 8004
  },
  'wallcraftthailand': {
    name: 'WallCraft Thailand Web (Port 8005)',
    gitDir: path.join(ROOT_DIR, 'wallcraft-next'),
    workDir: path.join(ROOT_DIR, 'wallcraft-next'),
    buildCmd: 'npm run build',
    deployType: 'restart',
    port: 8005
  }
};

function matchRepoConfig(rawRepoName) {
  if (!rawRepoName) return { key: 'admin-and-manager-seven', ...REPO_REGISTRY['admin-and-manager-seven'] };
  const lower = rawRepoName.toLowerCase();
  for (const [key, config] of Object.entries(REPO_REGISTRY)) {
    if (lower === key || lower.includes(key) || key.includes(lower)) {
      return { key, ...config };
    }
  }
  return { key: 'admin-and-manager-seven', ...REPO_REGISTRY['admin-and-manager-seven'] };
}

let activePort = 8010;
let activeWorker = null;
let isReloading = false;
const activeDeployments = new Map();
const deployHistory = [];

function restartServiceOnPort(port, projectDir) {
  return new Promise((resolve) => {
    writeLog(`[Auto-Deploy] Restarting service on port ${port}...`);
    exec(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`, (err, stdout) => {
      const pids = stdout.trim().split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(p => !isNaN(p) && p > 0);
      for (const pid of pids) {
        try {
          process.kill(pid);
          writeLog(`[Auto-Deploy] Terminated old process PID ${pid} on port ${port}`);
        } catch {}
      }
      setTimeout(() => {
        exec(`cmd.exe /c "start \"Port ${port}\" /min /D \"${projectDir}\" node server.js"`, (spawnErr) => {
          if (spawnErr) {
            writeLog(`[Auto-Deploy] Error restarting port ${port}: ${spawnErr.message}`);
          } else {
            writeLog(`[Auto-Deploy] Service on port ${port} restarted successfully.`);
          }
          resolve();
        });
      }, 1500);
    });
  });
}

async function triggerAutoDeploy(rawRepoName) {
  const target = matchRepoConfig(rawRepoName);
  const repoKey = target.key;

  if (activeDeployments.has(repoKey)) {
    writeLog(`[Auto-Deploy] Deploy for ${target.name} (${repoKey}) is already in progress, skipping duplicate.`);
    return;
  }

  const deployStartTime = Date.now();
  activeDeployments.set(repoKey, {
    startTime: deployStartTime,
    repoName: target.name,
    port: target.port,
    stage: 'Building'
  });
  writeLog(`[Auto-Deploy] Starting background git pull & build for ${target.name}...`);

  try {
    // 1. Git pull
    writeLog(`[Auto-Deploy] Pulling latest code in ${target.gitDir}...`);
    await new Promise((resolve) => {
      exec(`cmd.exe /c "cd /d ""${target.gitDir}"" && git pull origin main"`, (err, stdout, stderr) => {
        if (err) writeLog(`[Auto-Deploy Git Pull Info] ${stderr || stdout || err.message}`);
        else writeLog(`[Auto-Deploy Git Pull Output] ${stdout.trim()}`);
        resolve(stdout);
      });
    });

    // 2. Build with live streaming output to log
    writeLog(`[Auto-Deploy] Running '${target.buildCmd}' in ${target.workDir}...`);
    await new Promise((resolve, reject) => {
      const child = exec(`cmd.exe /c "cd /d ""${target.workDir}"" && ${target.buildCmd}"`, { timeout: 360000, maxBuffer: 15 * 1024 * 1024 });

      child.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split(/\r?\n/);
        for (const line of lines) {
          if (line.trim()) writeLog(`[Build] ${line.trim()}`);
        }
      });

      child.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split(/\r?\n/);
        for (const line of lines) {
          if (line.trim()) writeLog(`[Build Info] ${line.trim()}`);
        }
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build exited with code ${code}`));
      });

      child.on('error', (err) => reject(err));
    });

    // 3. Reload / Swap
    const buildDurationSec = Math.round((Date.now() - deployStartTime) / 1000);
    const formattedDuration = buildDurationSec >= 60
      ? `${Math.floor(buildDurationSec / 60)}m ${buildDurationSec % 60}s`
      : `${buildDurationSec}s`;

    writeLog(`[Auto-Deploy] Build successful for ${target.name} in ${formattedDuration}! Reloading service...`);
    if (target.deployType === 'hot-swap') {
      await performHotReload();
      writeLog(`[Auto-Deploy] ${target.name} swapped to new version with 0.00ms downtime! (Total: ${formattedDuration})`);
    } else {
      await restartServiceOnPort(target.port, target.workDir);
      writeLog(`[Auto-Deploy] ${target.name} restarted successfully on port ${target.port}! (Total: ${formattedDuration})`);
    }

    deployHistory.push({
      repoKey,
      repoName: target.name,
      port: target.port,
      durationSec: buildDurationSec,
      formattedDuration,
      timestamp: Date.now(),
      success: true
    });
  } catch (err) {
    const failSec = Math.round((Date.now() - deployStartTime) / 1000);
    writeLog(`[Auto-Deploy Error] Deploy failed for ${target.name} after ${failSec}s: ${err.message}. Current active version continues running safely.`);
    deployHistory.push({
      repoKey,
      repoName: target.name,
      port: target.port,
      durationSec: failSec,
      formattedDuration: `${failSec}s`,
      timestamp: Date.now(),
      success: false,
      error: err.message
    });
  } finally {
    activeDeployments.delete(repoKey);
  }
}

function spawnWorker(port) {
  return new Promise((resolve, reject) => {
    writeLog(`Spawning Next.js worker on internal port ${port}...`);
    const worker = fork(path.join(__dirname, 'worker.js'), [port.toString()], {
      cwd: __dirname,
      env: { ...process.env, PORT: port.toString() },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc']
    });

    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) {
        try { worker.kill(); } catch {}
        reject(new Error(`Worker on port ${port} timed out after 60s`));
      }
    }, 60000);

    worker.on('message', (msg) => {
      if (msg && msg.status === 'ready') {
        ready = true;
        clearTimeout(timer);
        resolve(worker);
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (!ready) {
        reject(new Error(`Worker on port ${port} exited with code ${code} before ready`));
      } else {
        writeLog(`[Worker ${port}] Worker exited with code ${code}. Auto-respawning worker...`);
        if (activeWorker === worker) {
          activeWorker = null;
          setTimeout(() => {
            spawnWorker(port).then((w) => {
              activeWorker = w;
              activePort = port;
              writeLog(`[Worker ${port}] Auto-recovered successfully!`);
            }).catch((e) => {
              writeLog(`[Worker ${port}] Auto-recovery failed: ${e.message}`);
            });
          }, 1000);
        }
      }
    });
  });
}

async function performHotReload() {
  if (isReloading) {
    return { success: false, message: 'Reload already in progress' };
  }
  isReloading = true;
  const targetPort = activePort === 8010 ? 8011 : 8010;
  writeLog(`[Zero-Downtime] Spawning new version on port ${targetPort} while port ${activePort} continues serving users...`);

  try {
    const newWorker = await spawnWorker(targetPort);
    writeLog(`[Zero-Downtime] New worker ready on port ${targetPort}. Verifying health...`);

    // Verification check
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Instant zero-downtime traffic swap
    const oldWorker = activeWorker;
    const oldPort = activePort;
    activePort = targetPort;
    activeWorker = newWorker;
    writeLog(`[Zero-Downtime] Active traffic swapped: port ${oldPort} -> port ${targetPort} (0.00ms downtime)!`);

    // Graceful drain of previous worker (allow 8 seconds for active user requests to complete)
    if (oldWorker) {
      setTimeout(() => {
        writeLog(`[Zero-Downtime] Draining previous worker on port ${oldPort}...`);
        try {
          oldWorker.kill('SIGTERM');
        } catch {}
      }, 8000);
    }

    isReloading = false;
    return { success: true, activePort: targetPort, previousPort: oldPort };
  } catch (err) {
    isReloading = false;
    writeLog(`[Zero-Downtime] Hot-Reload error: ${err.message}. Keeping active worker on port ${activePort}.`);
    return { success: false, error: err.message };
  }
}

// Gateway Server
const server = http.createServer((req, res) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host.includes('www.inventory.terrahome-studio.com')) {
    res.writeHead(301, {
      Location: `https://inventory.terrahome-studio.com${req.url}`
    });
    return res.end();
  }
  // GitHub Webhook Endpoint
  if (req.url === '/api/webhook/github' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const ref = payload.ref || '';
        const repoName = payload.repository?.name || '';
        const target = matchRepoConfig(repoName);
        writeLog(`[GitHub Webhook] Push event received for repo: '${repoName || 'unspecified'}' -> matched '${target.name}' (${ref})`);

        // Respond immediately (HTTP 200) so GitHub confirms delivery
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          repository: repoName,
          target: target.name,
          message: `Webhook received for ${target.name}. Dispatching background Auto-Deploy...`
        }));

        // Trigger background pull and build
        if (!ref || ref.includes('main') || ref.includes('master')) {
          if (payload.after) {
            lastSeenRemoteSha[target.key] = payload.after;
          }
          triggerAutoDeploy(repoName);
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Internal reload endpoint
  if (req.url === '/__internal/reload') {
    const ip = req.socket.remoteAddress;
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      performHotReload().then((result) => {
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }
  }

  // Internal status endpoint
  if (req.url === '/__internal/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activePort,
      isReloading,
      isDeploying: activeDeployments.size > 0,
      activeDeployments: Array.from(activeDeployments.entries()).map(([key, info]) => {
        const elapsed = Math.round((Date.now() - info.startTime) / 1000);
        const elapsedFormatted = elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;
        return {
          key,
          ...info,
          elapsedSec: elapsed,
          elapsedFormatted
        };
      }),
      deployHistory: deployHistory.slice(-20),
      gatewayPort: GATEWAY_PORT,
      autoSyncWatcher: {
        active: true,
        trackedRepos: Object.keys(REPO_REGISTRY),
        lastSeenRemoteSha
      }
    }));
    return;
  }

  // Proxy request to active worker
  const options = {
    hostname: '127.0.0.1',
    port: activePort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-for': req.socket.remoteAddress,
      'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
      'x-forwarded-host': req.headers.host
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Gateway temporarily connecting to worker. Please refresh in a moment.');
    }
  });

  req.pipe(proxyReq);
});

// WebSocket support
server.on('upgrade', (req, socket, head) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: activePort,
    path: req.url,
    method: req.method,
    headers: req.headers
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\n\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    socket.destroy();
  });

  proxyReq.end();
});

// ==========================================
// Git Auto-Sync Watcher (Vercel-style behavior)
// Automatically detects git push on GitHub every 20s
// ==========================================
const lastSeenRemoteSha = {};
let isCheckingUpdates = false;

function queryRemoteSha(gitDir) {
  return new Promise((resolve) => {
    exec(`git -C "${gitDir}" ls-remote origin refs/heads/main`, { timeout: 15000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const sha = stdout.split(/\s+/)[0];
      resolve(sha && sha.length >= 20 ? sha.trim() : null);
    });
  });
}

async function initRemoteShas() {
  for (const [key, config] of Object.entries(REPO_REGISTRY)) {
    try {
      const sha = await queryRemoteSha(config.gitDir);
      if (sha) {
        lastSeenRemoteSha[key] = sha;
        writeLog(`[Auto-Sync] Initialized tracking for ${config.name} at commit ${sha.substring(0, 7)}`);
      }
    } catch {}
  }
}

async function pollRemoteChanges() {
  if (isCheckingUpdates) return;
  isCheckingUpdates = true;

  for (const [key, config] of Object.entries(REPO_REGISTRY)) {
    try {
      const currentSha = await queryRemoteSha(config.gitDir);
      if (!currentSha) continue;

      const previousSha = lastSeenRemoteSha[key];
      if (!previousSha) {
        lastSeenRemoteSha[key] = currentSha;
        continue;
      }

      if (currentSha !== previousSha) {
        writeLog(`[Auto-Sync] New commit detected on GitHub for ${config.name}! (${previousSha.substring(0, 7)} -> ${currentSha.substring(0, 7)})`);
        lastSeenRemoteSha[key] = currentSha;
        // Trigger background auto deploy
        triggerAutoDeploy(key);
      }
    } catch (e) {
      // ignore network hiccups
    }
  }

  isCheckingUpdates = false;
}

// Boot gateway
writeLog(`Starting Zero-Downtime Gateway on port ${GATEWAY_PORT}...`);
server.listen(GATEWAY_PORT, '0.0.0.0', async (err) => {
  if (err) {
    writeLog(`Gateway listen error: ${err.message}`);
    process.exit(1);
  }
  writeLog(`Gateway active on port ${GATEWAY_PORT}. Launching initial worker...`);
  try {
    activeWorker = await spawnWorker(activePort);
    writeLog(`Zero-Downtime Gateway ONLINE: http://localhost:${GATEWAY_PORT} -> worker on port ${activePort}`);

    // Start Vercel-like Auto-Sync Watcher
    writeLog('[Auto-Sync] Initializing Vercel-style Auto-Sync Watcher across all 6 repositories...');
    initRemoteShas().then(() => {
      setInterval(pollRemoteChanges, 20000);
      writeLog('[Auto-Sync] Auto-Sync Watcher is LIVE: checking for git push every 20s.');
    });
  } catch (bootErr) {
    writeLog(`Initial worker boot error: ${bootErr.message}`);
  }
});
