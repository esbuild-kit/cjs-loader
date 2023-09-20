import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.tsx extension', ({ describe }) => {
		function assertResults(stdout: string) {
			expect(stdout).toMatch('loaded ts-ext-tsx/index.tsx');
			expect(stdout).toMatch('✔ has CJS context');
			expect(stdout).toMatch('✔ import.meta.url');
			expect(stdout).toMatch('✔ name in error');
			expect(stdout).toMatch('✔ sourcemaps');
			expect(stdout).toMatch('✔ has dynamic import');
			expect(stdout).toMatch('✔ resolves optional node prefix');
			expect(stdout).toMatch('✔ preserves names');
			expect(stdout).toMatch(
				semver.satisfies(node.version, nodeSupports.testRunner)
					? '✔ resolves required node prefix'
					: '✖ resolves required node prefix: Error',
			);
		}

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index.tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Unknown file extension');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('full path via js', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index.js';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, {
					typescript: true,
				});
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('full path via jsx', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index.jsx';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, {
					typescript: true,
				});
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Directory import');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});
	});
});
