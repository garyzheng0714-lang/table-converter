import { useCallback, useMemo, useState } from 'react';
import type { AppConfig, ExportTemplate, ParsedData, QixinConfig } from '../types';
import {
  transformData,
  generateFileName,
  transformDataForQixin,
  generateQixinFileName,
  generateQixinSheetName,
} from '../lib/transform';
import { downloadBlob, downloadExcel } from '../lib/excel';
import { renderWechatEmojiHTML } from '../lib/wechat-emoji';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
  const [downloading, setDownloading] = useState(false);
  const isQixin = exportTemplate === 'qixin';
  const totalCount = parsedData.rows.length;

  // #8: Only transform first 10 rows for preview — not all data
  const previewData = useMemo(() => {
    const sample = parsedData.rows.slice(0, 10);
    if (isQixin) return transformDataForQixin(sample, qixinConfig);
    return transformData(sample, config);
  }, [parsedData.rows, isQixin, config, qixinConfig]);

  const fileName = isQixin
    ? generateQixinFileName(qixinConfig.wechatNickname, qixinConfig.wechatId)
    : generateFileName(config.wechatId);

  const displayColumns = useMemo(() => {
    if (isQixin) return Object.keys(previewData[0] || {});
    return [
      '客户编号',
      '客户名称/微信号',
      ...config.scripts.map((_, i) => `话术${i + 1}`),
      '发送状态',
      '发送时间',
    ];
  }, [isQixin, config.scripts, previewData]);

  const metaText = isQixin
    ? `${totalCount} 条数据 · 企信RPA格式`
    : `${totalCount} 条数据 · ${config.scripts.length} 条话术`;

  // #7: Download — try Web Worker to keep UI responsive, fallback to main thread
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    const sheetName = isQixin
      ? generateQixinSheetName(qixinConfig.wechatNickname)
      : undefined;

    try {
      // Try worker path (module workers supported in modern Chrome/Edge/Firefox)
      const worker = new Worker(
        new URL('../lib/export.worker.ts', import.meta.url),
        { type: 'module' },
      );

      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          resolve(e.data);
          worker.terminate();
        };
        worker.onerror = (err) => {
          reject(err);
          worker.terminate();
        };
        worker.postMessage({
          rows: parsedData.rows,
          isQixin,
          config: isQixin ? undefined : config,
          qixinConfig: isQixin ? qixinConfig : undefined,
          sheetName,
        });
      });

      const blob = new Blob([buffer], { type: XLSX_MIME });
      await downloadBlob(blob, fileName);
    } catch {
      // Fallback: worker unavailable (Safari <15, WebView, etc.) — run on main thread
      try {
        const allData = isQixin
          ? transformDataForQixin(parsedData.rows, qixinConfig)
          : transformData(parsedData.rows, config);
        await downloadExcel(allData, fileName, { sheetName });
      } catch {
        alert('下载失败，请重试');
      }
    } finally {
      setDownloading(false);
    }
  }, [parsedData.rows, isQixin, config, qixinConfig, fileName]);

  return (
    <div className="preview-page">
      <div className="preview-header">
        <div className="preview-header-info">
          <h2 className="preview-title">预览：{fileName}</h2>
          <span className="preview-meta">{metaText}</span>
        </div>
        <button
          className="btn btn-primary btn-lg"
          disabled={downloading}
          onClick={handleDownload}
        >
          {downloading ? '正在生成...' : '下载表格'}
        </button>
      </div>

      <section className="preview-table-section">
        <p className="preview-scroll-hint">按住 Shift + 鼠标滚轮 可左右滑动查看完整列</p>
        {previewData.length > 0 ? (
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
                {previewData.map((row, i) => (
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
        {totalCount > 10 && (
          <p className="preview-count">
            显示前 10 条，共 {totalCount} 条
          </p>
        )}
      </section>

      <div className="preview-actions">
        <button className="link-btn" onClick={onBack}>返回修改</button>
      </div>
    </div>
  );
}
