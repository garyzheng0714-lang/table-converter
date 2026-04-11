import * as XLSX from 'xlsx';
import type { ParsedData } from '../types.js';

const MIN_COL_WIDTH = 10;
const MAX_COL_WIDTH = 40;
const HEADER_WIDTH_FACTOR = 2;
const VALUE_WIDTH_FACTOR = 1.5;
const DEFAULT_WIDTH_SAMPLE_SIZE = 5000;

export interface WriteExcelOptions {
  autoColumnWidth?: boolean;
  columnWidthSampleSize?: number;
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
    throw new Error('无法读取此文件，请确认是有效的 Excel 文件');
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
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return wb;
}

export function writeExcelToArrayBuffer(
  data: Record<string, string>[],
  options: WriteExcelOptions = {}
): ArrayBuffer {
  const wb = buildWorkbook(data, options);
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export async function writeExcel(
  data: Record<string, string>[],
  fileName: string,
  options: WriteExcelOptions = {}
): Promise<boolean> {
  // Must call showSaveFilePicker IMMEDIATELY on user click,
  // before any heavy computation, or the browser revokes the gesture.
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Excel 文件',
          accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        }],
      });
      // User picked a location — now build the data
      const wb = buildWorkbook(data, options);
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
      const writable = await handle.createWritable();
      await writable.write(buffer);
      await writable.close();
      return true;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      // API failed for other reason — fall through to regular download
    }
  }

  // Fallback: standard browser download (Safari/Firefox)
  const wb = buildWorkbook(data, options);
  XLSX.writeFile(wb, fileName);
  return true;
}
