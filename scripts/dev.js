const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const server = spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: 'inherit' });
const expo = spawn('npx expo start --web', { cwd: root, stdio: 'inherit', shell: true });

function stop() {
  for (const child of [server, expo]) {
    if (!child.pid || child.killed) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      child.kill();
    }
  }
}

process.on('SIGINT', () => {
  stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});
server.on('exit', (code) => {
  if (code) {
    stop();
    process.exit(code);
  }
});
