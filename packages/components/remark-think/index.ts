import { fromMarkdownThink } from './fromMarkdownThink';
import { thinkSyntax } from './syntax';
import { ThinkFlowOption } from './type';

export function remarkThink(_options: ThinkFlowOption) {
  const tags = _options.tags || [];
  const options = {
    ..._options,
    customTags: tags
  };
  const data = this.data();
  console.log('options', options);

  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(thinkSyntax(options));
  // console.log('remarkThink', micromarkExtensions);

  // 添加 micromark 扩展
  // // 添加 mdast-util-from-markdown 扩展
  fromMarkdownExtensions.push(fromMarkdownThink(options));

  // return (tree) => {
  //   console.log('options', tree);
  // };
  // console.log(data);
}
