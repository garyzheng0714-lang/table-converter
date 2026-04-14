import { useCallback, useMemo, useState } from 'react';
import type { FilterConfig, MultiSheetData } from '../types';
import { filterByMatch, sanitize } from '../lib/transform';
import { downloadExcel } from '../lib/excel';

interface FilterPreviewPanelProps {
  multiSheetData: MultiSheetData;
  filterConfig: FilterConfig;
  onBack: () => void;
}

const PREVIEW_ROWS = 10;

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: 'success' | 'warn';
}) {
  const cls = variant ? `filter-stat filter-stat--${variant}` : 'filter-stat';
  return (
    <div className={cls}>
      <div className="filter-stat-value">{value.toLocaleString()}</div>
      <div className="filter-stat-label">{label}</div>
    </div>
  );
}

export default function FilterPreviewPanel({
  multiSheetData,
  filterConfig,
  onBack,
}: FilterPreviewPanelProps) {
  const [downloading, setDownloading] = useState(false);

  const masterSheet = multiSheetData.sheets[filterConfig.masterSheetIndex];
  const sentSheet = multiSheetData.sheets[filterConfig.sentSheetIndex];

  const result = useMemo(() => {
    if (!masterSheet || !sentSheet) return null;
    return filterByMatch(
      masterSheet.data.rows,
      sentSheet.data.rows,
      filterConfig.masterKeyColumn,
      filterConfig.sentKeyColumn,
    );
  }, [masterSheet, sentSheet, filterConfig.masterKeyColumn, filterConfig.sentKeyColumn]);

  if (!masterSheet || !sentSheet || !result) {
    return (
      <div className="filter-config">
        <div className="filter-error">工作表配置无效，请返回重新选择</div>
        <div className="filter-actions">
          <button className="link-btn" onClick={onBack}>返回修改配置</button>
        </div>
      </div>
    );
  }

  const masterHeaders = masterSheet.data.headers;
  const previewRows = result.matchedRows.slice(0, PREVIEW_ROWS);
  const hasResults = result.matchedCount > 0;

  const handleDownload = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const sanitizedRows = result.matchedRows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, sanitize(v)]),
        ),
      );
      await downloadExcel(
        sanitizedRows,
        `筛选结果_${result.matchedCount}条.xlsx`,
        { sheetName: '匹配结果' },
      );
    } finally {
      setDownloading(false);
    }
  }, [result]);

  return (
    <div className="filter-config">
      <div className="filter-preview-header">
        <div>
          <h2 className="template-title">匹配结果</h2>
          <p className="template-subtitle">
            以「{filterConfig.masterKeyColumn}」为匹配键
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={!hasResults || downloading}
          onClick={handleDownload}
        >
          {downloading ? '导出中...' : `下载表格（${result.matchedCount} 条）`}
        </button>
      </div>

      <div className="filter-stats">
        <StatCard label="总名单行数" value={result.masterTotal} />
        <StatCard label="待发送行数" value={result.sentTotal} />
        <StatCard
          label="匹配成功"
          value={result.matchedCount}
          variant="success"
        />
        <StatCard
          label="待发送中未匹配"
          value={result.unmatchedSentKeys}
          variant={result.unmatchedSentKeys > 0 ? 'warn' : undefined}
        />
      </div>

      {result.masterDuplicateKeys > 0 && (
        <div className="filter-warning">
          总名单中有 {result.masterDuplicateKeys} 个重复键值（同一键值出现多行），匹配时会保留所有重复行。
        </div>
      )}

      {!hasResults && (
        <div className="filter-error">
          未找到任何匹配数据，请检查匹配列选择是否正确。
        </div>
      )}

      {hasResults && (
        <div className="dc-table-wrap">
          <table className="dc-table">
            <thead>
              <tr>
                {masterHeaders.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i}>
                  {masterHeaders.map((h) => (
                    <td key={h}>{row[h] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasResults && result.matchedCount > PREVIEW_ROWS && (
        <p className="filter-preview-hint">
          显示前 {PREVIEW_ROWS} 条，共 {result.matchedCount.toLocaleString()} 条匹配
        </p>
      )}

      <div className="filter-actions">
        <button className="link-btn" onClick={onBack}>
          返回修改配置
        </button>
      </div>
    </div>
  );
}
