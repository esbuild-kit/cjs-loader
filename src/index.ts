import fs from 'fs';
import Module from 'module';
import {
	transformSync,
	installSourceMapSupport,
	resolveTsPath,
	transformDynamicImport,
	applySourceMap,
} from '@esbuild-kit/core-utils';
import { getTsconfig, createPathsMatcher } from 'get-tsconfig';

const isPathPattern = /^\.{0,2}\//;
const isTsFilePatten = /\.[cm]?tsx?$/;

const tsconfig = getTsconfig();
const tsconfigRaw = tsconfig?.config;
const tsconfigPathsMatcher = tsconfig && createPathsMatcher(tsconfig);

const sourcemaps = installSourceMapSupport();

const nodeVersion = process.versions.node.split('.').map(Number);
const nodeSupportsImport = (
	// v13.2.0 and higher
	(nodeVersion[0] >= 13 && nodeVersion[1] >= 2)

	// 12.20.0 ~ 13.0.0
	|| (
		(nodeVersion[0] >= 12 && nodeVersion[1] >= 20)
		&& (nodeVersion[0] < 13 && nodeVersion[1] < 0)
	)
);

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

	let code = fs.readFileSync(filePath, 'utf8');

	if (filePath.endsWith('.cjs') && nodeSupportsImport) {
		const transformed = transformDynamicImport(code);
		if (transformed) {
			code = applySourceMap(transformed, filePath, sourcemaps);
		}
	} else {
		const transformed = transformSync(
			code,
			filePath,
			{
				tsconfigRaw,
			},
		);

		code = applySourceMap(transformed, filePath, sourcemaps);
	}

	module._compile(code, filePath);
}

const extensions = Module._extensions;

/**
 * Loaders for implicitly resolvable extensions
 * https://github.com/nodejs/node/blob/v12.16.0/lib/internal/modules/cjs/loader.js#L1166
 */
[
	'.js', // (Handles .cjs, .cts, .mts & any explicitly specified extension that doesn't match any loaders)
	'.ts',
	'.tsx',
	'.jsx',
].forEach((extension) => {
	extensions[extension] = transformer;
});

/**
 * Loaders for explicitly resolvable extensions
 * (basically just .mjs because CJS loader has a special handler for it)
 *
 * Loaders for extensions .cjs, .cts, & .mts don't need to be
 * registered because they're explicitly specified and unknown
 * extensions (incl .cjs) fallsback to using the '.js' loader:
 * https://github.com/nodejs/node/blob/v18.4.0/lib/internal/modules/cjs/loader.js#L430
 *
 * That said, it's actually ".js" and ".mjs" that get special treatment
 * rather than ".cjs" (it might as well be ".random-ext")
 */
Object.defineProperty(extensions, '.mjs', {
	value: transformer,

	// Prevent Object.keys from detecting these extensions
	// when CJS loader iterates over the possible extensions
	enumerable: false,
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
