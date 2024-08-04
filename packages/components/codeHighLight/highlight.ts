import hljs, { HighlightOptions } from 'highlight.js';
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export const highlightTohtml = (
  code: string,
  options: HighlightOptions & {
    autoMatch: boolean;
  }
): string => {
  const { language, ignoreIllegals, autoMatch } = options;

  // No idea what language to use, return raw code
  const autodetect = autoMatch || !language;
  if (!hljs.getLanguage(language)) {
    console.warn(
      `The language "${language}" you specified could not be found.`
    );
    return escapeHtml(code);
  }
  if (autodetect) {
    const result = hljs.highlightAuto(code);
    return result.value;
  } else {
    const result = hljs.highlight(code, {
      language: language,
      ignoreIllegals: ignoreIllegals
    });
    return result.value;
  }
};

export const hljsGetLanguage = (language: string) => {
  return hljs.getLanguage(language);
};
