import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader';
import { nodeSupportsImport } from '../../utils/node-supports-import';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.cts extension', ({ describe }) => {
		const output = 'loaded ts-ext-cts/index.cts {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true}';

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-cts/index.cts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupportsImport)) {
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

		describe('full path via .cjs', ({ test }) => {
			const importPath = './lib/ts-ext-cts/index.cjs';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath, { mode: 'typescript' });

				if (semver.satisfies(node.version, nodeSupportsImport)) {
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
				const nodeProcess = await node.import(importPath);
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
});
