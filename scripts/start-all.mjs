import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting API (port 3000) and Web (port 5173)...');

const api = spawn('cmd.exe', ['/c', 'pnpm', 'dev'], {
  cwd: path.join(rootDir, 'packages', 'api'),
  stdio: 'inherit',
});

const web = spawn('cmd.exe', ['/c', 'pnpm', 'dev'], {
  cwd: path.join(rootDir, 'packages', 'web'),
  stdio: 'inherit',
});

api.on('exit', (code) => console.log(`[api] exited with code ${code}`));
web.on('exit', (code) => console.log(`[web] exited with code ${code}`));

process.on('SIGINT', () => {
  api.kill();
  web.kill();
  process.exit();
});
