import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { MultiSheetData, ParsedData } from '../types.js';

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

const MIN_COL_WIDTH = 10;
const MAX_COL_WIDTH = 40;
const HEADER_WIDTH_FACTOR = 2;
const VALUE_WIDTH_FACTOR = 1.5;
const DEFAULT_WIDTH_SAMPLE_SIZE = 5000;

export interface WriteExcelOptions {
  autoColumnWidth?: boolean;
  columnWidthSampleSize?: number;
  sheetName?: string;
}

function parseWorkbook(workbook: XLSX.WorkBook): ParsedData {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
    raw: false,
  });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  return { headers, rows: json };
}

export function parseExcelBuffer(input: ArrayBuffer | Uint8Array): ParsedData {
  try {
    const data = input instanceof Uint8Array ? input : new Uint8Array(input);
    const workbook = XLSX.read(data, { type: 'array', dense: true });
    return parseWorkbook(workbook);
  } catch {
    throw new Error('无法读取此文件，请确认是有效的 Excel 或 CSV 文件');
  }
}

export function readExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(parseExcelBuffer(e.target?.result as ArrayBuffer));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败，请重试'));
    reader.readAsArrayBuffer(file);
  });
}

function parseWorkbookAllSheets(workbook: XLSX.WorkBook): MultiSheetData {
  const sheets = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: '',
      raw: false,
    });
    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    return { name: sheetName, data: { headers, rows: json } };
  });
  return { sheets };
}

export function readExcelAllSheets(file: File): Promise<MultiSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const uint8 = new Uint8Array(data);
        const workbook = XLSX.read(uint8, { type: 'array', dense: true });
        resolve(parseWorkbookAllSheets(workbook));
      } catch {
        reject(new Error('无法读取此文件，请确认是有效的 Excel 文件'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败，请重试'));
    reader.readAsArrayBuffer(file);
  });
}

function computeColumnWidths(
  data: Record<string, string>[],
  sampleSize = DEFAULT_WIDTH_SAMPLE_SIZE
): XLSX.ColInfo[] {
  const keys = Object.keys(data[0] || {});
  if (keys.length === 0) return [];

  const maxLens = keys.map((key) =>
    Math.max(key.length * HEADER_WIDTH_FACTOR, MIN_COL_WIDTH)
  );
  const totalRows = data.length;
  const stride =
    sampleSize > 0 && totalRows > sampleSize
      ? Math.ceil(totalRows / sampleSize)
      : 1;

  for (let i = 0; i < totalRows; i += stride) {
    const row = data[i];
    for (let col = 0; col < keys.length; col++) {
      const key = keys[col];
      const cell = row[key];
      const cellWidth = String(cell || '').length * VALUE_WIDTH_FACTOR;
      if (cellWidth > maxLens[col]) {
        maxLens[col] = cellWidth;
      }
    }
  }

  return maxLens.map((len) => ({
    wch: Math.min(Math.max(len, MIN_COL_WIDTH), MAX_COL_WIDTH),
  }));
}

function buildWorkbook(
  data: Record<string, string>[],
  options: WriteExcelOptions = {}
): XLSX.WorkBook {
  const { autoColumnWidth = true, columnWidthSampleSize = DEFAULT_WIDTH_SAMPLE_SIZE } = options;
  const headers = Object.keys(data[0] || {});
  const aoa = new Array<string[]>(data.length + (headers.length > 0 ? 1 : 0));

  if (headers.length > 0) {
    aoa[0] = headers;
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const source = data[rowIndex];
      const target = new Array<string>(headers.length);
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const key = headers[colIndex];
        target[colIndex] = source[key] || '';
      }
      aoa[rowIndex + 1] = target;
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  if (autoColumnWidth && data.length > 0) {
    ws['!cols'] = computeColumnWidths(data, columnWidthSampleSize);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');
  return wb;
}

/**
 * 清理 SheetJS 生成的 xlsx 中多余的 metadata.xml（XLDAPR 动态数组元数据）。
 * WPS Office 和部分旧版 Excel 无法识别此元数据，会报"文件已损坏"。
 */
async function stripXlsxMetadata(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(buffer);

  if (!zip.files['xl/metadata.xml']) return buffer;

  zip.remove('xl/metadata.xml');

  // 清理 workbook.xml.rels 中的 metadata 引用
  const relsFile = zip.files['xl/_rels/workbook.xml.rels'];
  if (relsFile) {
    const relsContent = await relsFile.async('string');
    zip.file(
      'xl/_rels/workbook.xml.rels',
      relsContent.replace(/<Relationship[^>]*Target="metadata\.xml"[^>]*\/>/g, ''),
    );
  }

  // 清理 [Content_Types].xml 中的 metadata Override
  const ctFile = zip.files['[Content_Types].xml'];
  if (ctFile) {
    const ctContent = await ctFile.async('string');
    zip.file(
      '[Content_Types].xml',
      ctContent.replace(/<Override[^>]*metadata\.xml[^>]*\/>/g, ''),
    );
  }

  return zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export async function writeExcelToArrayBufferClean(
  data: Record<string, string>[],
  options: WriteExcelOptions = {},
): Promise<ArrayBuffer> {
  const wb = buildWorkbook(data, options);
  const raw = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return stripXlsxMetadata(raw);
}

export function writeExcelToArrayBuffer(
  data: Record<string, string>[],
  options: WriteExcelOptions = {}
): ArrayBuffer {
  const wb = buildWorkbook(data, options);
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function buildBlob(data: Record<string, string>[], options: WriteExcelOptions): Blob {
  const wb = buildWorkbook(data, options);
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([buffer], { type: XLSX_MIME });
}

export function fallbackDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 延迟释放 Blob URL，避免大文件下载未完成就被回收导致文件损坏
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Download Excel with native save-as picker when available.
 * Returns true if file was saved, false if user cancelled.
 */
export async function downloadExcel(
  data: Record<string, string>[],
  fileName: string,
  options: WriteExcelOptions = {}
): Promise<boolean> {
  const blob = buildBlob(data, options);

  // Try native File System Access API (Chrome/Edge)
  const picker = window.showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: fileName,
        types: [{
          description: 'Excel 文件',
          accept: { [XLSX_MIME]: ['.xlsx'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: unknown) {
      // User cancelled the picker
      if (err instanceof DOMException && err.name === 'AbortError') {
        return false;
      }
      // Other error — fall through to legacy download
    }
  }

  fallbackDownload(blob, fileName);
  return true;
}

/**
 * Download a pre-built Blob with native save-as picker when available.
 * Supports both xlsx and zip file types via optional fileType param.
 */
export async function downloadBlob(
  blob: Blob,
  fileName: string,
  fileType: 'xlsx' | 'zip' = 'xlsx',
): Promise<boolean> {
  const pickerTypes = fileType === 'zip'
    ? [{ description: 'ZIP 压缩包', accept: { 'application/zip': ['.zip'] } }]
    : [{ description: 'Excel 文件', accept: { [XLSX_MIME]: ['.xlsx'] } }];

  const picker = window.showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: fileName, types: pickerTypes });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return false;
      }
    }
  }
  fallbackDownload(blob, fileName);
  return true;
}

/** Legacy sync download (kept for backwards compatibility) */
export function writeExcel(
  data: Record<string, string>[],
  fileName: string,
  options: WriteExcelOptions = {}
): void {
  fallbackDownload(buildBlob(data, options), fileName);
}
