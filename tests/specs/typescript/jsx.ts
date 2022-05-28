import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader';
import { nodeSupportsImport } from '../../utils/node-supports-import';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.jsx extension', ({ describe }) => {
		const output = 'loaded ts-ext-jsx/index.jsx {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true}';

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index.jsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupportsImport)) {
					expect(nodeProcess.stderr).toMatch('Unknown file extension');
				} else {
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupportsImport)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-jsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				if (semver.satisfies(node.version, nodeSupportsImport)) {
					expect(nodeProcess.stderr).toMatch('Directory import');
				} else {
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});
		});
	});
});
