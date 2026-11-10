import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` produces one self-contained dist-single/index.html
// (code, styles and the 3D model inlined) that can be shared as a single file/link.
export default defineConfig(({ mode }) => ({
  base: './',
  assetsInclude: ['**/*.glb'],
  server: { host: true, port: 5173 },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: mode === 'single' ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 10_000 } : {},
}));
