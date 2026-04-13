import { useCallback, useState } from 'react';
import type { ParsedData, QixinConfig, QixinColumnMapping } from '../types';
import { generateQixinFileName } from '../lib/transform';

interface QixinConfigPanelProps {
  parsedData: ParsedData;
  config: QixinConfig;
  onConfigChange: (config: QixinConfig) => void;
  onBack: () => void;
  onNext: () => void;
}

const MAPPING_FIELDS: { key: keyof QixinColumnMapping; label: string }[] = [
  { key: 'nicknameColumn', label: 'D: 名称' },
  { key: 'wechatIdColumn', label: 'F: 微信号' },
  { key: 'remarkColumn', label: 'G: 备注' },
  { key: 'tagColumn', label: 'J: 标签' },
  { key: 'greetingColumn', label: 'O: 打招呼备注' },
];

export default function QixinConfigPanel({
  parsedData,
  config,
  onConfigChange,
  onBack,
  onNext,
}: QixinConfigPanelProps) {
  const [showMapping, setShowMapping] = useState(false);

  const canProceed =
    config.wechatNickname.trim() !== '' &&
    config.wechatId.trim() !== '';

  const fileName = generateQixinFileName(config.wechatNickname, config.wechatId);
  const { headers } = parsedData;

  const updateMapping = useCallback(
    (field: keyof QixinColumnMapping, value: string) => {
      onConfigChange({
        ...config,
        columnMapping: { ...config.columnMapping, [field]: value },
      });
    },
    [config, onConfigChange],
  );

  return (
    <div className="qixin-config">
      {/* Top bar: title + mapping toggle */}
      <div className="qixin-topbar">
        <label className="form-label form-label--step">
          填写发送账号信息
        </label>
        <button
          className="link-btn"
          onClick={() => setShowMapping(!showMapping)}
        >
          {showMapping ? '收起映射' : '修改映射规则'}
        </button>
      </div>

      {/* Mapping editor — top-level expand */}
      {showMapping && (
        <div className="qixin-mapping">
          {MAPPING_FIELDS.map(({ key, label }) => (
            <div className="dc-map-row" key={key}>
              <label className="dc-map-label">{label}</label>
              <select
                className="dc-map-select"
                value={config.columnMapping[key]}
                onChange={(e) => updateMapping(key, e.target.value)}
              >
                <option value="">(不映射)</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="config-form">
        {/* Account info */}
        <div className="form-field">
          <div className="qixin-fields">
            <div className="qixin-field">
              <label className="form-label">
                所属微信昵称
                <span className="form-required">*</span>
              </label>
              <input
                className={`form-input form-input--full ${config.wechatNickname.trim() === '' ? 'form-input--empty' : ''}`}
                value={config.wechatNickname}
                onChange={(e) =>
                  onConfigChange({ ...config, wechatNickname: e.target.value })
                }
                placeholder="例如：Yuki FBIF"
              />
            </div>
            <div className="qixin-field">
              <label className="form-label">
                所属微信号
                <span className="form-required">*</span>
              </label>
              <input
                className={`form-input form-input--full ${config.wechatId.trim() === '' ? 'form-input--empty' : ''}`}
                value={config.wechatId}
                onChange={(e) =>
                  onConfigChange({ ...config, wechatId: e.target.value })
                }
                placeholder="例如：FBIF-BD"
              />
            </div>
            <div className="qixin-field">
              <label className="form-label">类型</label>
              <input
                className="form-input form-input--full"
                value={config.contactType}
                onChange={(e) =>
                  onConfigChange({ ...config, contactType: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* File name preview */}
        {canProceed && (
          <div className="qixin-filename-hint">
            <span className="form-hint form-hint--ok">
              文件名：{fileName}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="config-actions">
          <button className="link-btn" onClick={onBack}>返回选择模板</button>
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
  );
}
