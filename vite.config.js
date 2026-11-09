import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  worker: {
    format: 'es',
    rollupOptions: {
      external: [/^wa-sqlite(?:\/|$)/, 'sqlocal', '@rushike/myfs', 'js-untar'],
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Sqlite3Client',
      fileName: (format) => `sqlite3-client.${format}.js`,
      formats: ['es']
    },
    rollupOptions: {
      // Keep wa-sqlite external. Its JavaScript and WASM stay in the installed
      // wa-sqlite package and are processed by the consuming application.
      external: [/^wa-sqlite(?:\/|$)/],
      output: {
        globals: {
          'wa-sqlite': 'waSqlite',
        }
      }
    }
  }
});
