import { memo, useState } from 'react';
import type { AppConfig, ParsedData } from '../types';

interface DataCardProps {
  parsedData: ParsedData;
  fileName: string;
  columnMapping: AppConfig['columnMapping'];
  onMappingChange: (
    field: keyof AppConfig['columnMapping'],
    value: string
  ) => void;
}

function DataCard({
  parsedData,
  fileName,
  columnMapping,
  onMappingChange,
}: DataCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editMapping, setEditMapping] = useState(false);
  const { headers, rows } = parsedData;

  const sampleId =
    rows.length > 0 ? rows[0][columnMapping.customerIdColumn] || '—' : '—';
  const sampleName =
    rows.length > 0 ? rows[0][columnMapping.customerNameColumn] || '—' : '—';

  return (
    <div className="dc">
      <div className="dc-top">
        <div className="dc-icon">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="4" y="2" width="28" height="32" rx="4" fill="#1D6F42" />
            <rect x="8" y="10" width="20" height="2" rx="1" fill="#fff" opacity=".3" />
            <rect x="8" y="15" width="20" height="2" rx="1" fill="#fff" opacity=".25" />
            <rect x="8" y="20" width="14" height="2" rx="1" fill="#fff" opacity=".2" />
            <rect x="8" y="25" width="10" height="2" rx="1" fill="#fff" opacity=".15" />
            <text x="18" y="9" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold" fontFamily="sans-serif">XLSX</text>
          </svg>
        </div>
        <div className="dc-info">
          <span className="dc-name">{fileName || '客户表格.xlsx'}</span>
          <span className="dc-meta">
            {rows.length} 条数据 · {headers.length} 列 · 已识别编号（{sampleId}）和名称（{sampleName}）
          </span>
        </div>
        <button className="link-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : '查看数据'}
        </button>
      </div>

      {expanded && (
        <div className="dc-detail">
          <div className="dc-table-wrap">
            <table className="dc-table">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {headers.map((h) => (
                      <td key={h}>{row[h] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dc-bottom">
            <span className="dc-bottom-text">
              共 {rows.length} 条 · 编号列：{columnMapping.customerIdColumn} · 名称列：{columnMapping.customerNameColumn}
            </span>
            <button className="link-btn link-btn--sm" onClick={() => setEditMapping(!editMapping)}>
              {editMapping ? '收起' : '修改识别'}
            </button>
          </div>

          {editMapping && (
            <div className="dc-mapping">
              {([
                ['customerIdColumn', '客户编号'],
                ['customerNameColumn', '客户名称'],
                ['nameForConcatColumn', '话术拼接名字'],
              ] as const).map(([field, label]) => (
                <div key={field} className="dc-map-row">
                  <label className="dc-map-label">{label}</label>
                  <select
                    className="dc-map-select"
                    value={columnMapping[field]}
                    onChange={(e) => onMappingChange(field, e.target.value)}
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(DataCard);
