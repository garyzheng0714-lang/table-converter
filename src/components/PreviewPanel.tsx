import { useMemo, useState } from 'react';
import type { AppConfig, ParsedData } from '../types';
import { transformData, generateFileName } from '../lib/transform';
import { writeExcel } from '../lib/excel';
import { renderWechatEmojiHTML } from '../lib/wechat-emoji';

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
    const saved = await writeExcel(transformedData, fileName);
    if (saved) setDownloaded(true);
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
        <div className="preview-download">
          <button
            className={`btn btn-primary btn-lg ${downloaded ? 'btn-downloaded' : ''}`}
            onClick={handleDownload}
          >
            {downloaded ? '再次下载' : '下载表格'}
          </button>
          <span className="preview-save-hint">
            请保存到 <code className="preview-save-path">D:\WechatGroupMessage v1.0.0.zip\待发送名单表格目录</code>
            <a
              className="preview-save-link"
              href="https://foodtalks.feishu.cn/wiki/UWPxwbCnOif7Zlkjy7RcgbKtn3c?sheet=6ea99f&rangeId=6ea99f_GLOeI7UPVC&rangeVer=1"
              target="_blank"
              rel="noopener noreferrer"
            >查看教程</a>
          </span>
        </div>
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
