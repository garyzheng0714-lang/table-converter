import { useCallback, useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export default function FileUpload({
  onFileSelected,
  isLoading,
  error,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFormatError(null);
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
        setFormatError('不支持该格式，请选择 .xlsx、.xls 或 .csv 文件');
        return;
      }
      const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
      if (file.size > MAX_SIZE) {
        setFormatError('文件过大（超过 10 GB），请检查是否选对了文件');
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="upload-page">
      <div className="upload-hero">
        <h1 className="upload-title">群发名单整理助手</h1>
        <p className="upload-subtitle">
          上传导出的客户表格，几步操作生成可直接群发的名单
        </p>
      </div>

      <div
        className={`drop-zone ${isDragging ? 'drop-zone--active' : ''} ${isLoading ? 'drop-zone--loading' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          style={{ display: 'none' }}
        />

        {isLoading ? (
          <div className="drop-zone-content">
            <div className="loading-spinner" />
            <p className="dz-text">正在读取文件...</p>
          </div>
        ) : (
          <div className="drop-zone-content">
            <div className="dz-icon">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <rect x="8" y="4" width="36" height="44" rx="6" fill="currentColor" opacity=".08" />
                <rect x="8" y="4" width="36" height="44" rx="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3" />
                <rect x="14" y="16" width="24" height="3" rx="1.5" fill="currentColor" opacity=".15" />
                <rect x="14" y="22" width="18" height="3" rx="1.5" fill="currentColor" opacity=".12" />
                <rect x="14" y="28" width="20" height="3" rx="1.5" fill="currentColor" opacity=".09" />
                <circle cx="38" cy="38" r="10" fill="#6366F1" opacity=".12" />
                <path d="M38 33v10m-4-4l4-4 4 4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="dz-text">
              {isDragging ? '松开鼠标，开始读取' : '点击选择文件，或拖拽到此处'}
            </p>
            <p className="dz-hint">支持 .xlsx、.xls、.csv 格式</p>
          </div>
        )}
      </div>

      {(error || formatError) && (
        <div className="upload-error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.5" />
            <path d="M8 5v3.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r=".8" fill="#DC2626" />
          </svg>
          <span>{formatError || error}</span>
        </div>
      )}

      <p className="upload-footnote">所有数据仅在您的电脑本地处理，不会上传</p>
      <p className="upload-version">v1.1.5 · 更新于 2026-04-14</p>
    </div>
  );
}
