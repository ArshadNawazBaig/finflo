const { spawnSync } = require('node:child_process');

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_REALTIME_TRANSPORT: 'polling',
    VITE_DIRECT_UPLOADS: 'true',
    VITE_BACKEND_URL: '',
    VITE_API_URL: '',
  },
});
process.exit(result.status ?? 1);
