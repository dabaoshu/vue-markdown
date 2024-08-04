import { refractor } from 'refractor';
import { toHtml } from 'hast-util-to-html';
import { visit } from 'unist-util-visit';
const getThemeStyle = () => {
  return '';
};
export const refractorToHtml = (
  code: string,
  options: any,
) => {
  const theme = options.theme;
  const language = options.language;
  // const themeTokenKeys=
  const transform = (node, index, parent) => {
    if (node.type === 'element') {
      node.properties.className.includes();
    }
  };
  const themeStyle = getThemeStyle();

  const tree = refractor.highlight(code, language);
  console.log('tree', tree);
  visit(tree, transform);
  return toHtml(tree, {});
};
