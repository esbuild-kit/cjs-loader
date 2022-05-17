import path from 'path';
import { execaNode } from 'execa';
import getNode from 'get-node';

type Options = {
	args: string[];
	nodePath: string;
	cwd?: string;
};

export const nodeWithLoader = async (
	options: Options,
) => await execaNode(
	options.args[0],
	options.args.slice(1),
	{
		env: {
			ESBK_DISABLE_CACHE: '1',
		},
		nodeOptions: [
			'--require',
			path.resolve(__dirname, '../..'),
		],
		nodePath: options.nodePath,
		cwd: options.cwd,
		reject: false,
	},
);

export async function createNode(
	nodeVersion: string,
	fixturePath: string,
) {
	const node = await getNode(nodeVersion);

	return {
		version: node.version,
		load(
			filePath: string,
			options?: {
				cwd?: string;
			},
		) {
			return nodeWithLoader(
				{
					args: [filePath],
					nodePath: node.path,
					cwd: path.join(fixturePath, options?.cwd ?? ''),
				},
			);
		},
		import(
			filePath: string,
			options?: {
				mode?: 'commonjs' | 'typescript';
			},
		) {
			let extension = 'js';

			const mode = options?.mode;
			if (mode === 'typescript') {
				extension = 'ts';
			} else if (mode === 'commonjs') {
				extension = 'cjs';
			}

			return nodeWithLoader({
				args: [
					`./import-file.${extension}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},
		require(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return nodeWithLoader({
				args: [
					`./require-file${options?.typescript ? '.ts' : '.js'}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},
	};
}

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
