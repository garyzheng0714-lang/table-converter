import type { AppConfig } from '../types';

export function transformData(
  sourceRows: Record<string, string>[],
  config: AppConfig
): Record<string, string>[] {
  const { columnMapping, scripts } = config;

  return sourceRows.map((row) => {
    const result: Record<string, string> = {};

    result['客户编号'] = row[columnMapping.customerIdColumn] || '';
    result['客户名称/微信号'] = row[columnMapping.customerNameColumn] || '';

    const nameValue = row[columnMapping.nameForConcatColumn] || '';

    for (let i = 0; i < 5; i++) {
      const key = `话术${i + 1}`;
      const script = scripts[i];
      if (script) {
        if (script.prependName && nameValue) {
          result[key] = nameValue + '，' + script.text;
        } else {
          result[key] = script.text;
        }
      } else {
        result[key] = '';
      }
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
    nameForConcatColumn: findColumn(['昵称', '备注名称', '名称']),
  };
}
