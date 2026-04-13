import { useCallback, useState } from 'react';
import type { AppConfig, ExportTemplate, ParsedData, QixinConfig } from './types';
import { readExcel } from './lib/excel';
import { autoDetectColumns, autoDetectQixinColumns } from './lib/transform';
import FileUpload from './components/FileUpload';
import TemplateSelector from './components/TemplateSelector';
import ConfigPanel from './components/ConfigPanel';
import QixinConfigPanel from './components/QixinConfigPanel';
import PreviewPanel from './components/PreviewPanel';

type Step = 1 | 2 | 3;

const STEP_LABELS = ['上传文件', '配置信息', '预览下载'] as const;

function StepIndicator({ current, onGoTo }: { current: Step; onGoTo: (s: Step) => void }) {
  return (
    <div className="step-indicator">
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as Step;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        const clickable = isDone;
        return (
          <div
            key={stepNum}
            className={`step-item ${isActive ? 'step-active' : ''} ${isDone ? 'step-done' : ''} ${clickable ? 'step-clickable' : ''}`}
            onClick={() => { if (clickable) onGoTo(stepNum); }}
          >
            <div className="step-circle">
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8.5l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                stepNum
              )}
            </div>
            <span className="step-label">{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );
}

const initialConfig: AppConfig = {
  wechatId: '',
  columnMapping: {
    customerIdColumn: '',
    customerNameColumn: '',
    nameForConcatColumn: '',
  },
  scripts: [
    { id: '1', type: 'article', text: '收藏夹文章链接1', articleIndex: 1, prependName: false },
    { id: '2', type: 'text', text: '', articleIndex: 1, prependName: true },
  ],
};

const initialQixinConfig: QixinConfig = {
  wechatNickname: '',
  wechatId: '',
  contactType: '微信用户',
  columnMapping: {
    nicknameColumn: '',
    wechatIdColumn: '',
    remarkColumn: '',
    tagColumn: '',
    greetingColumn: '',
  },
};

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState('');
  const [exportTemplate, setExportTemplate] = useState<ExportTemplate | null>(null);
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [qixinConfig, setQixinConfig] = useState<QixinConfig>(initialQixinConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await readExcel(file);
      if (data.headers.length === 0) {
        setError('文件中没有找到表头，请检查文件格式');
        setIsLoading(false);
        return;
      }
      if (data.rows.length === 0) {
        setError('文件中只有表头没有数据，请检查文件是否包含客户信息');
        setIsLoading(false);
        return;
      }
      setParsedData(data);
      setFileName(file.name);

      // Auto-detect columns for both templates
      const yingdaoMapping = autoDetectColumns(data.headers);
      const qixinMapping = autoDetectQixinColumns(data.headers);

      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
      setConfig((prev) => ({
        ...prev,
        wechatId: nameWithoutExt,
        columnMapping: yingdaoMapping,
      }));
      setQixinConfig((prev) => ({
        ...prev,
        columnMapping: qixinMapping,
      }));

      // Stay on step 1 — show template selector
      setExportTemplate(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '文件读取失败，请重试'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTemplateSelect = useCallback((template: ExportTemplate) => {
    setExportTemplate(template);
    setStep(2);
  }, []);

  const handleRestart = useCallback(() => {
    setStep(1);
    setParsedData(null);
    setFileName('');
    setExportTemplate(null);
    setConfig(initialConfig);
    setQixinConfig(initialQixinConfig);
    setError(null);
  }, []);

  const handleGoTo = useCallback((s: Step) => {
    setStep(s);
  }, []);

  const isWide = step === 2 || step === 3;

  return (
    <div className={`app ${isWide ? 'app--wide' : ''}`}>
      <StepIndicator current={step} onGoTo={handleGoTo} />

      <main className="main-content">
        {step === 1 && !parsedData && (
          <div className="step-enter">
            <FileUpload
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}

        {step === 1 && parsedData && (
          <div className="step-enter">
            <TemplateSelector
              onSelect={handleTemplateSelect}
              onBack={handleRestart}
              rowCount={parsedData.rows.length}
            />
          </div>
        )}

        {step === 2 && parsedData && exportTemplate === 'yingdao' && (
          <div className="step-enter">
            <ConfigPanel
              parsedData={parsedData}
              fileName={fileName}
              config={config}
              onConfigChange={setConfig}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          </div>
        )}

        {step === 2 && parsedData && exportTemplate === 'qixin' && (
          <div className="step-enter">
            <QixinConfigPanel
              parsedData={parsedData}
              config={qixinConfig}
              onConfigChange={setQixinConfig}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          </div>
        )}

        {step === 3 && parsedData && exportTemplate && (
          <div className="step-enter">
            <PreviewPanel
              parsedData={parsedData}
              exportTemplate={exportTemplate}
              config={config}
              qixinConfig={qixinConfig}
              onBack={() => setStep(2)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
