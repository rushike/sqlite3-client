# Packaging and deployment considerations

## WASM ownership

`sqlite3-client` does not copy `wa-sqlite.wasm` into its own
`dist/assets` directory. The runtime factory is loaded by
[`../src/wa-sqlite.js`](../src/wa-sqlite.js):

```js
import * as SQLite from 'wa-sqlite';

const SQLiteESMFactory =
  (await import('wa-sqlite/dist/wa-sqlite.mjs')).default;

const module = await SQLiteESMFactory();
```

The factory resolves its WASM relative to the installed module, so the asset is
expected at:

```text
node_modules/wa-sqlite/dist/wa-sqlite.wasm
```

`wa-sqlite` is a runtime dependency in
[`../package.json`](../package.json), pinned to a public Git commit.

## What the library build does

[`../vite.config.js`](../vite.config.js) marks `wa-sqlite` and its subpaths as
external. The library build therefore emits imports such as:

```js
import('wa-sqlite/dist/wa-sqlite.mjs');
```

It does not bundle the WASM and it cannot configure the consuming application’s
bundler. The final application build must process these imports.

## Consumer bundler requirements

The consuming application should:

1. Install `sqlite3-client` from the public Git repository, allowing its public Git
   dependency `wa-sqlite` to be installed under `node_modules`.
2. Build with Vite, Rollup, Webpack, or another bundler that follows package
   imports and supports WebAssembly assets.
3. Ensure the bundler does not externalize `wa-sqlite` for the browser build.
4. Verify that the final application output contains `wa-sqlite.wasm`.
5. Serve the emitted `.wasm` file with a compatible MIME type, normally
   `application/wasm`.

Installing a Git dependency only installs files into `node_modules`. It does
not copy every file from `node_modules` into the application’s output. Asset
emission happens only when the application bundler includes the dependency in
its module graph.

## Vite-specific checks

The consumer should inspect the production build output for `wa-sqlite.wasm`.
If it is missing, check that the application has not excluded `wa-sqlite` from
dependency processing and that its worker build uses the same dependency graph.
The consumer may need a Vite WASM configuration or asset plugin depending on
its Vite version and application setup; this cannot be guaranteed by the
library’s own [`../vite.config.js`](../vite.config.js).

## Worker and hosting requirements

The SQLite client loads dedicated or shared workers. The application must serve
the generated worker files and the WASM file from URLs accessible to those
workers. The default and shared modes also require cross-origin isolation:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

See [`architecture.md`](./architecture.md),
[`build-and-deployment.md`](./build-and-deployment.md), and
[`troubleshooting.md`](./troubleshooting.md) for related implementation and
deployment details.
