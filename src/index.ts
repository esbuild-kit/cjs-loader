import fs from 'fs';
import Module from 'module';
import {
	transformSync,
	installSourceMapSupport,
	resolveTsPath,
} from '@esbuild-kit/core-utils';
import getTsconfig from 'get-tsconfig';
import { loadConfig, createMatchPath } from 'tsconfig-paths';

const isTsFilePatten = /\.[cm]?tsx?$/;

const tsconfigLoaded = loadConfig();

const matchPath = tsconfigLoaded.resultType === 'failed'
	? (v: string) => v
	: createMatchPath(
		tsconfigLoaded.absoluteBaseUrl,
		tsconfigLoaded.paths,
		tsconfigLoaded.mainFields,
		tsconfigLoaded.addMatchAll,
	);

const tsconfig = getTsconfig();
const tsconfigRaw = tsconfig?.config;

const sourcemaps = installSourceMapSupport();

function transformer(module: Module, filePath: string) {
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
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				sourcemaps!.set(filePath, transformed.map);
	}

	module._compile(transformed.code, filePath);
}

const extensions = Module._extensions;

// https://github.com/nodejs/node/blob/v12.16.0/lib/internal/modules/cjs/loader.js#L1166
// Implicit extensions
['.js', '.ts', '.tsx', '.jsx'].forEach((extension) => {
	extensions[extension] = transformer;
});

// Explicit extensions
['.cjs', '.mjs', '.cts', '.mts'].forEach((extension) => {
	Object.defineProperty(extensions, extension, {
		value: transformer,
		enumerable: false,
	});
});

// Add support for "node:" protocol
const resolveFilename = Module._resolveFilename;
// eslint-disable-next-line func-names
Module._resolveFilename = function (request, parent, isMain, options) {
	// Added in v12.20.0
	// https://nodejs.org/api/esm.html#esm_node_imports
	if (request.startsWith('node:')) {
		request = request.slice(5);
	}

	// If file in tsconfig.paths
	const replaced = matchPath(request);
	if (replaced) {
		request = replaced;
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
