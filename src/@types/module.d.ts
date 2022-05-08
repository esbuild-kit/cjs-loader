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
	export function _resolveFilename(filename: string, module: any): string;
}
