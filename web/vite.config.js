import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// In dev, serve ../vocab.json (and icons) from the repo root so fetch('../vocab.json') works.
const serveRepoRoot = {
  name: 'serve-repo-root',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const m = req.url && req.url.match(/^\/(vocab\.json|icon-\d+\.png)$/);
      if (!m) return next();
      const f = path.join(repoRoot, m[1]);
      if (!fs.existsSync(f)) return next();
      res.setHeader('Content-Type', m[1].endsWith('.json') ? 'application/json' : 'image/png');
      fs.createReadStream(f).pipe(res);
    });
  },
};

export default defineConfig({
  base: './',
  plugins: [react(), serveRepoRoot],
  build: { outDir: '../app', emptyOutDir: true },
  test: { environment: 'jsdom' },
});
