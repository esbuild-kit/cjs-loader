import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader';
import nodeSupports from '../../utils/node-supports';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.ts extension', ({ describe }) => {
		const output = 'loaded ts-ext-ts/index.ts {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true,"import.meta.url":true}';

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			if (semver.satisfies(node.version, nodeSupports.sourceMap)) {
				test('Disables native source map if Error.prepareStackTrace is customized', async () => {
					const nodeProcess = await node.load(importPath, {
						nodeOptions: ['-r', 'source-map-support/register'],
					});
					expect(nodeProcess.stdout).toBe(output);
				});
			}

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Unknown file extension');
				} else {
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
			});
		});

		describe('full path via .js', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.js';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath, { mode: 'typescript' });

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, { typescript: true });
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
			});
		});

		describe('extensionless with subextension', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.tsx';
			const outputSubextension = 'loaded ts-ext-ts/index.tsx.ts {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true,"import.meta.url":true}';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(outputSubextension);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					expect(nodeProcess.stdout).toBe(`${outputSubextension}\n{"default":1234}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${outputSubextension}\n{"default":1234}`);
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Directory import');
				} else {
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
			});
		});
	});
});
