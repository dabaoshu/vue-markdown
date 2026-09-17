import { runClassifyHttpUrlSuite } from './runClassify';

const ok = runClassifyHttpUrlSuite();
process.exit(ok ? 0 : 1);
