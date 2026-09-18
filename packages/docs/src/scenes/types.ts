import type { MarkdownFeatures } from '@nnnb/markdown-ui';
import type { SceneId } from './constants';

export type { SceneId };

export type SceneGroup = 'story' | 'clip';

export type SceneShell = 'assistant' | 'article' | 'ticket';

export interface SceneMeta {
  id: SceneId;
  label: string;
  group: SceneGroup;
  shell: SceneShell;
  description: string;
  features: MarkdownFeatures;
  markdown: string;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface IntakeFormValue {
  name: string;
  urgent: boolean;
  reason: string;
  satisfaction: number;
}

export type IntakeValidation =
  | { ok: true }
  | { ok: false; message: string };

export type AttachmentPreviewModel =
  | { mode: 'image'; src: string; alt: string; failed: boolean }
  | { mode: 'file'; href: string; title: string; kind: string; ext: string };
