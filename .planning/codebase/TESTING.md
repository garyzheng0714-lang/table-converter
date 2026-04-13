# 测试模式

**分析日期:** 2026-04-13

## 当前状态：无测试

本项目**没有任何测试文件、测试框架或测试配置**。

**缺失项清单:**
- 无测试框架（无 Vitest、Jest、Playwright 等）
- 无测试配置文件（无 `vitest.config.ts`、`jest.config.*`、`playwright.config.*`）
- 无测试文件（整个 `src/` 中无 `*.test.*` 或 `*.spec.*`）
- 无测试相关依赖（`package.json` 中无 vitest、jest、@testing-library 等）
- 无测试脚本（`package.json` 的 scripts 中无 `test` 命令）
- 无覆盖率配置
- CI/CD（`.github/workflows/deploy.yml`）只执行 `npm ci` + `vite build`，无测试步骤

## 性能基准测试（非测试框架）

项目包含一个手写的性能基准脚本，但这不是测试：

**位置:** `scripts/perf-benchmark.mjs`
**配置:** `scripts/tsconfig.perf.json`
**编译输出:** `scripts/.perf-dist/`

**运行命令:**
```bash
npm run perf:build    # 编译 TypeScript 到 .perf-dist
npm run perf:test     # 运行基准测试（需 --expose-gc）
```

**测量内容:**
- `parseExcelBuffer`（读取 Excel）的速度和内存
- `transformData`（数据转换）的速度和内存
- `writeExcelToArrayBuffer`（写入 Excel）vs 基线 SheetJS 的性能对比
- 测试数据量：50,000 行和 100,000 行

**注意:** 此基准测试仅验证性能，不验证正确性。

## 推荐的测试框架选型

基于项目技术栈（React 18 + TypeScript + Vite），推荐：

**测试运行器:**
- Vitest（与 Vite 原生集成，零配置）

**组件测试:**
- @testing-library/react + @testing-library/jest-dom

**E2E 测试:**
- Playwright

**安装命令:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**推荐配置文件:** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

## 推荐的测试脚本

在 `package.json` 中添加：
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 测试文件组织（推荐）

**位置:** 测试文件与源文件同目录（co-located）

**命名:** `{源文件名}.test.ts` 或 `{源文件名}.test.tsx`

**推荐结构:**
```
src/
├── lib/
│   ├── transform.ts
│   ├── transform.test.ts          # 纯函数测试
│   ├── excel.ts
│   ├── excel.test.ts              # Excel 读写测试
│   ├── wechat-emoji.ts
│   ├── wechat-emoji.test.ts       # 表情渲染测试
│   ├── wechat-emoji-unicode.ts
│   └── wechat-emoji-unicode.test.ts
├── components/
│   ├── FileUpload.tsx
│   ├── FileUpload.test.tsx        # 组件交互测试
│   └── ...
└── test-setup.ts                  # 全局测试设置
```

## 高优先级测试目标

以下是最应优先添加测试的区域，按优先级排序：

### P0：核心数据转换（纯函数，最易测试）

**`src/lib/transform.ts`:**
- `transformData()` — 影刀 RPA 格式转换，验证列映射、话术拼接、称呼前缀
- `transformDataForQixin()` — 企信 RPA 格式转换，验证 20 列固定模板
- `autoDetectColumns()` — 表头自动识别，验证带 emoji/特殊字符的列名匹配
- `autoDetectQixinColumns()` — 企信列映射自动识别
- `generateFileName()` / `generateQixinFileName()` — 文件名生成
- `normalizeColumnName()` — 列名清洗（目前为内部函数，需导出才能测试）

