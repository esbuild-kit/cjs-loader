import { describe } from 'manten';
import { createNode } from './utils/node-with-loader.js';

const nodeVersions = [
	'12.16.2', // Pre ESM import
	'12.22.11',
	...(
		process.env.CI
			? [
				'14.19.1',
				'16.14.2',
				'17.8.0',
				'18.0.0',
			]
			: []
	),
];

(async () => {
	for (const nodeVersion of nodeVersions) {
		const node = await createNode(nodeVersion, './tests/fixtures');

		await describe(`Node ${node.version}`, ({ runTestSuite }) => {
			runTestSuite(
				import('./specs/javascript/index.js'),
				node,
			);
			runTestSuite(
				import('./specs/typescript/index.js'),
				node,
			);
		});
	}
})();
