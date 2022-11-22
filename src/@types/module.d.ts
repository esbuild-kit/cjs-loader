import 'module';

declare global {
	namespace NodeJS {
		export interface Module {
			_compile(code: string, filename: string): string;
		}
	}
}

declare module 'module' {
	export const _extensions: NodeJS.RequireExtensions;
	export function _resolveFilename(
		request: string,
		parent: {

			/**
			 * Can be null if the parent id is 'internal/preload' (e.g. via --require)
			 * which doesn't have a file path.
			 */
			filename: string | null;
		},
		isMain: boolean,
		options?: any,
	): string;
}
