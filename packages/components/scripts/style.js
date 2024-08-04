import cpy from 'cpy';
import { resolve, dirname } from 'path';
import { promises as fs } from 'fs';
import glob from 'fast-glob';
import scss from 'sass';
const sourceDir = resolve(__dirname, './');
//lib文件
const targetLib = resolve(__dirname, '../lib');
//es文件
const targetEs = resolve(__dirname, '../es');

const srcDir = resolve(__dirname, './');
const buildLess = async () => {
  await cpy(`${sourceDir}/**/*.scss`, targetLib);
  await cpy(`${sourceDir}/**/*.scss`, targetEs);

  //获取打包后.less文件目录(lib和es一样)
  const scssFiles = await glob('**/*.scss', { cwd: srcDir, onlyFiles: true });
  console.log('scssFiles', `${sourceDir}/**/*.scss`);
  //遍历含有less的目录
  for (let path in scssFiles) {
    const filePath = `${srcDir}/${scssFiles[path]}`;
    //获取less文件字符串
    const scssCode = await fs.readFile(filePath, 'utf-8');
    //将less解析成css

    const code = await scss.compileAsync(scssCode, {
      //指定src下对应less文件的文件夹为目录
      loadPaths: [srcDir, dirname(filePath)]
    });
    console.log(code);
    //拿到.css后缀path
    const cssPath = scssFiles[path].replace('.less', '.css');

    //将css写入对应目录
    await fs.writeFile(resolve(targetLib, cssPath), code.css);
    await fs.writeFile(resolve(targetEs, cssPath), code.css);
  }
};
scss.compileAsync;
buildLess();
