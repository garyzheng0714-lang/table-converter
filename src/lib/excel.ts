import * as XLSX from 'xlsx';
import type { ParsedData } from '../types';

export function readExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: '',
          raw: false,
        });
        const headers = json.length > 0 ? Object.keys(json[0]) : [];
        resolve({ headers, rows: json });
      } catch {
        reject(new Error('无法读取此文件，请确认是有效的 Excel 文件'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败，请重试'));
    reader.readAsArrayBuffer(file);
  });
}

export function writeExcel(
  data: Record<string, string>[],
  fileName: string
): void {
  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length * 2,
      ...data.map((row) => (row[key] || '').length * 1.5)
    );
    return { wch: Math.min(Math.max(maxLen, 10), 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, fileName);
}
