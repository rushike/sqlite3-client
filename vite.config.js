import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
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
      external: ['wa-sqlite', 'sqlocal', '@rushike/myfs', 'js-untar'],
      output: {
        globals: {
          'wa-sqlite': 'waSqlite',
          'sqlocal': 'sqlocal'
        }
      }
    }
  }
});
