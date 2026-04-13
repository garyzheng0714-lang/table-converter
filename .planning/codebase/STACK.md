# 技术栈

**分析日期:** 2026-04-13

## 语言

**主要:**
- TypeScript 5.6.3 - 所有源代码（`src/` 目录下所有 `.tsx` 和 `.ts` 文件）
- CSS - 全局样式（`src/index.css` 单文件）

**辅助:**
- JavaScript (ESM) - 性能基准测试脚本（`scripts/perf-benchmark.mjs`）
- HTML - 入口页面（`index.html`）

## 运行时

**环境:**
- 浏览器端应用，无 Node.js 服务端
- 目标 ES2020（`tsconfig.app.json` 中 `"target": "ES2020"`）
- DOM 库：ES2020, DOM, DOM.Iterable

**包管理器:**
- npm（使用 `package-lock.json`）
- Lockfile: 存在（65KB）
- 项目类型：`"type": "module"`（ESM）

## 框架

**核心:**
- React 18.3.1 - UI 框架，函数组件 + Hooks
- React DOM 18.3.1 - DOM 渲染，使用 `createRoot` API

**构建/开发:**
- Vite 6.0.1 - 开发服务器和生产构建
- @vitejs/plugin-react 4.3.4 - React JSX 支持（`vite.config.ts`）
- TypeScript 5.6.3 - 类型检查（构建前 `tsc -b`）

**测试:**
- 未检测到测试框架（无 jest/vitest/playwright 配置）
- 有性能基准测试脚本（`scripts/perf-benchmark.mjs`），使用 Node.js `--expose-gc` 运行

## 关键依赖

**生产依赖（仅 4 个）:**

| 包 | 版本 | 用途 |
|------|------|------|
| `react` | ^18.3.1 | UI 框架 |
| `react-dom` | ^18.3.1 | DOM 渲染 |
| `xlsx` (SheetJS) | ^0.18.5 | Excel/CSV 读写，核心业务依赖 |
| `wechat-emojis` | ^1.0.2 | 微信表情名称列表，用于匹配 `[表情名]` 文本码 |

**开发依赖（仅 5 个）:**

| 包 | 版本 | 用途 |
|------|------|------|
| `@types/react` | ^18.3.12 | React 类型定义 |
| `@types/react-dom` | ^18.3.1 | React DOM 类型定义 |
| `@vitejs/plugin-react` | ^4.3.4 | Vite React 插件 |
| `typescript` | ^5.6.3 | TypeScript 编译器 |
| `vite` | ^6.0.1 | 构建工具 |

**关于 xlsx (SheetJS):**
- 使用社区版 0.18.5，非 Pro 版
- 用于读取 `.xlsx`/`.xls`/`.csv` 文件（`XLSX.read`）
- 用于生成 `.xlsx` 文件（`XLSX.write`）
- 使用 `aoa_to_sheet` 手动构建 worksheet 以优化性能
- 核心使用集中在 `src/lib/excel.ts`

**关于 wechat-emojis:**
- 仅使用 `getAllEmojis()` API 获取表情名称列表
- 实际表情 PNG 图片（109 张）存放在 `public/emoji/` 目录
- 使用位置：`src/lib/wechat-emoji.ts`

## 配置

**TypeScript 配置:**
- `tsconfig.json` - 根配置，引用 `tsconfig.app.json`
- `tsconfig.app.json` - 应用编译配置
  - 严格模式：`"strict": true`
  - JSX：`"react-jsx"`（新 JSX 转换）
  - 模块解析：`"bundler"`
  - 允许 `.ts` 扩展名导入：`"allowImportingTsExtensions": true`
  - 注意：`noUnusedLocals` 和 `noUnusedParameters` 设为 `false`
- `scripts/tsconfig.perf.json` - 性能测试编译配置（NodeNext 模块，输出到 `.perf-dist/`）

**Vite 配置（`vite.config.ts`）:**
- 插件：`@vitejs/plugin-react`
- `base: './'` - 相对路径部署（可放在任意子目录）
- 开发服务器端口：19090
- 不自动打开浏览器

**环境变量:**
- 无 `.env` 文件
- 唯一使用的环境变量：`import.meta.env.BASE_URL`（Vite 内置，用于表情图片路径前缀）

**构建命令:**
```bash
npm run dev           # 启动 Vite 开发服务器（端口 19090）
npm run build         # tsc -b && vite build（先类型检查，再打包）
npm run preview       # vite preview（预览构建结果）
npm run perf:build    # 编译性能测试用的 TS 文件
npm run perf:test     # 运行性能基准测试（50k/100k 行）
```

## 浏览器 API 使用

**File System Access API:**
- `window.showSaveFilePicker` - 在 Chrome/Edge 中提供原生"另存为"对话框
- 不支持时回退到 Blob + `<a>` 标签下载
- 位置：`src/lib/excel.ts` 的 `downloadExcel()` 函数

**FileReader API:**
- 用于读取用户上传的文件为 `ArrayBuffer`
- 位置：`src/lib/excel.ts` 的 `readExcel()` 函数

**HTML5 Drag & Drop:**
- 文件拖拽上传（`src/components/FileUpload.tsx`）
- 话术卡片拖拽排序（`src/components/ConfigPanel.tsx`）

**Web Crypto API:**
- `crypto.randomUUID()` - 生成话术卡片唯一 ID
- 位置：`src/components/ConfigPanel.tsx`

## 平台要求

**开发:**
- Node.js（运行 Vite 开发服务器和 TypeScript 编译）
- npm（包管理）

**生产:**
- 纯静态文件部署，无需服务端
- `base: './'` 支持部署到任意子路径
- 目标浏览器：现代浏览器（ES2020+），Chrome/Edge 体验最佳（支持 showSaveFilePicker）

## 代码格式化/Lint

- 未检测到 ESLint 配置
- 未检测到 Prettier 配置
- 未检测到 Stylelint 配置
- `.gitignore` 仅排除 `node_modules`、`dist`、`*.tsbuildinfo`

---

*技术栈分析: 2026-04-13*
