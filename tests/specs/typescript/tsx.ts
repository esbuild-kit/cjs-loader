import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader';
import nodeSupports from '../../utils/node-supports';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.tsx extension', ({ describe }) => {
		const output = 'loaded ts-ext-tsx/index.tsx {"nodePrefix":true,"hasDynamicImport":true,"nameInError":true,"sourceMap":true,"import.meta.url":true}';

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index.tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
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
			const importPath = './lib/ts-ext-tsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
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
			const importPath = './lib/ts-ext-tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
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
