# @nnnb/dev-runner

本地 Web 控制台，用于在仓库根目录（或任意含 `package.json` 的工程）启停 **npm scripts**，并实时查看终端日志。

独立 npm 包，不走 pnpm workspace。默认目标是仓库根，不要求必须放在 `packages/` 下。

> 仅限本机开发使用，不做鉴权与远程部署。

## 功能

- 启动 / 停止 / 重启目标工程 scripts
- 目标可切换：本仓库根、`packages/*`（若存在），或添加任意本机工程目录（需含 package.json）
- WebSocket 实时日志（类终端，保留 ANSI 着色）；重连只同步快照，日志按需拉取
- 从 Vite 输出自动解析端口，一键打开预览链接
- 清日志、复制日志
- 服务退出时自动清理子进程
- Header 显示当前 Git 分支 / commit，可切换本地或远程分支
- 「用户跳转」表格：多角色 accessToken + host/port，数据保存在 `user-jump.json`

## 目录结构

```
devRunner/
  server/
    index.ts          # HTTP / WS 入口
    types.ts
    config/           # 配置加载、路径解析
    runner/           # 启停脚本、包管理器检测
    target/           # 目标工程扫描与解析
    log/              # 日志缓冲、端口解析
    http/             # 监听地址、WebSocket、静态资源
    git/              # 分支信息
    store/            # 用户跳转等状态
  web/                # 控制台前端
  test/               # 与 server 同级的领域单测
  build.mjs
```

## 开发

```bash
cd devRunner
npm install
npm run dev        # 启动控制台
npm test           # 核心逻辑单测
npm run typecheck
npm run build
```

## 使用

在仓库根目录安装并启动（使用 npm，不使用 pnpm）：

```bash
npm --prefix ./devRunner install
npm run dev:runner
```

或进入目录：

```bash
cd devRunner
npm install
npm run dev
```

浏览器打开 [http://localhost:8787](http://localhost:8787)

## 打包（无运行时 npm 依赖）

把服务端与前端打成单个 JS（无 npm 运行时依赖，不引用 node_modules）：

```bash
npm --prefix ./devRunner run build
node devRunner/dist/index.js
```

或：

```bash
cd devRunner
npm run build
npm start
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
DEV_RUNNER_PACKAGE=.
```

`dev-runner.config.js` 示例：

```js
export default {
  root: 'D:/项目/vue-markdown',
  port: 8787,
  package: '.'
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
| `DEV_RUNNER_ROOT` | 工作区 / git 仓库根（扫描根目录与 packages、切分支） | 自动推断；否则 `cwd` |
| `DEV_RUNNER_PACKAGE` | 启动时目标（`.` 表示仓库根，或目录名、绝对路径） | 上次选择 / 仓库根 |
| `DEV_RUNNER_WEB` | 用磁盘上的前端目录，而不是内嵌页面 | 内嵌资源 |
| `DEV_RUNNER_PACKAGES` | packages 目录绝对路径（可选） | `$DEV_RUNNER_ROOT/packages` |
| `DEV_RUNNER_STATE` | `.target-package` 等状态文件目录 | 包目录 / `index.js` 旁 |
| `DEV_RUNNER_PORT` | 控制台端口 | `8787` |
| `DEV_RUNNER_PM` | 启停脚本用的包管理器：`auto` / `npm` / `pnpm` / `yarn` | `auto`（看 `packageManager` 字段与 lockfile） |

## 说明

- 按目标目录自动选择包管理器（`packageManager` 字段 / lockfile，可用 `DEV_RUNNER_PM` 强制）
- 默认在仓库根执行 scripts；也可切到 `packages/*` 或添加本机其它工程绝对路径
- 外部工程列表会记住；也可用环境变量指定启动路径：

```bash
# Windows PowerShell
$env:DEV_RUNNER_PACKAGE="D:\项目\other-app"; npm run dev:runner
# 仓库根
$env:DEV_RUNNER_PACKAGE="."; npm run dev:runner
# 或本仓库 packages 短名
$env:DEV_RUNNER_PACKAGE="simple"; npm run dev:runner
```

- 控制台 UI 为原生 HTML + ES Module + CSS，无构建步骤
- 用户跳转数据写在状态目录的 `user-jump.json`（默认与包/`index.js` 同级，可用 `DEV_RUNNER_STATE` 改路径）
- 默认控制台端口：`8787`
