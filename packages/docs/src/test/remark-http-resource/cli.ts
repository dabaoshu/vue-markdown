import { runClassifyHttpUrlSuite } from './runClassify';
import { REMARK_HTTP_RESOURCE_CASES } from './cases';
import { runRemarkHttpResourceCase } from './helpers';
import { runAstSuiteCli } from '../_shared/astUiHelpers';

const classifyOk = runClassifyHttpUrlSuite();
const astOk = runAstSuiteCli(
  'remark-http-resource',
  REMARK_HTTP_RESOURCE_CASES,
  runRemarkHttpResourceCase
);
process.exit(classifyOk && astOk ? 0 : 1);
