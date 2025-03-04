export const hasHtmlTag = (text: string, tag: string): boolean => {
  const regex = new RegExp(`<(${tag})[^>]*>.*?</\\1>`, 'i');
  return regex.test(text);
};

export const getStartTag = (text: string, tag: string): number => {
  const regex = new RegExp(`<${tag}[^>]*>`, 'i');
  const match = text.match(regex);
  return match ? match.index : -1;
};

export const getEndTag = (text: string, tag: string): number => {
  const regex = new RegExp(`</${tag}>`, 'i');
  const match = text.match(regex);
  return match ? match.index : -1;
};

export const sliceText = (text: string, tag: string) => {
  const startTagIndex = getStartTag(text, tag);
  const endTagIndex = getEndTag(text, tag);
  if (startTagIndex === -1 || endTagIndex === -1) {
    return text;
  }

  const startTagRegex = new RegExp(`<${tag}[^>]*>`, 'i');
  const endTagRegex = new RegExp(`</${tag}>`, 'i');

  const startTagMatch = text.match(startTagRegex);
  const endTagMatch = text.match(endTagRegex);

  if (!startTagMatch || !endTagMatch) {
    return undefined;
  }

  const startTag = startTagMatch[0];
  const endTag = endTagMatch[0];
  const before = text.slice(0, startTagIndex);
  const content = text.slice(startTagIndex + startTag.length, endTagIndex);
  const after = text.slice(endTagIndex + endTag.length);
  return [
    { type: 'text', value: before },
    { type: 'html', value: `${startTag}` },
    { type: 'text', value: content },
    { type: 'html', value: endTag },
    { type: 'paragraph', value: after }
  ];
};
