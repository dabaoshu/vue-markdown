# @nnnb/dev-runner

本地 Web 控制台，用于启停 monorepo `packages/*` 目标包的 npm scripts，并实时查看终端日志。

> 仅限本机开发使用，不做鉴权与远程部署。

## 功能

- 启动 / 停止 / 重启目标包 scripts
- 目标包可切换：本仓库 `packages/*`，或添加任意本机工程目录（需含 package.json）
- WebSocket 实时日志（类终端，保留 ANSI 着色）
- 从 Vite 输出自动解析端口，一键打开预览链接
- 清日志、复制日志
- 服务退出时自动清理子进程
- Header 显示当前 Git 分支 / commit，可切换本地或远程分支
- 「用户跳转」表格：多角色 accessToken + host/port，数据保存在 `user-jump.json`

## 使用

在仓库根目录：

```bash
pnpm install
pnpm dev:runner
```

或：

```bash
pnpm --filter @nnnb/dev-runner dev
```

浏览器打开 [http://localhost:8787](http://localhost:8787)

## 打包（无运行时 npm 依赖）

把服务端与前端打成单个 JS（无 npm 运行时依赖，不引用 node_modules）：

```bash
pnpm --filter @nnnb/dev-runner build
node packages/devRunner/dist/index.js
```

或：

```bash
pnpm --filter @nnnb/dev-runner start
```

拷走整个 `dist/` 即可发布：

```
dist/
  index.js
  web/          # 前端页面
  .env.example
  dev-runner.config.example.js
```

`.env` 示例：

```env
DEV_RUNNER_ROOT=D:\项目\vue-markdown
DEV_RUNNER_PORT=8787
DEV_RUNNER_PACKAGE=demo
```

`dev-runner.config.js` 示例：

```js
export default {
  root: 'D:/项目/vue-markdown',
  port: 8787,
  package: 'demo'
};
```

也可用 `DEV_RUNNER_CONFIG` 指定配置文件：

```bash
$env:DEV_RUNNER_CONFIG="D:\tools\dev-runner.config.js"
node dist/index.js
```

优先级：系统环境变量 > JS 配置 > `.env` > 默认推断。

包内有模板：`.env.example`、`dev-runner.config.example.js`。

| 变量 | 作用 | 默认 |
|------|------|------|
| `DEV_RUNNER_ROOT` | 工作区 / git 仓库根（扫描 packages、切分支） | 自动推断；否则 `cwd` |
| `DEV_RUNNER_PACKAGE` | 启动时目标包（目录名或绝对路径） | 上次选择 / `demo` |
| `DEV_RUNNER_WEB` | 用磁盘上的前端目录，而不是内嵌页面 | 内嵌资源 |
| `DEV_RUNNER_PACKAGES` | packages 目录绝对路径 | `$DEV_RUNNER_ROOT/packages` |
| `DEV_RUNNER_STATE` | `.target-package` 等状态文件目录 | 包目录 / `index.js` 旁 |
| `DEV_RUNNER_PORT` | 控制台端口 | `8787` |

## 说明

- 目标包可切换：本仓库 `packages/*`，或添加本机其它工程绝对路径
- 外部工程列表会记住；也可用环境变量指定启动路径：

```bash
# Windows PowerShell
$env:DEV_RUNNER_PACKAGE="D:\项目\other-app"; pnpm dev:runner
# 或本仓库短名
$env:DEV_RUNNER_PACKAGE="simple"; pnpm dev:runner
```

- 控制台 UI 为原生 HTML + ES Module + CSS，无构建步骤
- 用户跳转数据写在状态目录的 `user-jump.json`（默认与包/`index.js` 同级，可用 `DEV_RUNNER_STATE` 改路径）
- 默认控制台端口：`8787`
