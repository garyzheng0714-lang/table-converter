import { useCallback, useMemo } from 'react';
import type { AppConfig, ExportTemplate, ParsedData, QixinConfig } from '../types';
import {
  transformData,
  generateFileName,
  transformDataForQixin,
  generateQixinFileName,
  generateQixinSheetName,
} from '../lib/transform';
import { downloadExcel } from '../lib/excel';
import { renderWechatEmojiHTML } from '../lib/wechat-emoji';

interface PreviewPanelProps {
  parsedData: ParsedData;
  exportTemplate: ExportTemplate;
  config: AppConfig;
  qixinConfig: QixinConfig;
  onBack: () => void;
}

export default function PreviewPanel({
  parsedData,
  exportTemplate,
  config,
  qixinConfig,
  onBack,
}: PreviewPanelProps) {
  const isQixin = exportTemplate === 'qixin';

  const transformedData = useMemo(() => {
    if (isQixin) {
      return transformDataForQixin(parsedData.rows, qixinConfig);
    }
    return transformData(parsedData.rows, config);
  }, [parsedData.rows, isQixin, config, qixinConfig]);

  const fileName = isQixin
    ? generateQixinFileName(qixinConfig.wechatNickname, qixinConfig.wechatId)
    : generateFileName(config.wechatId);

  const previewRows = useMemo(() => transformedData.slice(0, 10), [transformedData]);

  const displayColumns = useMemo(() => {
    if (isQixin) {
      return Object.keys(transformedData[0] || {});
    }
    return [
      '客户编号',
      '客户名称/微信号',
      ...config.scripts.map((_, i) => `话术${i + 1}`),
      '发送状态',
      '发送时间',
    ];
  }, [isQixin, config.scripts, transformedData]);

  const metaText = isQixin
    ? `${transformedData.length} 条数据 · 企信RPA格式`
    : `${transformedData.length} 条数据 · ${config.scripts.length} 条话术`;

  const handleDownload = useCallback(async () => {
    try {
      const sheetName = isQixin
        ? generateQixinSheetName(qixinConfig.wechatNickname)
        : undefined;
      await downloadExcel(transformedData, fileName, { sheetName });
    } catch {
      alert('下载失败，请重试');
    }
  }, [fileName, transformedData, isQixin, qixinConfig.wechatNickname]);

  return (
    <div className="preview-page">
      <div className="preview-header">
        <div className="preview-header-info">
          <h2 className="preview-title">预览：{fileName}</h2>
          <span className="preview-meta">{metaText}</span>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleDownload}
        >
          下载表格
        </button>
      </div>

      <section className="preview-table-section">
        <p className="preview-scroll-hint">按住 Shift + 鼠标滚轮 可左右滑动查看完整列</p>
        {previewRows.length > 0 ? (
          <div className="table-scroll table-scroll--visible">
            <table className="preview-table">
              <thead>
                <tr>
                  {displayColumns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {displayColumns.map((col) => (
                      <td
                        key={col}
                        className={
                          col.startsWith('话术') && row[col] ? 'cell-script' : ''
                        }
                      >
                        {row[col]
                          ? (col.startsWith('话术')
                            ? <span dangerouslySetInnerHTML={{ __html: renderWechatEmojiHTML(row[col]) }} />
                            : row[col])
                          : <span className="cell-empty">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="preview-empty">
            <p>原始表格中没有数据行</p>
          </div>
        )}
        {transformedData.length > 10 && (
          <p className="preview-count">
            显示前 10 条，共 {transformedData.length} 条
          </p>
        )}
      </section>

      <div className="preview-actions">
        <button className="link-btn" onClick={onBack}>返回修改</button>
      </div>
    </div>
  );
}
