import { useCallback, useState } from 'react';
import type { AppConfig, ParsedData } from './types';
import { readExcel } from './lib/excel';
import { autoDetectColumns } from './lib/transform';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import PreviewPanel from './components/PreviewPanel';

type Step = 1 | 2 | 3;

const STEP_LABELS = ['上传文件', '配置信息', '预览下载'] as const;

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="step-indicator">
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as Step;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div
            key={stepNum}
            className={`step-item ${isActive ? 'step-active' : ''} ${isDone ? 'step-done' : ''}`}
          >
            <div className="step-circle">
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 8.5l3 3 5-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
  scripts: [{ id: '1', type: 'text', text: '', articleIndex: 1, prependName: false }],
};

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState('');
  const [config, setConfig] = useState<AppConfig>(initialConfig);
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
      const detected = autoDetectColumns(data.headers);
      setConfig((prev) => ({
        ...prev,
        columnMapping: detected,
      }));
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '文件读取失败，请重试'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRestart = useCallback(() => {
    setStep(1);
    setParsedData(null);
    setFileName('');
    setConfig(initialConfig);
    setError(null);
  }, []);

  return (
    <div className={`app ${step === 2 ? 'app--wide' : ''}`}>
      <StepIndicator current={step} />

      <main className="main-content">
        {step === 1 && (
          <div className="step-enter">
            <FileUpload
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}
        {step === 2 && parsedData && (
          <div className="step-enter">
            <ConfigPanel
              parsedData={parsedData}
              fileName={fileName}
              config={config}
              onConfigChange={setConfig}
              onBack={handleRestart}
              onNext={() => setStep(3)}
            />
          </div>
        )}
        {step === 3 && parsedData && (
          <div className="step-enter">
            <PreviewPanel
              parsedData={parsedData}
              config={config}
              onBack={() => setStep(2)}
              onRestart={handleRestart}
            />
          </div>
        )}
      </main>
    </div>
  );
}
