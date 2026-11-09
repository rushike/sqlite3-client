# Build and deployment

The package is configured as a Vite library in
[`../vite.config.js`](../vite.config.js). Browser consumers should use the ES
module build through the package export in
[`../package.json`](../package.json).

## WASM asset resolution

The package keeps `wa-sqlite` external in
[`../vite.config.js`](../vite.config.js) and loads its factory from
[`../src/wa-sqlite.js`](../src/wa-sqlite.js). The consuming Vite application
resolves the factory and `wa-sqlite.wasm` directly from
`node_modules/wa-sqlite/dist/`, then emits the WASM asset in the application's
final build directory.

Installing a Git dependency places the package under `node_modules`; it does
not by itself copy browser assets into the application's `dist` directory. The
application bundler performs that step when it processes the dependency graph.

The dependency is pinned to a public Git commit in
[`../package.json`](../package.json), so consumers do not need access to this
private monorepo.

## Workspace dependency: `@rushike/myfs`

The exporter and importer modules import `@rushike/myfs` from
[`../src/exporter.ts`](../src/exporter.ts) and
[`../src/importer.ts`](../src/importer.ts). The dependency is declared in
[`../package.json`](../package.json) as a workspace package.

Before building from this monorepo, ensure the workspace dependency is linked
and its declared build artifacts exist. The package currently declares its
runtime entrypoints and types under `dist/` in
[`../../myfs/package.json`](../../myfs/package.json), so build `@rushike/myfs`
first when those artifacts are absent:

```bash
pnpm --filter @rushike/myfs build
pnpm --filter sqlite3-client build
```

For direct Git installation, only runtime dependencies declared in
[`../package.json`](../package.json) are installed for the consumer. The
workspace-only `@rushike/myfs` and `js-untar` packages remain development
dependencies because importer/exporter are not part of the public entrypoint.

## Package name

The current package name is intentionally unscoped: `sqlite3-client`. Install
it directly from the public Git repository:

```bash
npm install github:rushike/sqlite3-client
```

The package name in [`../package.json`](../package.json) controls the import
specifier. The `exports` map cannot create an alternative package name.
