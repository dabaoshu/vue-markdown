// import { factorySpace } from 'micromark-factory-space';
import { markdownLineEnding, whitespace } from 'micromark-util-character';

export function think() {
  return {
    // 定义一个新的 token 类型
    text: {
      tokenize: tokenizeThink,
      locate: locateThink
    }
  };
}

function locateThink(effects, ok, nok) {
  return (start) => {
    const self = this;
    const slice = self.sliceSubstring(start);
    const openTag = slice.startsWith('<think>');
    const closeTag = slice.startsWith('</think>');

    if (openTag) {
      effects.enter('thinkOpen');
      effects.consume(start + 6); // 消耗 '<think>' 的长度
      effects.exit('thinkOpen');
      return ok(start + 6);
    } else if (closeTag) {
      effects.enter('thinkClose');
      effects.consume(start + 7); // 消耗 '</think>' 的长度
      effects.exit('thinkClose');
      return ok(start + 7);
    }

    return nok(start);
  };
}

function tokenizeThink(effects, ok, nok) {
  const self = this;
  const slice = self.sliceSubstring(self.now().column);
  const openTag = slice.startsWith('<think>');
  const closeTag = slice.startsWith('</think>');

  if (openTag) {
    effects.enter('thinkOpen');
    effects.consume(6); // 消耗 '<think>' 的长度
    effects.exit('thinkOpen');
    return ok();
  } else if (closeTag) {
    effects.enter('thinkClose');
    effects.consume(7); // 消耗 '</think>' 的长度
    effects.exit('thinkClose');
    return ok();
  }

  return nok();
}



export function rehypeCustomThinkTag(options) {
  const tags = options.tags || [];
  const self = /** @type {Processor<Root>} */ (this)
  const data = this.data();
  console.log(data);

  return (tree) => {
    console.log("rehypeCustomThinkTag_tree", tree);

    // const processor = unified()
    //   .use(remarkRehype, {
    //     allowDangerousHtml: true
    //   })

    // const ktree = processor.runSync(tree);
    // console.log("ktree", ktree, "tree", tree);
    // const source = VFile.value as string;
    // if (tags) {
    //   tags.forEach((tag) => {
    //     if (hasHtmlTag(source, tag)) {
    //       console.log(`Found ${tag} tag in source`);
    //     }
    //   });
    // }
    // visit(tree, 'element', (node) => {
    //   console.log(node, tags);

    //   if (!tags.includes(node.tagName)) {
    //     node.type = 'text';
    //     node.value = node.children.map((child) => child.value).join('');
    //     node.children = [];
    //   }
    // });
  };
};


