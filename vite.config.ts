import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { BRAND } from './src/brand';

/**
 * Builds:
 *   npm run build           → dist/            (website; later wrapped by Capacitor for the stores)
 *   npm run build:artifact  → dist-artifact/   (one self-contained HTML file for quick test links)
 */
export default defineConfig(({ mode }) => ({
  // Relative asset paths: the same build works at https://<user>.github.io/<repo>/,
  // at a custom domain's root, and inside the Capacitor app. (No URL routing, so this is safe.)
  base: './',
  plugins: [
    preact(),
    { name: 'brand-title', transformIndexHtml: (html: string) => html.replace(/%APP_NAME%/g, BRAND.appName) },
    ...(mode === 'artifact' ? [viteSingleFile()] : []),
  ],
  build: {
    outDir: mode === 'artifact' ? 'dist-artifact' : 'dist',
    target: 'es2020',
  },
  test: {
    environment: 'node',
  },
}));
