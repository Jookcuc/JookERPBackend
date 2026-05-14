const { spawn } = require('node:child_process');

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const children = [];

function start(name, args, env = {}) {
  const child = spawn(npmCommand, args, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
    shell: false,
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (signal) {
      return;
    }

    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      stopAll(code);
    }
  });
}

function stopAll(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(isWindows ? undefined : 'SIGTERM');
    }
  }

  process.exit(code);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

start('ml-forecast', ['run', 'ml:start']);
start('api', ['run', 'start:dev'], {
  ML_FORECAST_URL: process.env.ML_FORECAST_URL || 'http://localhost:8001',
  ML_FORECAST_TIMEOUT_MS: process.env.ML_FORECAST_TIMEOUT_MS || '12000',
});