**测试示例:**
```typescript
import { describe, it, expect } from 'vitest';
import { transformData, autoDetectColumns, generateFileName } from './transform';

describe('transformData', () => {
  it('应正确映射客户编号和名称列', () => {
    const rows = [{ '客户编号': 'C001', '微信号': 'wx001', '昵称': '张总' }];
    const config = {
      wechatId: 'test',
      columnMapping: {
        customerIdColumn: '客户编号',
        customerNameColumn: '微信号',
        nameForConcatColumn: '昵称',
      },
      scripts: [{ id: '1', type: 'text' as const, text: '你好', articleIndex: 1, prependName: true }],
    };

    const result = transformData(rows, config);

    expect(result[0]['客户编号']).toBe('C001');
    expect(result[0]['客户名称/微信号']).toBe('wx001');
    expect(result[0]['话术1']).toBe('张总，你好');
  });

  it('prependName 为 false 时不拼接称呼', () => {
    const rows = [{ '客户编号': 'C001', '微信号': 'wx001', '昵称': '张总' }];
    const config = {
      wechatId: 'test',
      columnMapping: {
        customerIdColumn: '客户编号',
        customerNameColumn: '微信号',
        nameForConcatColumn: '昵称',
      },
      scripts: [{ id: '1', type: 'text' as const, text: '你好', articleIndex: 1, prependName: false }],
    };

    const result = transformData(rows, config);

    expect(result[0]['话术1']).toBe('你好');
  });
});

describe('autoDetectColumns', () => {
  it('应识别带 emoji 前缀的列名', () => {
    const headers = ['📌客户编号', '📌【保密】微信号', '昵称', '称呼订正'];
    const result = autoDetectColumns(headers);

    expect(result.customerIdColumn).toBe('📌客户编号');
    expect(result.customerNameColumn).toBe('📌【保密】微信号');
    expect(result.nameForConcatColumn).toBe('称呼订正');
  });
});
```

### P1：微信表情处理

**`src/lib/wechat-emoji.ts`:**
- `escapeHTML()` — HTML 转义，验证 `& < > " '` 五个字符
- `renderWechatEmojiHTML()` — 表情标签替换为 `<img>`，验证未知标签保留原样

**`src/lib/wechat-emoji-unicode.ts`:**
- `wechatToUnicode()` — `[抱拳]` → `🙏`，验证已知/未知标签的处理

### P2：Excel 读写

**`src/lib/excel.ts`:**
- `parseExcelBuffer()` — 需要构造测试用 Excel buffer
- `writeExcelToArrayBuffer()` — 验证输出可被重新读取
- `computeColumnWidths()` — 列宽计算逻辑（目前为内部函数）
- 往返测试：写出 → 读回 → 对比数据一致性

### P3：组件交互测试

**`src/components/FileUpload.tsx`:**
- 文件格式验证（.xlsx/.xls/.csv 允许，其他拒绝）
- 拖拽上传交互

**`src/App.tsx`:**
- 步骤流转逻辑（Step 1 → 2 → 3）
- 配置状态初始化

## Mock 策略（推荐）

**需要 Mock 的:**
- `File` 对象和 `FileReader`（文件上传测试）
- `window.showSaveFilePicker`（File System Access API）
- `import.meta.env.BASE_URL`（表情图片路径）
- `wechat-emojis` 包的 `getAllEmojis()`

**不需要 Mock 的:**
- `src/lib/transform.ts` 中的所有纯函数
- `src/lib/wechat-emoji-unicode.ts` 中的映射函数
- SheetJS 的 `XLSX.read` / `XLSX.write`（使用真实库做集成测试）

## 覆盖率目标

**推荐初始目标:** 80%（针对 `src/lib/` 目录）

**按文件优先级:**

| 文件 | 当前覆盖率 | 目标 | 难度 |
|------|-----------|------|------|
| `src/lib/transform.ts` | 0% | 95% | 低（纯函数） |
| `src/lib/wechat-emoji-unicode.ts` | 0% | 95% | 低（纯函数） |
| `src/lib/wechat-emoji.ts` | 0% | 90% | 低（纯函数） |
| `src/lib/excel.ts` | 0% | 80% | 中（需构造二进制数据） |
| `src/components/*.tsx` | 0% | 60% | 高（需 DOM 环境） |

## CI 集成（推荐）

在 `.github/workflows/deploy.yml` 的 build job 中添加测试步骤：

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: npm
  - run: npm ci
  - run: npm test            # 添加此行
  - run: npx vite build
```

---

*测试分析: 2026-04-13*
