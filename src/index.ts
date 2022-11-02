import path from 'path';
import fs from 'fs';
import Module from 'module';
import {
	transformSync,
	installSourceMapSupport,
	resolveTsPath,
	transformDynamicImport,
	compareNodeVersion,
} from '@esbuild-kit/core-utils';
import {
	getTsconfig,
	parseTsconfig,
	createPathsMatcher,
} from 'get-tsconfig';
import type { TransformOptions } from 'esbuild';

const isPathPattern = /^\.{0,2}\//;
const isTsFilePatten = /\.[cm]?tsx?$/;
const nodeModulesPath = `${path.sep}node_modules${path.sep}`;

const tsconfig = (
	process.env.ESBK_TSCONFIG_PATH
		? {
			path: process.env.ESBK_TSCONFIG_PATH,
			config: parseTsconfig(process.env.ESBK_TSCONFIG_PATH),
		}
		: getTsconfig()
);

const tsconfigRaw = tsconfig?.config;
const tsconfigPathsMatcher = tsconfig && createPathsMatcher(tsconfig);

const applySourceMap = installSourceMapSupport();

const nodeSupportsImport = (
	// v13.2.0 and higher
	compareNodeVersion([13, 2, 0]) >= 0

	// 12.20.0 ~ 13.0.0
	|| (
		compareNodeVersion([12, 20, 0]) >= 0
		&& compareNodeVersion([13, 0, 0]) < 0
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
		const transformed = transformDynamicImport(filePath, code);
		if (transformed) {
			code = applySourceMap(transformed, filePath);
		}
	} else {
		const transformed = transformSync(
			code,
			filePath,
			{
				tsconfigRaw: tsconfigRaw as TransformOptions['tsconfigRaw'],
			},
		);

		code = applySourceMap(transformed, filePath);
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
	get() {
		return transformer;
	},

	// Prevent Object.keys from detecting these extensions
	// when CJS loader iterates over the possible extensions
	enumerable: false,
	// Similar libraries like ts-node and esbuild-register may attempt override this as well.
	// this empty setter is to prevent the error from being thrown:
	// TypeError: Cannot assign to read only property '.mjs' of object '[object Object]'
	set() {
		// no-op
	},
});

const supportsNodePrefix = (
	compareNodeVersion([16, 0, 0]) >= 0
	|| compareNodeVersion([14, 18, 0]) >= 0
);

// Add support for "node:" protocol
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
	// Added in v12.20.0
	// https://nodejs.org/api/esm.html#esm_node_imports
	if (!supportsNodePrefix && request.startsWith('node:')) {
		request = request.slice(5);
	}

	if (
		tsconfigPathsMatcher

		// bare specifier
		&& !isPathPattern.test(request)

		// Dependency paths should not be resolved using tsconfig.json
		&& !parent?.filename.includes(nodeModulesPath)
	) {
		const possiblePaths = tsconfigPathsMatcher(request);

		for (const possiblePath of possiblePaths) {
			const tsFilename = resolveTsFilename.call(this, possiblePath, parent, isMain, options);
			if (tsFilename) {
				return tsFilename;
			}

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

	const tsFilename = resolveTsFilename.call(this, request, parent, isMain, options);
	if (tsFilename) {
		return tsFilename;
	}

	return resolveFilename.call(this, request, parent, isMain, options);
};

/**
 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
 */
function resolveTsFilename(
	this: ThisType<typeof resolveFilename>,
	request: string,
	parent: any,
	isMain: boolean,
	options?: any,
) {
	const tsPath = resolveTsPath(request);

	if (parent && isTsFilePatten.test(parent.filename) && tsPath) {
		try {
			return resolveFilename.call(
				this,
				tsPath,
				parent,
				isMain,
				options,
			);
		} catch (error) {
			const { code } = error as any;
			if (
				code !== 'MODULE_NOT_FOUND'
				&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				throw error;
			}
		}
	}
}
