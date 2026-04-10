export type ScriptType = 'text' | 'article';

export interface ScriptConfig {
  id: string;
  type: ScriptType;
  /** 纯文字时为话术内容；文章卡片时为 '收藏夹文章链接N' */
  text: string;
  /** 文章卡片选的编号 (1-9) */
  articleIndex: number;
  prependName: boolean;
}

export interface ColumnMapping {
  customerIdColumn: string;
  customerNameColumn: string;
  nameForConcatColumn: string;
}

export interface AppConfig {
  wechatId: string;
  columnMapping: ColumnMapping;
  scripts: ScriptConfig[];
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}
