# cjs-loader

Node.js `require()` hook to transform ESM & TypeScript to CommonJS on demand using [esbuild](https://esbuild.github.io/).


### Features
- Converts ESM & TypeScript to CommonJS
- Supports new extensions `.cjs` + `.mjs` (and `.cts` &`.mts`)
- Supports Node.js 12.16.2 and up
- Handles `node:` import prefixes
- Sourcemap support
- Cached for performance boost

> **Tip:**
>
> _cjs-loader_ doesn't hook into dynamic `import()` calls.
>
> Use this with [esm-loader](https://github.com/esbuild-kit/esm-loader) for `import()` support. Alternatively, use [esb](https://github.com/esbuild-kit/esb) to handle them both automatically.

## Install

```sh
npm install --save-dev @esbuild-kit/cjs-loader
```

## Usage

Pass `@esbuild/cjs-loader` into the [`--require`](https://nodejs.org/api/cli.html#-r---require-module) flag
```sh
node -r @esbuild/cjs-loader ./file.js
```

### TypeScript configuration
The following properties are used from `tsconfig.json` in the working directory:
- `jsxFactory`
- `jsxFragmentFactory`

### Cache
Modules transformations are cached in the system cache directory ([`TMPDIR`](https://en.wikipedia.org/wiki/TMPDIR)). Transforms are cached by content hash so duplicate dependencies are not re-transformed.

Set environment variable `ESBK_DISABLE_CACHE` to a truthy value to disable the cache:

```sh
ESBK_DISABLE_CACHE=1 node -r @esbuild/cjs-loader ./file.js
```

## Related

- [@esbuild-kit/esb](https://github.com/esbuild-kit/esb) - Node.js runtime powered by esbuild using `@esbuild-kit/cjs-loader` and `@esbuild-kit/esb-loader`.

- [@esbuild-kit/esm-loader](https://github.com/esbuild-kit/esm-loader) - TypeScript to ESM transpiler using the Node.js loader API.
