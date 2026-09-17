import { runClassifyHttpUrlSuite } from './runClassify';
import { runRemarkHttpResourceCli } from './run';

const classifyOk = runClassifyHttpUrlSuite();
const { astOk } = runRemarkHttpResourceCli();
process.exit(classifyOk && astOk ? 0 : 1);
