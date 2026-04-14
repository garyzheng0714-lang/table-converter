import { useCallback } from 'react';
import type { FilterConfig, MultiSheetData } from '../types';
import { autoDetectKeyColumn } from '../lib/transform';

interface FilterConfigPanelProps {
  multiSheetData: MultiSheetData;
  filterConfig: FilterConfig;
  onConfigChange: (config: FilterConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

function SheetGroup({
  label,
  sheetNames,
  selectedSheetIndex,
  selectedColumn,
  headers,
  sampleValue,
  rowCount,
  onSheetChange,
  onColumnChange,
}: {
  label: string;
  sheetNames: string[];
  selectedSheetIndex: number;
  selectedColumn: string;
  headers: string[];
  sampleValue: string;
  rowCount: number;
  onSheetChange: (index: number) => void;
  onColumnChange: (column: string) => void;
}) {
  return (
    <div className="filter-sheet-group">
      <div className="filter-sheet-title">{label}</div>

      <label className="form-label">
        工作表
        <select
          className="form-input"
          value={selectedSheetIndex}
          onChange={(e) => onSheetChange(Number(e.target.value))}
        >
          {sheetNames.map((name, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="filter-sheet-meta">
        {rowCount} 行 · {headers.length} 列
      </div>

      <label className="form-label">
        匹配列（如微信号）
        <select
          className="form-input"
          value={selectedColumn}
          onChange={(e) => onColumnChange(e.target.value)}
        >
          <option value="">请选择列</option>
          {headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>

      {selectedColumn && sampleValue && (
        <div className="filter-sample">
          示例值: {sampleValue}
        </div>
      )}
    </div>
  );
}

export default function FilterConfigPanel({
  multiSheetData,
  filterConfig,
  onConfigChange,
  onBack,
  onNext,
}: FilterConfigPanelProps) {
  const { sheets } = multiSheetData;
  const sheetNames = sheets.map((s) => s.name);

  const masterSheet = sheets[filterConfig.masterSheetIndex];
  const sentSheet = sheets[filterConfig.sentSheetIndex];

  const masterSample =
    masterSheet?.data.rows[0]?.[filterConfig.masterKeyColumn] || '';
  const sentSample =
    sentSheet?.data.rows[0]?.[filterConfig.sentKeyColumn] || '';

  const sameSheet =
    filterConfig.masterSheetIndex === filterConfig.sentSheetIndex;

  const canProceed =
    sheets.length >= 2 &&
    !sameSheet &&
    filterConfig.masterKeyColumn !== '' &&
    filterConfig.sentKeyColumn !== '';

  const handleMasterSheetChange = useCallback(
    (index: number) => {
      const newHeaders = sheets[index]?.data.headers || [];
      onConfigChange({
        ...filterConfig,
        masterSheetIndex: index,
        masterKeyColumn: autoDetectKeyColumn(newHeaders),
      });
    },
    [sheets, filterConfig, onConfigChange],
  );

  const handleSentSheetChange = useCallback(
    (index: number) => {
      const newHeaders = sheets[index]?.data.headers || [];
      onConfigChange({
        ...filterConfig,
        sentSheetIndex: index,
        sentKeyColumn: autoDetectKeyColumn(newHeaders),
      });
    },
    [sheets, filterConfig, onConfigChange],
  );

  return (
    <div className="filter-config">
      <div className="template-hero">
        <h2 className="template-title">筛选配置</h2>
        <p className="template-subtitle">
          选择工作表和匹配列，按微信号等字段进行 VLOOKUP 匹配
        </p>
      </div>

      {sheets.length < 2 && (
        <div className="filter-error">
          此文件只有一个工作表，筛选功能需要至少两个工作表（总名单 + 待发送名单）
        </div>
      )}

      <SheetGroup
        label="总名单（主表）"
        sheetNames={sheetNames}
        selectedSheetIndex={filterConfig.masterSheetIndex}
        selectedColumn={filterConfig.masterKeyColumn}
        headers={masterSheet?.data.headers || []}
        sampleValue={masterSample}
        rowCount={masterSheet?.data.rows.length || 0}
        onSheetChange={handleMasterSheetChange}
        onColumnChange={(col) =>
          onConfigChange({ ...filterConfig, masterKeyColumn: col })
        }
      />

      <SheetGroup
        label="待发送名单（筛选依据）"
        sheetNames={sheetNames}
        selectedSheetIndex={filterConfig.sentSheetIndex}
        selectedColumn={filterConfig.sentKeyColumn}
        headers={sentSheet?.data.headers || []}
        sampleValue={sentSample}
        rowCount={sentSheet?.data.rows.length || 0}
        onSheetChange={handleSentSheetChange}
        onColumnChange={(col) =>
          onConfigChange({ ...filterConfig, sentKeyColumn: col })
        }
      />

      {sameSheet && sheets.length >= 2 && (
        <div className="filter-error">请选择不同的工作表</div>
      )}

      <div className="filter-hint">
        匹配规则：从「总名单」中查找每行的匹配列值，如果该值存在于「待发送名单」的匹配列中，则保留该行。未匹配的行将被过滤掉。
      </div>

      <div className="filter-actions">
        <button className="link-btn" onClick={onBack}>
          返回选择模板
        </button>
        <button
          className="btn btn-primary"
          disabled={!canProceed}
          onClick={onNext}
        >
          下一步：预览匹配结果
        </button>
      </div>
    </div>
  );
}
