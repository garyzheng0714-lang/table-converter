import type { AppConfig } from '../types.js';
import { renderWechatEmoji } from './wechat-emoji.js';

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
    const nameValue = row[nameForConcatColumn] || '';
    const result: Record<string, string> = {
      客户编号: row[customerIdColumn] || '',
      '客户名称/微信号': row[customerNameColumn] || '',
    };

    for (let i = 0; i < SCRIPT_KEYS.length; i++) {
      const script = scriptConfigs[i];
      const text = renderWechatEmoji(script.text);
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

  return {
    customerIdColumn: findColumn(['客户编号', '编号']),
    customerNameColumn: findColumn([
      '微信号',
      '客户名称',
      '备注名称',
      '昵称',
    ]),
    nameForConcatColumn: findColumn(['称呼订正']),
  };
}
