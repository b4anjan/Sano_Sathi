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
  // The one-file prototype leaves the AI voices out (they would add megabytes to one HTML file).
  resolve: mode === 'artifact' ? { alias: [{ find: /^\.\/aiClips$/, replacement: './aiClips.empty' }] } : undefined,
  plugins: [
    preact(),
    { name: 'brand-title', transformIndexHtml: (html: string) => html.replace(/%APP_NAME%/g, `${BRAND.appName} · ${BRAND.appNameNe}`) },
    // Install-to-home-screen (website only; the one-file prototype has nowhere to keep icons).
    ...(mode === 'artifact'
      ? []
      : [
          {
            name: 'install-tags',
            transformIndexHtml: () => [
              { tag: 'link', attrs: { rel: 'manifest', href: 'manifest.webmanifest' }, injectTo: 'head' as const },
              { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '48x48', href: 'favicon-48.png' }, injectTo: 'head' as const },
              { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '192x192', href: 'icon-192.png' }, injectTo: 'head' as const },
              { tag: 'link', attrs: { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' }, injectTo: 'head' as const },
              { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' as const },
              { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' as const },
              { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: BRAND.appName }, injectTo: 'head' as const },
              { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, injectTo: 'head' as const },
            ],
          },
        ]),
    ...(mode === 'artifact' ? [viteSingleFile()] : []),
  ],
  // public/ holds the home-screen icons and manifest; the one-file prototype doesn't need them.
  publicDir: mode === 'artifact' ? false : 'public',
  build: {
    outDir: mode === 'artifact' ? 'dist-artifact' : 'dist',
    target: 'es2020',
    // Never turn short voice clips into inline text inside the JavaScript: keep them as files.
    assetsInlineLimit: (file: string) => (/\.(mp3|m4a|ogg|wav)$/i.test(file) ? false : undefined),
  },
  test: {
    environment: 'node',
  },
}));
