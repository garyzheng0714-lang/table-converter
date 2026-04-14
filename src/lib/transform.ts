import type { AppConfig, QixinConfig, QixinColumnMapping } from '../types.js';
import { wechatToUnicode } from './wechat-emoji-unicode.js';

/**
 * 清除 XML 1.0 非法控制字符（0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F）。
 * xlsx 内部是 XML，含有这些字符会导致 Excel 报"文件已损坏"。
 * 保留合法的 0x09(TAB)、0x0A(LF)、0x0D(CR)。
 */
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
export function sanitize(value: string): string {
  return value.replace(INVALID_XML_CHARS, '');
}

const SCRIPT_KEYS = ['话术1', '话术2', '话术3', '话术4', '话术5'] as const;

export function transformData(
  sourceRows: Record<string, string>[],
  config: AppConfig
): Record<string, string>[] {
  const { columnMapping, scripts } = config;
  const { customerIdColumn, customerNameColumn, nameForConcatColumn } = columnMapping;
  const scriptConfigs = SCRIPT_KEYS.map((_, index) => {
    const script = scripts[index];
    return {
      text: script?.text || '',
      prependName: !!script?.prependName,
    };
  });

  return sourceRows.map((row) => {
    const nameValue = sanitize(row[nameForConcatColumn] || '');
    const result: Record<string, string> = {
      客户编号: sanitize(row[customerIdColumn] || ''),
      '客户名称/微信号': sanitize(row[customerNameColumn] || ''),
    };

    for (let i = 0; i < SCRIPT_KEYS.length; i++) {
      const script = scriptConfigs[i];
      const text = wechatToUnicode(script.text);
      result[SCRIPT_KEYS[i]] =
        script.prependName && nameValue
          ? nameValue + '，' + text
          : text;
    }

    result['发送状态'] = '';
    result['发送时间'] = '';

    return result;
  });
}

export function generateFileName(wechatId: string): string {
  return `待发送名单表格_${wechatId || 'xxx'}_等待群发.xlsx`;
}

/* ---- Qixin (企信RPA) transform ---- */

const QIXIN_HEADERS = [
  '所属微信昵称', '所属微信号', '类型', '名称', '昵称', '微信号',
  '备注', '朋友权限', '个性签名', '标签', '描述', '电话',
  '来源', '地区', '打招呼自定义备注1', '打招呼自定义备注2',
  '打招呼自定义备注3', '打招呼自定义备注4', '打招呼自定义备注5',
  '打招呼自定义备注6',
] as const;

export function transformDataForQixin(
  sourceRows: Record<string, string>[],
  qixinConfig: QixinConfig,
  tagSuffix?: string
): Record<string, string>[] {
  const { wechatNickname, wechatId, contactType, columnMapping } = qixinConfig;
  const { nicknameColumn, wechatIdColumn, remarkColumn, greetingColumn } = columnMapping;
  const tagValue = tagSuffix != null ? `表格导入${tagSuffix}` : '表格导入';

  return sourceRows.map((row) => {
    const result: Record<string, string> = {};
    for (const h of QIXIN_HEADERS) result[h] = '';

    result['所属微信昵称'] = sanitize(wechatNickname);
    result['所属微信号'] = sanitize(wechatId);
    result['类型'] = sanitize(contactType);
    result['名称'] = sanitize(row[nicknameColumn] || '');
    result['微信号'] = sanitize(row[wechatIdColumn] || '');
    result['备注'] = sanitize(row[remarkColumn] || '');
    result['标签'] = tagValue;
    result['打招呼自定义备注1'] = sanitize(row[greetingColumn] || '');

    return result;
  });
}

export function generateQixinFileName(nickname: string, wechatId: string): string {
  return `企信RPA_${nickname || 'xxx'}_${wechatId || 'xxx'}_群发列表.xlsx`;
}

export function generateQixinSheetName(nickname: string): string {
  return `【${nickname || 'xxx'}】通讯录`;
}

/** Strip emoji and special markers from column names for matching */
function normalizeColumnName(name: string): string {
  return name
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[📌📋📊📄📁🔒✅❌⚠️💡✨👁]/g, '')
    .replace(/【[^】]*】/g, '')
    .trim();
}

