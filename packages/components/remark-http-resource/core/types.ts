/** 内置资源类型 */
export type BuiltinHttpResourceKind =
  | 'image'
  | 'document'
  | 'archive'
  | 'audio'
  | 'video'
  | 'webpage';

/** 内置 kind，或自定义回调返回的非空字符串 */
export type HttpResourceKind = BuiltinHttpResourceKind | (string & {});

/** 打在 link / image 上的分类结果 */
export type HttpResource = {
  kind: HttpResourceKind;
  /** 小写、无点；pathname 无后缀时为 null */
  ext: string | null;
  /** 用于分类的 URL（trim 后） */
  url: string;
};

/** 交给自定义回调的解析上下文 */
export type ClassifyContext = {
  protocol: 'http:' | 'https:';
  pathname: string;
  ext: string | null;
  url: string;
};

/** 自定义回调返回值 */
export type ClassifyResult =
  | HttpResourceKind
  | (Pick<HttpResource, 'kind'> & { ext?: string | null })
  | null
  | undefined;

/** remarkHttpResource / classifyHttpUrl 共用选项 */
export type HttpResourceOptions = {
  /**
   * 优先于扩展名表。
   * 返回 kind 或对象即采用；返回 null/undefined/空字符串则继续走表。
   *
   * @param url 当前 URL。
   * @param ctx 已解析的协议、pathname、ext。
   */
  classify?: (url: string, ctx: ClassifyContext) => ClassifyResult;
  /**
   * 追加或覆盖默认扩展名（无点或带点均可，内部归一成小写无点）。
   */
  extensions?: Partial<Record<BuiltinHttpResourceKind, string[]>>;
  /**
   * 默认 false。为 true 时把普通 text 中的 http(s) 绝对地址提升为 link 再打标。
   */
  promoteBareUrls?: boolean;
};
