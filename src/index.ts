import fs from 'fs';
import Module from 'module';
import {
	transformSync,
	installSourceMapSupport,
	resolveTsPath,
} from '@esbuild-kit/core-utils';
import { getTsconfig, createPathsMatcher } from 'get-tsconfig';

const isPathPattern = /^\.{0,2}\//;
const isTsFilePatten = /\.[cm]?tsx?$/;

const tsconfig = getTsconfig();
const tsconfigRaw = tsconfig?.config;
const tsconfigPathsMatcher = tsconfig && createPathsMatcher(tsconfig);

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
Module._resolveFilename = function (request, parent, isMain, options) {
	// Added in v12.20.0
	// https://nodejs.org/api/esm.html#esm_node_imports
	if (request.startsWith('node:')) {
		request = request.slice(5);
	}

	if (
		tsconfigPathsMatcher
		// bare specifier
		&& !isPathPattern.test(request)
	) {
		const possiblePaths = tsconfigPathsMatcher(request);
		for (const possiblePath of possiblePaths) {
			try {
				return resolveFilename.call(
					this,
					possiblePath,
					parent,
					isMain,
					options,
				);
			} catch {}
		}
	}

	/**
	 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
	 */
	if (parent && isTsFilePatten.test(parent.filename)) {
		const tsPath = resolveTsPath(request);

		if (tsPath) {
			try {
				return resolveFilename.call(
					this,
					tsPath,
					parent,
					isMain,
					options,
				);
			} catch (error) {
				if ((error as any).code !== 'MODULE_NOT_FOUND') {
					throw error;
				}
			}
		}
	}

	return resolveFilename.call(this, request, parent, isMain, options);
};
