import { useCallback, useMemo, useState } from 'react';
import type { AppConfig, ParsedData } from '../types';
import { transformData, generateFileName } from '../lib/transform';
import { writeExcel } from '../lib/excel';
import { renderWechatEmojiHTML } from '../lib/wechat-emoji';

interface PreviewPanelProps {
  parsedData: ParsedData;
  config: AppConfig;
  onBack: () => void;
}

export default function PreviewPanel({
  parsedData,
  config,
  onBack,
}: PreviewPanelProps) {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  const transformedData = useMemo(
    () => transformData(parsedData.rows, config),
    [parsedData.rows, config]
  );

  const fileName = generateFileName(config.wechatId);
  const previewRows = useMemo(() => transformedData.slice(0, 10), [transformedData]);

  const displayColumns = useMemo(
    () => [
      '客户编号',
      '客户名称/微信号',
      ...config.scripts.map((_, i) => `话术${i + 1}`),
      '发送状态',
      '发送时间',
    ],
    [config.scripts]
  );

  const handleConfirmDownload = useCallback(async () => {
    setShowDownloadDialog(false);
    await writeExcel(transformedData, fileName);
  }, [fileName, transformedData]);

  return (
    <div className="preview-page">
      <div className="preview-header">
        <div className="preview-header-info">
          <h2 className="preview-title">预览：{fileName}</h2>
          <span className="preview-meta">
            {transformedData.length} 条数据 · {config.scripts.length} 条话术
          </span>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setShowDownloadDialog(true)}
        >
          下载表格
        </button>
      </div>

      {/* Download confirmation dialog */}
      {showDownloadDialog && (
        <div className="dl-overlay" onClick={() => setShowDownloadDialog(false)}>
          <div className="dl-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="dl-dialog-title">下载文件</h3>
            <p className="dl-dialog-text">请将文件保存到以下路径：</p>
            <code className="dl-dialog-path">
              D:\WechatGroupMessage v1.0.0.zip\待发送名单表格目录
            </code>
            <p className="dl-dialog-text">
              文件名：<strong>{fileName}</strong>
            </p>
            <div className="dl-dialog-actions">
              <a
                className="link-btn"
                href="https://foodtalks.feishu.cn/wiki/UWPxwbCnOif7Zlkjy7RcgbKtn3c?sheet=6ea99f&rangeId=6ea99f_GLOeI7UPVC&rangeVer=1"
                target="_blank"
                rel="noopener noreferrer"
              >
                查看教程
              </a>
              <div className="dl-dialog-btns">
                <button className="link-btn" onClick={() => setShowDownloadDialog(false)}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleConfirmDownload}>
                  确认下载
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
