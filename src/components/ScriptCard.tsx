import type { ScriptConfig, ScriptType } from '../types';

interface ScriptCardProps {
  script: ScriptConfig;
  index: number;
  sampleName: string;
  canDelete: boolean;
  onChange: (updated: ScriptConfig) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isOver: boolean;
}

const ORDINALS = ['第一', '第二', '第三', '第四', '第五'];
const ARTICLE_SLOTS = [1, 2, 3, 4, 5, 6];

export default function ScriptCard({
  script,
  index,
  sampleName,
  canDelete,
  onChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isOver,
}: ScriptCardProps) {
  const switchType = (type: ScriptType) => {
    if (type === script.type) return;
    if (type === 'article') {
      const idx = script.articleIndex || 1;
      onChange({
        ...script,
        type: 'article',
        text: `收藏夹文章链接${idx}`,
        articleIndex: idx,
        prependName: false,
      });
    } else {
      onChange({ ...script, type: 'text', text: '', prependName: false });
    }
  };

  const label = `发给客户的${ORDINALS[index] ?? `第${index + 1}`}条话术`;

  return (
    <div
      className={`sc ${isDragging ? 'sc--drag' : ''} ${isOver ? 'sc--over' : ''}`}
      onDragOver={onDragOver}
    >
      {/* Header */}
      <div className="sc-top">
        <div
          className="sc-grip"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="拖拽排序"
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
            <circle cx="2" cy="2" r="1.2" /><circle cx="6" cy="2" r="1.2" />
            <circle cx="2" cy="7" r="1.2" /><circle cx="6" cy="7" r="1.2" />
            <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
          </svg>
        </div>
        <span className="sc-label">{label}</span>

        <div className="sc-type-tabs">
          <button
            className={`sc-tab ${script.type === 'text' ? 'sc-tab--on' : ''}`}
            onClick={() => switchType('text')}
          >输入文字</button>
          <button
            className={`sc-tab ${script.type === 'article' ? 'sc-tab--on' : ''}`}
            onClick={() => switchType('article')}
          >发收藏文章</button>
        </div>

        {canDelete && (
          <button className="sc-del" onClick={onDelete} title="删除">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4.5 4.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Text mode */}
      {script.type === 'text' && (
        <div className="sc-body">
          <label className="sc-check">
            <input
              type="checkbox"
              checked={script.prependName}
              onChange={(e) => onChange({ ...script, prependName: e.target.checked })}
            />
            <span>在前面加上客户称呼</span>
            {script.prependName && (
              <span className="sc-check-eg">
                效果：{sampleName}，{script.text || '你输入的内容'}
              </span>
            )}
          </label>
          <textarea
            className="sc-textarea"
            value={script.text}
            onChange={(e) => onChange({ ...script, text: e.target.value })}
            placeholder={
              script.prependName
                ? '输入要发的内容，称呼和逗号会自动加在前面'
                : '输入要发送的文字内容'
            }
            rows={2}
          />
        </div>
      )}

      {/* Article mode */}
      {script.type === 'article' && (
        <div className="sc-body">
          <div className="sc-article-row">
            <span className="sc-article-label">发送收藏夹第</span>
            <div className="sc-slots">
              {ARTICLE_SLOTS.map((n) => (
                <button
                  key={n}
                  className={`sc-slot ${script.articleIndex === n ? 'sc-slot--on' : ''}`}
                  onClick={() => onChange({ ...script, articleIndex: n, text: `收藏夹文章链接${n}` })}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="sc-article-label">篇文章</span>
          </div>
          <p className="sc-note">如需给客户发送文章卡片，需先把文章保存到微信收藏夹</p>
        </div>
      )}
    </div>
  );
}
