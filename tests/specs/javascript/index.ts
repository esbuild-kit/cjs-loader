import { testSuite } from 'manten';
import type { NodeApis } from '../../utils/node-with-loader';
import specCjs from './cjs';
import specEsm from './esm';
import specDependencies from './dependencies';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('JavaScript', ({ runTestSuite }) => {
		runTestSuite(specCjs, node);
		// runTestSuite(specEsm, node);
		// runTestSuite(specDependencies, node);
	});
});
