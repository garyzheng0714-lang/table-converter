import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

// No module-level mutable counter — use crypto.randomUUID

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
  const configRef = useRef(config);
  configRef.current = config;

  const sampleName = useMemo(() => {
    if (rows.length === 0) return '张总';
    return rows[0][config.columnMapping.nameForConcatColumn] || '张总';
  }, [rows, config.columnMapping.nameForConcatColumn]);

  /* ---- Drag ---- */
  const dragIdx = useRef<number | null>(null);
  const overIdxRef = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    dragIdx.current = index;
    setDraggingIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    overIdxRef.current = index;
    setOverIdx(index);
  }, []);
  const handleDragEnd = useCallback(() => {
    const dropIndex = overIdxRef.current;
    if (dragIdx.current !== null && dropIndex !== null && dragIdx.current !== dropIndex) {
      const next = [...configRef.current.scripts];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(dropIndex, 0, moved);
      onConfigChange({ ...configRef.current, scripts: next });
    }
    dragIdx.current = null;
    overIdxRef.current = null;
    setDraggingIdx(null);
    setOverIdx(null);
  }, [onConfigChange]);

  /* ---- CRUD ---- */
  const updateMapping = useCallback((
    field: keyof AppConfig['columnMapping'],
    value: string
  ) => {
    const current = configRef.current;
    onConfigChange({
      ...current,
      columnMapping: { ...current.columnMapping, [field]: value },
    });
  }, [onConfigChange]);

  const updateScript = useCallback((index: number, updated: ScriptConfig) => {
    const current = configRef.current;
    const next = [...current.scripts];
    next[index] = updated;
    onConfigChange({ ...current, scripts: next });
  }, [onConfigChange]);

  const addScript = useCallback(() => {
    const current = configRef.current;
    if (current.scripts.length >= 5) return;
    onConfigChange({
      ...current,
      scripts: [
        ...current.scripts,
        {
          id: crypto.randomUUID(),
          type: 'text',
          text: '',
          articleIndex: 1,
          prependName: false,
        },
      ],
    });
  }, [onConfigChange]);

  const deleteScript = useCallback((index: number) => {
    const current = configRef.current;
    onConfigChange({
      ...current,
      scripts: current.scripts.filter((_, i) => i !== index),
    });
  }, [onConfigChange]);

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
          columnMapping={config.columnMapping}
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
              {config.wechatId && /[\u4e00-\u9fff]/.test(config.wechatId) && (
                <span className="form-hint form-hint--warn">微信号不应包含中文，请检查</span>
              )}

              {/* Confirmation popup */}
              {showConfirmPopup && (
                <div className="wechat-confirm">
                  <span className="wechat-confirm-id">{config.wechatId}</span>
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
                  canDelete={config.scripts.length > 1}
                  onChange={updateScript}
                  onDelete={deleteScript}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
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
