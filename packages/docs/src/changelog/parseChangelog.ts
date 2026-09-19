import type { ChangelogKind, ChangelogRelease } from './types';

const KIND_HEADING: Record<string, ChangelogKind> = {
  Added: 'added',
  Changed: 'changed',
  Fixed: 'fixed',
  Removed: 'removed'
};

/**
 * 是否为可展示的具体版本号（如 1.0.5），排除 Unreleased 等预告。
 *
 * @param label `## [label]` 中的标题
 */
export function isConcreteVersion(label: string): boolean {
  return /^\d+\.\d+\.\d+/.test(label.trim());
}

/**
 * 把版本标题收成可做锚点的 id。
 *
 * @param label 具体版本号，如 1.0.5
 */
export function changelogAnchorId(label: string): string {
  return label.trim().toLowerCase().replace(/[^\w.-]+/g, '-');
}

/**
 * 解析 Keep a Changelog 文本。只收带日期的具体版本，忽略 Unreleased 与「更早版本」。
 *
 * @param markdown 根目录 CHANGELOG.md 全文
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const releases: ChangelogRelease[] = [];
  let current: ChangelogRelease | null = null;
  let currentKind: ChangelogKind | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const versionMatch = line.match(
      /^## \[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*$/
    );
    if (versionMatch) {
      currentKind = null;
      const label = versionMatch[1];
      const date = versionMatch[2];
      if (!isConcreteVersion(label) || !date) {
        current = null;
        continue;
      }
      current = {
        id: changelogAnchorId(label),
        label,
        date,
        items: [],
        note: null
      };
      releases.push(current);
      continue;
    }

    if (/^## /.test(line)) {
      current = null;
      currentKind = null;
      continue;
    }

    const kindMatch = line.match(/^### (Added|Changed|Fixed|Removed)\s*$/);
    if (kindMatch && current) {
      const mapped = KIND_HEADING[kindMatch[1]];
      currentKind = mapped ?? null;
      continue;
    }

    const bulletMatch = line.match(/^- (.+)$/);
    if (bulletMatch && current && currentKind) {
      current.items.push({
        kind: currentKind,
        text: bulletMatch[1].trim()
      });
      continue;
    }

    const text = line.trim();
    if (
      current &&
      text &&
      !text.startsWith('#') &&
      current.items.length === 0 &&
      currentKind === null
    ) {
      current.note = current.note ? `${current.note}\n${text}` : text;
    }
  }

  return releases;
}

/**
 * 把条目里的反引号切成文本 / 行内代码片段。
 *
 * @param text 条目正文
 */
export function splitInlineCode(
  text: string
): Array<{ type: 'text' | 'code'; value: string }> {
  const parts: Array<{ type: 'text' | 'code'; value: string }> = [];
  const chunks = text.split(/(`[^`]+`)/g);
  for (const chunk of chunks) {
    if (!chunk) {
      continue;
    }
    if (chunk.startsWith('`') && chunk.endsWith('`') && chunk.length >= 2) {
      parts.push({ type: 'code', value: chunk.slice(1, -1) });
      continue;
    }
    parts.push({ type: 'text', value: chunk });
  }
  return parts;
}
