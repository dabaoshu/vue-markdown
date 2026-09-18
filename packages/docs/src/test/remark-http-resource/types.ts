import type { AstUiExpectation } from '../_shared/astUiTypes';
import type { HttpResource, HttpResourceOptions } from '../../../../components/remark-http-resource';

export type RemarkHttpResourceCaseGroup =
  | 'link'
  | 'image'
  | 'mix'
  | 'promote'
  | 'edge';

export interface HttpResourceNodeExpect {
  type: 'link' | 'image';
  kind: string;
  ext: string | null;
  urlIncludes?: string;
}

export interface RemarkHttpResourceExpectation {
  noThrow?: boolean;
  linkCount?: number;
  imageCount?: number;
  resources?: HttpResourceNodeExpect[];
  unannotatedLinkCount?: number;
  unannotatedImageCount?: number;
  contentIncludes?: string[];
  ui?: AstUiExpectation;
}

export interface RemarkHttpResourceTestCase {
  id: string;
  title: string;
  group: RemarkHttpResourceCaseGroup;
  description: string;
  markdown: string;
  gfm?: boolean;
  plugin?: boolean;
  options?: HttpResourceOptions;
  expect: RemarkHttpResourceExpectation;
}
