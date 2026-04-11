import * as XLSX from 'xlsx';
import { parseExcelBuffer, writeExcelToArrayBuffer } from './.perf-dist/src/lib/excel.js';
import { transformData } from './.perf-dist/src/lib/transform.js';

function snapshotMemory() {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: mem.heapUsed / 1024 / 1024,
    rssMB: mem.rss / 1024 / 1024,
  };
}

function forceGC() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
}

async function measureStep(rowCount, step, fn) {
  forceGC();
  const before = snapshotMemory();
  const start = performance.now();

  try {
    const value = await fn();
    const end = snapshotMemory();
    forceGC();
    const afterGC = snapshotMemory();
    const durationMs = performance.now() - start;

    return {
      value,
      stats: {
        rowCount,
        step,
        durationMs,
        heapDeltaMB: end.heapUsedMB - before.heapUsedMB,
        retainedHeapMB: afterGC.heapUsedMB - before.heapUsedMB,
        rssDeltaMB: end.rssMB - before.rssMB,
        rowsPerSec: rowCount / (durationMs / 1000),
        status: 'ok',
      },
    };
  } catch (error) {
    const durationMs = performance.now() - start;
    return {
      stats: {
        rowCount,
        step,
        durationMs,
        heapDeltaMB: 0,
        retainedHeapMB: 0,
        rssDeltaMB: 0,
        rowsPerSec: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function formatNumber(value) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function createSourceRows(count) {
  const rows = new Array(count);

  for (let i = 0; i < count; i++) {
    const idx = i + 1;
    const padded = String(idx).padStart(6, '0');
    rows[i] = {
      客户编号: `CUST_${padded}`,
      微信号: `wx_${padded}`,
      昵称: `客户${padded}`,
      备注名称: `备注${padded}`,
      城市: i % 2 === 0 ? '上海' : '北京',
      标签: `标签_${i % 20}`,
    };
  }

  return rows;
}

function createInputExcelBuffer(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function writeExcelBaseline(data) {
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
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

function createConfig() {
  return {
    wechatId: 'perf-test',
    columnMapping: {
      customerIdColumn: '客户编号',
      customerNameColumn: '微信号',
      nameForConcatColumn: '昵称',
    },
    scripts: [1, 2, 3, 4, 5].map((num) => ({
      id: String(num),
      type: 'text',
      text: `这是第${num}条群发话术`,
      articleIndex: 1,
      prependName: num % 2 === 1,
    })),
  };
}

async function runBenchmarkForRowCount(rowCount) {
  console.log(`\n===== ${rowCount.toLocaleString()} rows =====`);

  const sourceRows = createSourceRows(rowCount);
  const inputBuffer = createInputExcelBuffer(sourceRows);
  const config = createConfig();

  const steps = [];

  const readResult = await measureStep(rowCount, 'readExcel(core)', () =>
    parseExcelBuffer(inputBuffer)
  );
  steps.push(readResult.stats);

  if (!readResult.value) {
    return steps;
  }

  const transformResult = await measureStep(rowCount, 'transformData', () =>
    transformData(readResult.value.rows, config)
  );
  steps.push(transformResult.stats);

  if (!transformResult.value) {
    return steps;
  }

  const writeOptimizedResult = await measureStep(
    rowCount,
    'writeExcel(optimized)',
    () => writeExcelToArrayBuffer(transformResult.value)
  );
  steps.push(writeOptimizedResult.stats);

  const writeBaselineResult = await measureStep(
    rowCount,
    'writeExcel(baseline)',
    () => writeExcelBaseline(transformResult.value)
  );
  steps.push(writeBaselineResult.stats);

  return steps;
}

function printSummary(allStats) {
  console.log('\n===== Summary =====');
  const table = allStats.map((stat) => ({
    rows: stat.rowCount.toLocaleString(),
    step: stat.step,
    status: stat.status,
    'time(ms)': formatNumber(stat.durationMs),
    'heap delta(MB)': formatNumber(stat.heapDeltaMB),
    'heap retained(MB)': formatNumber(stat.retainedHeapMB),
    'rss delta(MB)': formatNumber(stat.rssDeltaMB),
    'rows/sec': stat.rowsPerSec > 0 ? formatNumber(stat.rowsPerSec) : '-',
    error: stat.error || '',
  }));

  console.table(table);

  const optimized = allStats.filter(
    (s) => s.step === 'writeExcel(optimized)' && s.status === 'ok'
  );
  const baseline = allStats.filter(
    (s) => s.step === 'writeExcel(baseline)' && s.status === 'ok'
  );

  if (optimized.length > 0 && baseline.length > 0) {
    console.log('\nWrite stage speedup (baseline / optimized):');
    for (const base of baseline) {
      const opt = optimized.find((o) => o.rowCount === base.rowCount);
      if (!opt) continue;
      const speedup = base.durationMs / opt.durationMs;
      console.log(
        `  ${base.rowCount.toLocaleString()} rows: ${formatNumber(speedup)}x faster (baseline ${formatNumber(base.durationMs)} ms -> optimized ${formatNumber(opt.durationMs)} ms)`
      );
    }
  }
}

async function main() {
  console.log(`Node ${process.version}`);
  if (typeof globalThis.gc !== 'function') {
    console.log('Tip: run with --expose-gc to improve memory measurement stability.');
  }

  const rowCounts = [50000, 100000];
  const allStats = [];

  for (const rowCount of rowCounts) {
    const stats = await runBenchmarkForRowCount(rowCount);
    allStats.push(...stats);
  }

  printSummary(allStats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
