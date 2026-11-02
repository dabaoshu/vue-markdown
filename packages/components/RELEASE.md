# @nnnb/markdown 发版

仓库里的 `package.json` 入口保持源码（`./index.ts`），方便 monorepo 直接引用。pnpm 不会把 `publishConfig.exports` 写进 npm 包，所以发版时由 `scripts/package-json-publish.mjs` 临时改成 `dist`，传完再改回来。不要把改写后的 `package.json` 提交进 git。

## 发布

1. 在 `CHANGELOG.md` 把「未发布」改成新版本和日期。
2. 把 `packages/components/package.json` 的 `version` 改成新版本。已发布的版本不能覆盖，`1.1.3` 入口是坏的，下一版从 `1.1.4` 起。
3. 在 `packages/components` 执行：

```bash
pnpm release
```

这条命令会依次：构建 `dist`、把入口改成 `./dist/es/index.mjs`、上传到 npm、再把仓库入口恢复成 `./index.ts`。

4. 确认工作区里的 `package.json` 又指回 `./index.ts`，并且没有留下 `package.json.publish-backup`。
5. 提交版本号和变更日志。需要推远程时再推。

业务侧安装新版本：

```bash
pnpm add @nnnb/markdown@1.1.4
```

## 只检查、不上传

在 `packages/components` 执行：

```bash
pnpm pack --pack-destination $env:TEMP
```

压缩包里的 `exports["."].import` 应为 `./dist/es/index.mjs`。命令结束后，仓库里的入口应仍是 `./index.ts`。

## 发到一半中断

如果 `package.json` 停在 `dist` 入口，并且旁边有 `package.json.publish-backup`：

```bash
node ./scripts/package-json-publish.mjs restore
```

没有备份时，不要提交当前文件。按 git 里的源码入口手工改回 `main` / `exports`，版本号保留这次要发的号。
