import { spawn } from 'child_process';

console.log('🚀 Starting Vietnamese Food Taste App (Backend + Frontend)...');

const api = spawn('pnpm', ['--filter', '@vft/api', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const web = spawn('pnpm', ['--filter', '@vft/web', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  api.kill();
  web.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  api.kill();
  web.kill();
  process.exit();
});
