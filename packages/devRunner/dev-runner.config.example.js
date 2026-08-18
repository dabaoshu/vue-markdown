/**
 * @type {import('./server/config.ts').RunnerConfig}
 *
 * 复制为 dist 旁或 cwd 下的 `dev-runner.config.js` 后按需修改。
 * 系统环境变量优先级更高，文件只填充未设置的项。
 */
export default {
  root: 'D:/项目/vue-markdown',
  port: 8787,
  package: 'demo'
};
