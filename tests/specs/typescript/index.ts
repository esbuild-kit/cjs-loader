import { testSuite } from 'manten';
import type { NodeApis } from '../../utils/node-with-loader';
import specTs from './ts';
import specTsx from './tsx';
import specJsx from './jsx';
import specMts from './mts';
import specCts from './cts';
import specTsconfig from './tsconfig';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('TypeScript', async ({ runTestSuite }) => {
		runTestSuite(specTs, node);
		runTestSuite(specTsx, node);
		runTestSuite(specJsx, node);
		runTestSuite(specMts, node);
		runTestSuite(specCts, node);
		runTestSuite(specTsconfig, node);
	});
});
