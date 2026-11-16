import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// vocab.json stays at the repo root (the old pages read it too). Serve it in dev, copy it into dist on build.
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

const copyVocab = {
  name: 'copy-vocab',
  apply: 'build',
  closeBundle() { fs.copyFileSync(path.join(repoRoot, 'vocab.json'), path.join(repoRoot, 'web', 'dist', 'vocab.json')); },
};

export default defineConfig({
  base: '/',
  plugins: [react(), serveRepoRoot, copyVocab],
  build: { outDir: 'dist', emptyOutDir: true },
  test: { environment: 'jsdom' },
});
