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
		parent: any,
		isMain: boolean,
		options?: any,
	): string;
}
