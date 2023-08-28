import { describe } from 'manten';
import { createNode } from './utils/node-with-loader.js';

const nodeVersions = [
	'12.16.2', // Pre ESM import
	// '12',
	...(
		process.env.CI
			? [
				'14',
				'16',
				'17',
				'18',
			]
			: []
	),
];

(async () => {
	for (const nodeVersion of nodeVersions) {
		const node = await createNode(nodeVersion, './tests/fixtures');

		console.log(node);
		await describe(`Node ${node.version}`, ({ runTestSuite }) => {
			runTestSuite(
				import('./specs/javascript/index.js'),
				node,
			);
			// runTestSuite(
			// 	import('./specs/typescript/index.js'),
			// 	node,
			// );
		});
	}
})();
