import { useMemo, useState } from 'react';
import type { AppConfig, ParsedData } from '../types';
import { transformData, generateFileName } from '../lib/transform';
import { writeExcel } from '../lib/excel';

interface PreviewPanelProps {
  parsedData: ParsedData;
  config: AppConfig;
  onBack: () => void;
  onRestart: () => void;
}

export default function PreviewPanel({
  parsedData,
  config,
  onBack,
}: PreviewPanelProps) {
  const [downloaded, setDownloaded] = useState(false);

  const transformedData = useMemo(
    () => transformData(parsedData.rows, config),
    [parsedData.rows, config]
  );

  const fileName = generateFileName(config.wechatId);
  const previewRows = transformedData.slice(0, 10);

  // Only show columns that are actually configured
  const displayColumns = [
    '客户编号',
    '客户名称/微信号',
    ...config.scripts.map((_, i) => `话术${i + 1}`),
    '发送状态',
    '发送时间',
  ];

  const handleDownload = async () => {
    await writeExcel(transformedData, fileName);
    setDownloaded(true);
  };

  return (
    <div className="preview-page">
      {/* Download CTA — always visible at top */}
      <div className="preview-header">
        <div className="preview-header-info">
          <h2 className="preview-title">预览：{fileName}</h2>
          <span className="preview-meta">
            {transformedData.length} 条数据 · {config.scripts.length} 条话术
          </span>
        </div>
        <button
          className={`btn btn-primary btn-lg ${downloaded ? 'btn-downloaded' : ''}`}
          onClick={handleDownload}
        >
          {downloaded ? '再次下载' : '下载表格'}
        </button>
      </div>

      {downloaded && (
        <div className="download-success">
          文件已开始下载，请查看浏览器底部的下载栏
        </div>
      )}

      {/* Table preview */}
      <section className="preview-table-section">
        {previewRows.length > 0 ? (
          <div className="table-scroll">
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
                          col.startsWith('话术') && row[col]
                            ? 'cell-script'
                            : ''
                        }
                      >
                        {row[col] || <span className="cell-empty">—</span>}
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
