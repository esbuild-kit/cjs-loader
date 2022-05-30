import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader';
import { nodeSupportsImport } from '../../utils/node-supports-import';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load CJS', ({ describe }) => {
		describe('.cjs extension', ({ describe }) => {
			const output = 'loaded cjs-ext-cjs/index.cjs {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true}';

			describe('full path', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs/index.cjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.import(importPath, { mode: 'typescript' });
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
				});
			});

			describe('extensionless - shoud not work', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});
			});

			describe('directory - shoud not work', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);

					if (semver.satisfies(node.version, nodeSupportsImport)) {
						expect(nodeProcess.stderr).toMatch('Directory import');
					} else {
						expect(nodeProcess.stderr).toMatch('Cannot find module');
					}
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});
			});
		});

		describe('.js extension', ({ describe }) => {
			const output = 'loaded cjs-ext-js/index.js {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true}';

			describe('full path', ({ test }) => {
				const importPath = './lib/cjs-ext-js/index.js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
				});
			});

			describe('extensionless', ({ test }) => {
				const importPath = './lib/cjs-ext-js/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
				});

				/**
				 * Dynamic import was introduced in Node v12.20+ and v13.2+
				 * https://github.com/evanw/esbuild/blob/783527408b41bf55a6ac7ebb0b1ab4128a29417d/scripts/compat-table.js#L233
				 *
				 * For Node.js versions that support import, the esm-loader
				 * should be used.
				 *
				 * Alternatively, we can set the target to Node 11
				 * and transform the import to a require(). But
				 * this means other features will be transpiled.
				 */
				test('Import', async () => {
					const nodeProcess = await node.import(importPath);

					if (semver.satisfies(node.version, nodeSupportsImport)) {
						expect(nodeProcess.stderr).toMatch('Cannot find module');
					} else {
						expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					}
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
				});
			});

			describe('directory', ({ test }) => {
				const importPath = './lib/cjs-ext-js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);

					if (semver.satisfies(node.version, nodeSupportsImport)) {
						expect(nodeProcess.stderr).toMatch('Directory import');
					} else {
						expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					}
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
				});
			});
		});
	});
});
