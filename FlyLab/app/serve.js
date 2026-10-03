const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const REPO = path.join(ROOT, '..');
const SELFCHECK = path.join(REPO, 'node-tests', 'mesh-selfcheck.mjs');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.map': 'application/json',
    '.gz': 'application/gzip',
    '.tar': 'application/x-tar',
  };
  const SUPER = 'http://127.0.0.1:' + (process.env.SUPER_PORT || '22100');

  let selfRun = null;   // in-flight self-test child (single-flight)

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS'){ res.writeHead(204); res.end(); return; }

    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { urlPath = req.url; }
    if (urlPath === '/') urlPath = '/index.html';

    if (urlPath === '/peerctl'){
      const target = SUPER + req.url.slice('/peerctl'.length);
      const creq = http.request(target, { method: 'GET', timeout: 10000 }, c => {
        res.writeHead(c.statusCode || 502, { 'Content-Type': c.headers['content-type'] || 'application/json; charset=utf-8' });
        c.pipe(res);
      });
      creq.on('timeout', () => { creq.destroy(); try{ res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok:false, error:'supervisor timeout' })); }catch(e){} });
      creq.on('error', e => { try{ res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ok:false, error: String(e.message) })); }catch(e2){} });
      creq.end();
      return;
    }

  if (urlPath === '/backups/latest'){
    fs.readdir(path.join(ROOT, 'backups'), (e, files) => {
      if (e || !files.length){ res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('no backups yet — run `node make-backup.mjs` once from the project root'); return; }
      const tars = files.filter(f => /\.tar\.gz$/i.test(f)).sort();
      const latest = tars[tars.length - 1];
      if (!latest){ res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('no .tar.gz backups yet — run `node make-backup.mjs`'); return; }
      res.writeHead(302, { Location: '/backups/' + encodeURIComponent(latest) });
      res.end();
    });
    return;
  }

  if (urlPath === '/run-self-test'){
    if (selfRun){
      res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('409 · a self-test is already running on this device');
      return;
    }
    let q;
    try { q = new URL(req.url, 'http://x').searchParams; }
    catch { q = new URLSearchParams(); }
    const count = String(parseInt(q.get('count'), 10) || 400);
    const rate = String(parseInt(q.get('rate'), 10) || 40);
    const vectors = q.get('vectors') || 'syn-slew,snaplag,udp-amp';

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-store',
    });

    const p = spawn(process.execPath, [SELFCHECK, '--count', count, '--rate', rate, '--vectors', vectors], {
      cwd: REPO,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    selfRun = p;
    let finished = false;

    const push = chunk => { if (!res.writableEnded) res.write(chunk); };
    const streamOut = stream => stream.on('data', d => {
      const s = d.toString('utf8');
      for (const l of s.split('\n')){ if (l) push(l + '\n'); }
    });
    streamOut(p.stdout);
    streamOut(p.stderr);

    p.on('error', err => { if (!finished) push('\nSPAWN-ERROR ' + String(err && err.message) + '\n'); });
    p.on('close', code => {
      finished = true;
      if (selfRun === p) selfRun = null;
      push('\nEXIT ' + code + '\n');
      if (!res.writableEnded) res.end();
    });

    req.on('close', () => {
      if (!finished && p && p.pid){
        try { process.kill(-p.pid, 'SIGTERM'); } catch { }
        try { p.kill('SIGTERM'); } catch { }
      }
    });
    return;
  }

  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(ROOT, safe);
  if (!file.startsWith(ROOT) && !file.startsWith(REPO)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 ' + urlPath);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const isGz = ext === '.gz';
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(isGz ? { 'Content-Disposition': 'attachment; filename="' + path.basename(file) + '"' } : {}),
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('perio serving http://localhost:' + PORT + ' (root ' + ROOT + ')');
});