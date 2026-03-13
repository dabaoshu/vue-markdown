import cpy from 'cpy';
import { resolve, dirname } from 'path';
import { promises as fs } from 'fs';
import glob from 'fast-glob';
import scss from 'sass';

// 定义路径常量
const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const LIB_DIR = resolve(DIST_DIR, 'lib');
const ES_DIR = resolve(DIST_DIR, 'es');
const SCSS_PATTERN = '**/*.scss';
// 定义排除目录
const EXCLUDE_DIRS = ['**/node_modules/**', '**/dist/**'];

/**
 * 复制SCSS文件到目标目录
 * @param {string} sourceGlob - SCSS文件glob模式
 * @param {string[]} ignorePatterns - 需要排除的glob模式
 * @returns {Promise<void>}
 */
const copyScssFiles = async (sourceGlob, ignorePatterns) => {
  console.log(`正在复制SCSS文件到构建目录...`);
  await Promise.all([
    cpy([sourceGlob], LIB_DIR, { ignore: ignorePatterns }),
    cpy([sourceGlob], ES_DIR, { ignore: ignorePatterns })
  ]);
  console.log('✅ SCSS文件复制成功');
};

/**
 * 编译SCSS文件为CSS并写入目标目录
 * @param {string[]} scssFiles - SCSS文件路径列表
 * @returns {Promise<void>}
 */
const compileScssFiles = async (scssFiles) => {
  console.log(`找到 ${scssFiles.length} 个SCSS文件需要编译`);
  const compileTasks = scssFiles.map(async (scssPath) => {
    try {
      const filePath = resolve(ROOT_DIR, scssPath);
      const scssCode = await fs.readFile(filePath, 'utf-8');

      // 编译SCSS到CSS
      const result = await scss.compileAsync(scssCode, {
        loadPaths: [ROOT_DIR, dirname(filePath)]
      });

      // 获取对应的CSS路径
      const cssPath = scssPath.replace('.scss', '.css');

      // 将编译后的CSS写入对应目录
      await Promise.all([
        fs.writeFile(resolve(LIB_DIR, cssPath), result.css),
        fs.writeFile(resolve(ES_DIR, cssPath), result.css)
      ]);

      console.log(`  - 编译成功: ${scssPath}`);
      return scssPath;
    } catch (error) {
      console.error(`  - 编译失败: ${scssPath} - ${error.message}`);
      throw error;
    }
  });

  await Promise.all(compileTasks);
  console.log('✅ SCSS文件编译成功');
};

/**
 * 构建SCSS文件
 * 1. 复制SCSS文件到目标目录
 * 2. 编译SCSS文件为CSS
 * 3. 将CSS写入到目标目录
 */
const buildScss = async () => {
  try {
    console.log('开始构建样式文件...');
    // 1. 复制SCSS文件到目标目录
    const scssSourceGlob = `${ROOT_DIR}/${SCSS_PATTERN}`;
    await copyScssFiles(scssSourceGlob, EXCLUDE_DIRS);

    // 2. 查找并编译SCSS文件
    const scssFiles = await glob(SCSS_PATTERN, {
      cwd: ROOT_DIR,
      onlyFiles: true,
      ignore: EXCLUDE_DIRS
    });

    if (scssFiles.length === 0) {
      console.log('没有找到需要编译的SCSS文件');
      return;
    }

    // 3. 编译SCSS文件
    await compileScssFiles(scssFiles);
  } catch (error) {
    console.error('构建样式文件失败:', error);
    process.exit(1);
  }
};

// 执行构建
buildScss()
  .then(() => console.log('🎉 样式文件构建完成!'))
  .catch((error) => {
    console.error('样式构建过程中发生错误:', error);
    process.exit(1);
  });
