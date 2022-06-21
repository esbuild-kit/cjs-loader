import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader';
import nodeSupports from '../../utils/node-supports';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.cts extension', ({ describe }) => {
		const output = 'loaded ts-ext-cts/index.cts {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true,"import.meta.url":false}';
		const outputExport = `${output}\n{"default":1234}`;

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-cts/index.cts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import dynamic', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Unknown file extension');
				} else {
					expect(nodeProcess.stdout).toBe(outputExport);
				}
			});

			describe('Import static', ({ test }) => {
				test('from .js', async () => {
					const nodeProcess = await node.importStatic(importPath);
					expect(nodeProcess.stdout).toBe(outputExport);
				});

				test('from .ts', async () => {
					const nodeProcess = await node.importStatic(importPath, { extension: 'ts' });
					expect(nodeProcess.stdout).toBe(outputExport);
				});

				test('from .mts', async () => {
					const nodeProcess = await node.importStatic(importPath, { extension: 'mts' });
					expect(nodeProcess.stdout).toBe(outputExport);
				});
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(outputExport);
			});
		});

		describe('full path via .cjs', ({ test }) => {
			const importPath = './lib/ts-ext-cts/index.cjs';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath, { mode: 'typescript' });

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

		describe('extensionless - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-cts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});
		});

		describe('directory - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-cts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
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
});
