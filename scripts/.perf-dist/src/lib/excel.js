import * as XLSX from 'xlsx';
const MIN_COL_WIDTH = 10;
const MAX_COL_WIDTH = 40;
const HEADER_WIDTH_FACTOR = 2;
const VALUE_WIDTH_FACTOR = 1.5;
const DEFAULT_WIDTH_SAMPLE_SIZE = 5000;
function parseWorkbook(workbook) {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false,
    });
    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    return { headers, rows: json };
}
export function parseExcelBuffer(input) {
    try {
        const data = input instanceof Uint8Array ? input : new Uint8Array(input);
        const workbook = XLSX.read(data, { type: 'array', dense: true });
        return parseWorkbook(workbook);
    }
    catch {
        throw new Error('无法读取此文件，请确认是有效的 Excel 文件');
    }
}
export function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                resolve(parseExcelBuffer(e.target?.result));
            }
            catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败，请重试'));
        reader.readAsArrayBuffer(file);
    });
}
function computeColumnWidths(data, sampleSize = DEFAULT_WIDTH_SAMPLE_SIZE) {
    const keys = Object.keys(data[0] || {});
    if (keys.length === 0)
        return [];
    const maxLens = keys.map((key) => Math.max(key.length * HEADER_WIDTH_FACTOR, MIN_COL_WIDTH));
    const totalRows = data.length;
    const stride = sampleSize > 0 && totalRows > sampleSize
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
function buildWorkbook(data, options = {}) {
    const { autoColumnWidth = true, columnWidthSampleSize = DEFAULT_WIDTH_SAMPLE_SIZE } = options;
    const headers = Object.keys(data[0] || {});
    const aoa = new Array(data.length + (headers.length > 0 ? 1 : 0));
    if (headers.length > 0) {
        aoa[0] = headers;
        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const source = data[rowIndex];
            const target = new Array(headers.length);
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
export function writeExcelToArrayBuffer(data, options = {}) {
    const wb = buildWorkbook(data, options);
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
export function writeExcel(data, fileName, options = {}) {
    const wb = buildWorkbook(data, options);
    XLSX.writeFile(wb, fileName);
}
