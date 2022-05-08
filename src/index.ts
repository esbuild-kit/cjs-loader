import fs from 'fs';
import Module from 'module';
import { transformSync, installSourceMapSupport } from '@esbuild-kit/core-utils';
import getTsconfig from 'get-tsconfig';

const isTsFilePatten = /\.[cm]?tsx?$/;

const tsconfig = getTsconfig();
const tsconfigRaw = tsconfig?.config;

const sourcemaps = installSourceMapSupport();

function transformer(
	module: Module,
	filePath: string,
) {
	/**
	 * For tracking dependencies in watch mode
	 */
	if (process.send) {
		process.send({
			type: 'dependency',
			path: filePath,
		});
	}

	const code = fs.readFileSync(filePath, 'utf8');
	const transformed = transformSync(code, filePath, {
		format: 'cjs',
		tsconfigRaw,
	});

	if (transformed.map) {
		sourcemaps!.set(filePath, transformed.map);
	}

	module._compile(transformed.code, filePath);
}

const extensions = Module._extensions;

// https://github.com/nodejs/node/blob/v12.16.0/lib/internal/modules/cjs/loader.js#L1166
// Implicit extensions
[
	'.js',
	'.ts',
	'.tsx',
	'.jsx',
].forEach((extension) => {
	extensions[extension] = transformer;
});

// Explicit extensions
[
	'.cjs',
	'.mjs',
	'.cts',
	'.mts',
].forEach((extension) => {
	Object.defineProperty(extensions, extension, {
		value: transformer,
		enumerable: false,
	});
});

// Add support for "node:" protocol
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (...resolveFilenameArguments) {
	const [request, fromFile] = resolveFilenameArguments;

	// Added in v12.20.0
	// https://nodejs.org/api/esm.html#esm_node_imports
	if (request.startsWith('node:')) {
		resolveFilenameArguments[0] = request.slice(5);
	}

	/**
	 * Typescript 4.6.0 behavior seems to be that if `.mjs` is specified,
	 * it converts it to mts without even testing if it exists, and any consideration for
	 * whether the mjs path actually exists.
	 *
	 * What if we actually want to import a mjs file? with allowJs enabled?
	 */
	if (
		/\.[cm]js$/.test(request)
		&& (fromFile && isTsFilePatten.test(fromFile.filename))
	) {
		resolveFilenameArguments[0] = `${request.slice(0, -2)}ts`;
	}

	return resolveFilename.apply(this, resolveFilenameArguments);
};
