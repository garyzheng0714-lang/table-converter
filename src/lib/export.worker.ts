import type { AppConfig, QixinConfig } from '../types';
import { transformData, transformDataForQixin } from './transform';
import { writeExcelToArrayBuffer } from './excel';

interface ExportRequest {
  rows: Record<string, string>[];
  isQixin: boolean;
  config?: AppConfig;
  qixinConfig?: QixinConfig;
  sheetName?: string;
}

self.onmessage = (e: MessageEvent<ExportRequest>) => {
  const { rows, isQixin, config, qixinConfig, sheetName } = e.data;

  const transformed = isQixin
    ? transformDataForQixin(rows, qixinConfig!)
    : transformData(rows, config!);

  const buffer = writeExcelToArrayBuffer(transformed, { sheetName });

  (self as unknown as Worker).postMessage(buffer, [buffer]);
};
