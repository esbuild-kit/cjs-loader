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

	export type Parent = {
		/**
		 * I think filename is the more accurate but if it's not available,
		 * fallback to the id since is sometimes accurate.
		 * 
		 * The filename is not available when a dynamic import is detected
		 * and it gets resolved before the parent module has finished ".load()"
		 * which is the method that sets the filename
		 */
		id: string;

		/**
		 * Can be null if the parent id is 'internal/preload' (e.g. via --require)
		 * which doesn't have a file path.
		 */
		filename: string | null;
	};

	export function _resolveFilename(
		request: string,
		parent: Parent,
		isMain: boolean,
		options?: Record<PropertyKey, unknown>,
	): string;
}
