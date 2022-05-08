import { describe } from 'manten';
import { createNode } from './utils/node-with-loader';

const nodeVersions = [
	'12.16.2', // Pre ESM import
	'12.22.11',
	...(
		process.env.CI
			? [
				'14.19.1',
				'16.14.2',
				'17.8.0',
			]
			: []
	),
];

(async () => {
	for (const nodeVersion of nodeVersions) {
		const node = await createNode(nodeVersion, './tests/fixtures');

		await describe(`Node ${node.version}`, ({ runTestSuite }) => {
			runTestSuite(
				// eslint-disable-next-line node/global-require,@typescript-eslint/no-var-requires
				(require('./specs/javascript') as typeof import('./specs/javascript')).default,
				node,
			);
			runTestSuite(
				// eslint-disable-next-line node/global-require,@typescript-eslint/no-var-requires
				(require('./specs/typescript') as typeof import('./specs/typescript')).default,
				node,
			);
		});
	}
})();
