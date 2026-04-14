import type { AppConfig, QixinConfig, QixinColumnMapping } from '../types.js';
import { wechatToUnicode } from './wechat-emoji-unicode.js';

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
  qixinConfig: QixinConfig
): Record<string, string>[] {
  const { wechatNickname, wechatId, contactType, columnMapping } = qixinConfig;
  const { nicknameColumn, wechatIdColumn, remarkColumn, greetingColumn } = columnMapping;

  return sourceRows.map((row) => {
    const result: Record<string, string> = {};
    for (const h of QIXIN_HEADERS) result[h] = '';

    result['所属微信昵称'] = wechatNickname;
    result['所属微信号'] = wechatId;
    result['类型'] = contactType;
    result['名称'] = row[nicknameColumn] || '';
    result['微信号'] = row[wechatIdColumn] || '';
    result['备注'] = row[remarkColumn] || '';
    result['标签'] = '表格导入';
    result['打招呼自定义备注1'] = row[greetingColumn] || '';

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
