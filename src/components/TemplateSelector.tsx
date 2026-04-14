import type { ExportTemplate } from '../types';

interface TemplateSelectorProps {
  onSelect: (template: ExportTemplate) => void;
  onBack: () => void;
  rowCount: number;
  sheetCount: number;
}

export default function TemplateSelector({
  onSelect,
  onBack,
  rowCount,
  sheetCount,
}: TemplateSelectorProps) {
  const canFilter = sheetCount >= 2;
  return (
    <div className="template-page">
      <div className="template-hero">
        <h2 className="template-title">选择导出模板</h2>
        <p className="template-subtitle">
          已读取 {rowCount} 条数据，请选择导出格式
        </p>
      </div>

      <div className="template-cards">
        <button
          className="template-card"
          onClick={() => onSelect('yingdao')}
        >
          <div className="template-card-icon">📱</div>
          <h3 className="template-card-title">手机端 · 影刀RPA点对点</h3>
          <p className="template-card-desc">
            配置群发话术，生成待发送名单表格
          </p>
        </button>

        <button
          className="template-card"
          onClick={() => onSelect('qixin')}
        >
          <div className="template-card-icon">💻</div>
          <h3 className="template-card-title">电脑端 · 企信RPA</h3>
          <p className="template-card-desc">
            导出通讯录格式，用于企信群发
          </p>
        </button>
        <button
          className={`template-card${canFilter ? '' : ' template-card--disabled'}`}
          onClick={() => { if (canFilter) onSelect('filter'); }}
          disabled={!canFilter}
        >
          <div className="template-card-icon">🔍</div>
          <h3 className="template-card-title">筛出未发送名单</h3>
          <p className="template-card-desc">
            {canFilter
              ? `双表 VLOOKUP 匹配筛选（${sheetCount} 个工作表）`
              : '需要含多个工作表的 Excel 文件'}
          </p>
        </button>
      </div>

      <div className="template-actions">
        <button className="link-btn" onClick={onBack}>重新上传</button>
      </div>
    </div>
  );
}
