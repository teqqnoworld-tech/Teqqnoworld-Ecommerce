process.env.NODE_ENV = 'production';

import('./server.ts').catch((err) => {
  console.error('[TeqqnoWorld] Failed to start server:', err);
  process.exit(1);
});
