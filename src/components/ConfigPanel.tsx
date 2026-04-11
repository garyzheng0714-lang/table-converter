import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, ParsedData, ScriptConfig } from '../types';
import { generateFileName } from '../lib/transform';
import DataCard from './DataCard';
import ScriptCard from './ScriptCard';
import ChatPreview from './ChatPreview';

interface ConfigPanelProps {
  parsedData: ParsedData;
  fileName: string;
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

let scriptIdCounter = 10;

export default function ConfigPanel({
  parsedData,
  fileName,
  config,
  onConfigChange,
  onBack,
  onNext,
}: ConfigPanelProps) {
  const { rows } = parsedData;
  const genFileName = generateFileName(config.wechatId);

  const sampleName = useMemo(() => {
    if (rows.length === 0) return '张总';
    return rows[0][config.columnMapping.nameForConcatColumn] || '张总';
  }, [rows, config.columnMapping.nameForConcatColumn]);

  /* ---- Drag ---- */
  const dragIdx = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIdx.current = index;
    setDraggingIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(index);
  };
  const handleDragEnd = () => {
    if (dragIdx.current !== null && overIdx !== null && dragIdx.current !== overIdx) {
      const next = [...config.scripts];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx, 0, moved);
      onConfigChange({ ...config, scripts: next });
    }
    dragIdx.current = null;
    setDraggingIdx(null);
    setOverIdx(null);
  };

  /* ---- CRUD ---- */
  const updateMapping = (
    field: keyof AppConfig['columnMapping'],
    value: string
  ) => {
    onConfigChange({
      ...config,
      columnMapping: { ...config.columnMapping, [field]: value },
    });
  };

  const updateScript = (index: number, updated: ScriptConfig) => {
    const next = [...config.scripts];
    next[index] = updated;
    onConfigChange({ ...config, scripts: next });
  };

  const addScript = () => {
    if (config.scripts.length >= 5) return;
    onConfigChange({
      ...config,
      scripts: [
        ...config.scripts,
        {
          id: String(++scriptIdCounter),
          type: 'text',
          text: '',
          articleIndex: 1,
          prependName: false,
        },
      ],
    });
  };

  const deleteScript = (index: number) =>
    onConfigChange({
      ...config,
      scripts: config.scripts.filter((_, i) => i !== index),
    });

  /* ---- WeChat ID confirmation ---- */
  const [wechatConfirmed, setWechatConfirmed] = useState(false);
  const wechatInputRef = useRef<HTMLInputElement>(null);

  // Reset confirmation when wechatId changes
  useEffect(() => {
    setWechatConfirmed(false);
  }, [config.wechatId]);

  const showConfirmPopup = config.wechatId.trim() !== '' && !wechatConfirmed;

  const canProceed =
    config.wechatId.trim() !== '' &&
    wechatConfirmed &&
    config.scripts.some((s) => s.text.trim() !== '');

  return (
    <div className="config-layout">
      <div className="config-main">
        {/* Compact file bar */}
        <DataCard
          parsedData={parsedData}
          fileName={fileName}
          config={config}
          onMappingChange={updateMapping}
        />

        {/* Everything in one flowing form */}
        <div className="config-form">
          {/* WeChat ID — compact inline */}
          <div className="form-field">
            <label className="form-label form-label--step">
              第一步：填写发送人的微信号
              <span className="form-required">*</span>
            </label>
            <div className="form-row wechat-field">
              <input
                ref={wechatInputRef}
                className={`form-input ${config.wechatId.trim() === '' ? 'form-input--empty' : ''} ${wechatConfirmed ? 'form-input--ok' : ''}`}
                type="text"
                value={config.wechatId}
                onChange={(e) =>
                  onConfigChange({ ...config, wechatId: e.target.value })
                }
                placeholder="请填写微信号"
              />
              {wechatConfirmed && (
                <span className="form-hint form-hint--ok">已确认 · 文件名：{genFileName}</span>
              )}
              {!wechatConfirmed && config.wechatId.trim() === '' && (
                <span className="form-hint form-hint--warn">必填，用于生成文件名</span>
              )}

              {/* Confirmation popup */}
              {showConfirmPopup && (
                <div className="wechat-confirm">
                  <div className="wechat-confirm-arrow" />
                  <p className="wechat-confirm-text">
                    已从文件名自动提取，请确认微信号是否正确：
                  </p>
                  <p className="wechat-confirm-id">{config.wechatId}</p>
                  <div className="wechat-confirm-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => setWechatConfirmed(true)}
                    >
                      确认正确
                    </button>
                    <button
                      className="link-btn"
                      onClick={() => wechatInputRef.current?.focus()}
                    >
                      修改
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scripts */}
          <div className="form-field">
            <label className="form-label form-label--step">第二步：确认需要发送的消息格式</label>
            <div className="scripts-list">
              {config.scripts.map((script, i) => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  index={i}
                  sampleName={sampleName}
                  canDelete={config.scripts.length > 1}
                  onChange={(u) => updateScript(i, u)}
                  onDelete={() => deleteScript(i)}
                  onDragStart={handleDragStart(i)}
                  onDragOver={handleDragOver(i)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingIdx === i}
                  isOver={overIdx === i && draggingIdx !== i}
                />
              ))}
            </div>
            {config.scripts.length < 5 && (
              <button className="link-btn" onClick={addScript}>
                + 添加话术
              </button>
            )}
          </div>

          {/* Actions — next is the only primary */}
          <div className="config-actions">
            <button className="link-btn" onClick={onBack}>重新上传</button>
            <button
              className="btn btn-primary"
              disabled={!canProceed}
              onClick={onNext}
            >
              下一步：预览效果
            </button>
          </div>
        </div>
      </div>

      <aside className="config-sidebar">
        <ChatPreview scripts={config.scripts} sampleName={sampleName} />
      </aside>
    </div>
  );
}
