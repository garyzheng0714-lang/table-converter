import { useCallback, useMemo, useState } from 'react';
import type { AppConfig, ExportTemplate, ParsedData, QixinConfig } from '../types';
import {
  transformData,
  generateFileName,
  transformDataForQixin,
  generateQixinFileName,
  generateQixinSheetName,
} from '../lib/transform';
import { downloadBlob, downloadExcel, writeExcelToArrayBuffer, fallbackDownload } from '../lib/excel';
import { renderWechatEmojiHTML } from '../lib/wechat-emoji';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DEFAULT_ROWS_PER_FILE = 1000;

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
  const [downloadProgress, setDownloadProgress] = useState('');
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [rowsPerFile, setRowsPerFile] = useState(DEFAULT_ROWS_PER_FILE);

  const isQixin = exportTemplate === 'qixin';
  const totalCount = parsedData.rows.length;

  const chunkCount = splitEnabled && rowsPerFile > 0
    ? Math.ceil(totalCount / rowsPerFile)
    : 1;
  const actualSplit = splitEnabled && chunkCount > 1;

  const previewData = useMemo(() => {
    const sample = parsedData.rows.slice(0, 10);
    if (isQixin) {
      const suffix = actualSplit ? '1' : undefined;
      return transformDataForQixin(sample, qixinConfig, suffix);
    }
    return transformData(sample, config);
  }, [parsedData.rows, isQixin, config, qixinConfig, actualSplit]);

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

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    const sheetName = isQixin
      ? generateQixinSheetName(qixinConfig.wechatNickname)
      : undefined;

    try {
      if (actualSplit) {
        const baseName = fileName.replace('.xlsx', '');

        for (let i = 0; i < chunkCount; i++) {
          setDownloadProgress(`${i + 1}/${chunkCount}`);
          const start = i * rowsPerFile;
          const chunk = parsedData.rows.slice(start, start + rowsPerFile);

          const chunkData = isQixin
            ? transformDataForQixin(chunk, qixinConfig, String(i + 1))
            : transformData(chunk, config);

          const buffer = writeExcelToArrayBuffer(chunkData, { sheetName });
          const blob = new Blob([buffer], { type: XLSX_MIME });
          fallbackDownload(blob, `${baseName}_${i + 1}.xlsx`);

          if (i < chunkCount - 1) {
            await new Promise(r => setTimeout(r, 300));
          }
        }
      } else {
        // Single file — use worker for large datasets
        try {
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
          try {
            const allData = isQixin
              ? transformDataForQixin(parsedData.rows, qixinConfig)
              : transformData(parsedData.rows, config);
            await downloadExcel(allData, fileName, { sheetName });
          } catch {
            alert('下载失败，请重试');
          }
        }
      }
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  }, [parsedData.rows, isQixin, config, qixinConfig, fileName, actualSplit, chunkCount, rowsPerFile]);

  const downloadButtonText = downloading
    ? (downloadProgress ? `正在下载 ${downloadProgress}...` : '正在生成...')
    : (actualSplit ? `下载表格（${chunkCount} 个文件）` : '下载表格');

  return (
    <div className="preview-page">
      <div className="preview-header">
        <div className="preview-header-info">
          <h2 className="preview-title">预览：{fileName}</h2>
          <span className="preview-meta">{metaText}</span>
        </div>
        <div className="download-area">
          <div className="split-settings">
            <label className="split-toggle">
              <input
                type="checkbox"
                checked={splitEnabled}
                onChange={(e) => setSplitEnabled(e.target.checked)}
              />
              拆分下载
            </label>
            {splitEnabled && (
              <>
                <span className="split-sep">·</span>
                <span className="split-label">每个表格</span>
                <input
                  type="number"
                  className="split-input"
                  value={rowsPerFile}
                  min={100}
                  max={10000}
                  step={100}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (v > 0) setRowsPerFile(v);
                  }}
                />
                <span className="split-label">行</span>
                {chunkCount > 1 && (
                  <span className="split-info">· 共 {chunkCount} 个文件</span>
                )}
              </>
            )}
          </div>
          <button
            className="btn btn-primary btn-lg"
            disabled={downloading}
            onClick={handleDownload}
          >
            {downloadButtonText}
          </button>
        </div>
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
