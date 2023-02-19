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
	createFilesMatcher,
} from 'get-tsconfig';
import type { TransformOptions } from 'esbuild';

const isPathPattern = /^\.{0,2}\//;
const isTsFilePatten = /\.[cm]?tsx?$/;
const nodeModulesPath = `${path.sep}node_modules${path.sep}`;

function getProjectsMap(tsconfigPath?: string, projectsMap?: Map<string, {
	tsconfig: ReturnType<typeof getTsconfig>;
	tsconfigPathsMatcher: ReturnType<typeof createPathsMatcher>;
	fileMatcher: ReturnType<typeof createFilesMatcher>;
}>) {
	if (!projectsMap) {
		projectsMap = new Map();
	}

	const tsconfig = (
		tsconfigPath
			? {
				path: path.resolve(tsconfigPath),
				config: parseTsconfig(tsconfigPath),
			}
			: getTsconfig()
	);

	if (!tsconfig) {
		return projectsMap;
	}

	if (!projectsMap.has(tsconfig.path)) {
		projectsMap.set(tsconfig.path, {
			tsconfig,
			tsconfigPathsMatcher: tsconfig && createPathsMatcher(tsconfig),
			fileMatcher: tsconfig && createFilesMatcher(tsconfig),
		});
	}

	tsconfig?.config?.references?.forEach((reference) => {
		const referencedTsconfigPath = reference.path.endsWith('.json') ? reference.path : path.join(reference.path, 'tsconfig.json');
		projectsMap = getProjectsMap(referencedTsconfigPath, projectsMap);
	});

	return projectsMap;
}

export const projectsMap = getProjectsMap(process.env.ESBK_TSCONFIG_PATH);

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
		let tsconfigRaw: TransformOptions['tsconfigRaw'];
		for (const project of projectsMap.values()) {
			tsconfigRaw = project.fileMatcher(filePath) as TransformOptions['tsconfigRaw'];
			if (tsconfigRaw) {
				break;
			}
		}
		const transformed = transformSync(
			code,
			filePath,
			{
				tsconfigRaw,
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
	value: transformer,

	// Prevent Object.keys from detecting these extensions
	// when CJS loader iterates over the possible extensions
	enumerable: false,
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
		projectsMap.size > 0

		// bare specifier
		&& !isPathPattern.test(request)

		// Dependency paths should not be resolved using tsconfig.json
		&& !parent?.filename?.includes(nodeModulesPath)
	) {
		const possiblePaths: string[] = [];
		projectsMap.forEach((project) => {
			if (project.tsconfigPathsMatcher) {
				const possibleProjectPaths = project.tsconfigPathsMatcher(request);
				if (possibleProjectPaths) {
					possiblePaths.push(...possibleProjectPaths);
				}
			}
		});

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
			} catch { }
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