/** Auto-detect column mappings from source headers */
export function autoDetectColumns(headers: string[]): {
  customerIdColumn: string;
  customerNameColumn: string;
  nameForConcatColumn: string;
} {
  const normalized = headers.map((h) => ({
    original: h,
    clean: normalizeColumnName(h),
  }));

  const findColumn = (keywords: string[]): string => {
    for (const kw of keywords) {
      const match = normalized.find((n) => n.clean.includes(kw));
      if (match) return match.original;
    }
    return headers[0] || '';
  };

  const findColumnOrEmpty = (keywords: string[]): string => {
    for (const kw of keywords) {
      const match = normalized.find((n) => n.clean.includes(kw));
      if (match) return match.original;
    }
    return '';
  };

  return {
    customerIdColumn: findColumn(['客户编号', '编号']),
    customerNameColumn: findColumn([
      '微信号',
      '客户名称',
      '备注名称',
      '昵称',
    ]),
    nameForConcatColumn: findColumnOrEmpty(['称呼订正']),
  };
}

/* ---- Filter / VLOOKUP matching ---- */

export interface FilterResult {
  matchedRows: Record<string, string>[];
  masterTotal: number;
  sentTotal: number;
  sentUniqueKeys: number;
  matchedCount: number;
  unmatchedSentKeys: number;
  masterDuplicateKeys: number;
}

export function filterByMatch(
  masterRows: Record<string, string>[],
  sentRows: Record<string, string>[],
  masterKeyColumn: string,
  sentKeyColumn: string,
): FilterResult {
  const sentKeys = new Set<string>();
  for (const row of sentRows) {
    const key = (row[sentKeyColumn] || '').trim();
    if (key) sentKeys.add(key);
  }

  const masterKeySeen = new Map<string, number>();
  const matchedRows: Record<string, string>[] = [];

  for (const row of masterRows) {
    const key = (row[masterKeyColumn] || '').trim();
    masterKeySeen.set(key, (masterKeySeen.get(key) || 0) + 1);
    if (key && sentKeys.has(key)) {
      matchedRows.push(row);
    }
  }

  let masterDuplicateKeys = 0;
  for (const [key, count] of masterKeySeen.entries()) {
    if (key !== '' && count > 1) masterDuplicateKeys++;
  }

  const masterKeySet = new Set(masterKeySeen.keys());
  let unmatchedSentKeys = 0;
  for (const key of sentKeys) {
    if (!masterKeySet.has(key)) unmatchedSentKeys++;
  }

  return {
    matchedRows,
    masterTotal: masterRows.length,
    sentTotal: sentRows.length,
    sentUniqueKeys: sentKeys.size,
    matchedCount: matchedRows.length,
    unmatchedSentKeys,
    masterDuplicateKeys,
  };
}

export function autoDetectKeyColumn(headers: string[]): string {
  const normalized = headers.map((h) => ({
    original: h,
    clean: normalizeColumnName(h),
  }));
  const keywords = ['微信号', 'wechat', 'wxid'];
  for (const kw of keywords) {
    const match = normalized.find((n) => n.clean.toLowerCase().includes(kw.toLowerCase()));
    if (match) return match.original;
  }
  return '';
}

/** Auto-detect Qixin column mappings from source headers */
export function autoDetectQixinColumns(headers: string[]): QixinColumnMapping {
  const normalized = headers.map((h) => ({
    original: h,
    clean: normalizeColumnName(h),
  }));

  const findColumnOrEmpty = (keywords: string[]): string => {
    for (const kw of keywords) {
      const match = normalized.find((n) => n.clean.includes(kw));
      if (match) return match.original;
    }
    return '';
  };

  return {
    nicknameColumn: findColumnOrEmpty(['昵称']),
    wechatIdColumn: findColumnOrEmpty(['微信号']),
    remarkColumn: findColumnOrEmpty(['备注名称', '备注']),
    tagColumn: findColumnOrEmpty(['标签', '所属标签']),
    greetingColumn: findColumnOrEmpty(['称呼订正']),
  };
}
