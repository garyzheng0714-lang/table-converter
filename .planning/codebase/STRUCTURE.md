# 代码库结构

**分析日期:** 2026-04-13

## 目录布局

```
table-converter/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 自动部署
├── .planning/
│   └── codebase/               # GSD 分析文档
├── public/
│   └── emoji/                  # 微信表情 PNG 图片（~80个）
├── scripts/
│   ├── perf-benchmark.mjs      # 性能基准测试脚本
│   ├── tsconfig.perf.json      # 性能脚本的 TS 配置
│   └── .perf-dist/             # 性能脚本编译输出（生成目录）
├── src/
│   ├── components/             # React UI 组件
│   │   ├── ChatPreview.tsx     # 微信聊天预览（实时预览话术效果）
│   │   ├── ConfigPanel.tsx     # 影刀RPA 配置面板（步骤2）
│   │   ├── DataCard.tsx        # 数据概览卡片（显示上传文件信息+列映射）
│   │   ├── FileUpload.tsx      # 文件上传（步骤1-上传）
│   │   ├── PreviewPanel.tsx    # 预览+下载面板（步骤3，两模板共用）
│   │   ├── QixinConfigPanel.tsx # 企信RPA 配置面板（步骤2）
│   │   ├── ScriptCard.tsx      # 单条话术配置卡片（文字/文章卡片切换）
│   │   └── TemplateSelector.tsx # 模板选择（步骤1-选模板）
│   ├── lib/                    # 纯函数工具库
│   │   ├── excel.ts            # Excel 读写（SheetJS 封装）
│   │   ├── transform.ts        # 数据转换+列自动识别
│   │   ├── wechat-emoji.ts     # 微信表情 -> HTML img 标签（用于 UI 预览）
│   │   └── wechat-emoji-unicode.ts # 微信表情 -> Unicode emoji（用于 Excel 导出）
│   ├── App.tsx                 # 根组件：状态管理+步骤路由
│   ├── types.ts                # 全局类型定义
│   ├── main.tsx                # React 应用入口
│   ├── index.css               # 全局样式（724行，CSS 变量设计系统）
│   └── vite-env.d.ts           # Vite 类型声明
├── index.html                  # HTML 模板
├── package.json                # 依赖和脚本
├── tsconfig.json               # TypeScript 根配置（引用 tsconfig.app.json）
├── tsconfig.app.json           # TypeScript 应用配置
├── vite.config.ts              # Vite 构建配置
└── CLAUDE.md                   # 项目文档（给 AI 的上下文）
```

## 目录用途

**`src/components/`:**
- 用途: 所有 React UI 组件
- 包含: 8 个 `.tsx` 文件，每个文件一个组件
- 关键文件:
  - `ConfigPanel.tsx` (238行) — 影刀RPA 的完整配置界面，包含微信号输入、列映射、话术编辑、拖拽排序
  - `PreviewPanel.tsx` (139行) — 两个模板共用的预览和下载页面
  - `ScriptCard.tsx` (171行) — 单条话术的编辑卡片，支持文字/文章卡片两种模式

**`src/lib/`:**
- 用途: 与 UI 无关的纯函数工具库
- 包含: 4 个 `.ts` 文件
- 关键文件:
  - `excel.ts` (200行) — 核心 I/O: `readExcel` 读取文件, `downloadExcel` 生成并下载 xlsx
  - `transform.ts` (160行) — 核心逻辑: `transformData` (影刀), `transformDataForQixin` (企信), 列自动识别

**`public/emoji/`:**
- 用途: 微信表情 PNG 图片资源
- 包含: ~80 个 PNG 文件，文件名为中文表情名
- 来源: 从 `wechat-emojis` npm 包复制
- 在 `wechat-emoji.ts` 中通过 `import.meta.env.BASE_URL + 'emoji/'` 引用

**`scripts/`:**
- 用途: 开发工具脚本
- 包含: 性能基准测试（`perf-benchmark.mjs`）
- 生成目录: `.perf-dist/` 存放编译后的性能测试脚本

**`.github/workflows/`:**
- 用途: CI/CD 自动化
- 包含: `deploy.yml` — push 到 main 后自动构建并部署到 GitHub Pages

## 关键文件位置

**入口点:**
- `index.html`: HTML 模板，引用 `/src/main.tsx`
- `src/main.tsx`: React 应用挂载点，创建根节点渲染 `<App />`
- `src/App.tsx`: 应用根组件，管理全局状态和步骤流程

**配置:**
- `vite.config.ts`: Vite 配置（`base: './'` 相对路径，端口 19090）
- `tsconfig.json`: TypeScript 根配置（项目引用模式）
- `tsconfig.app.json`: 应用 TypeScript 配置（`strict: true`, `ES2020`, `react-jsx`）
- `package.json`: 依赖管理和 npm 脚本

**核心逻辑:**
- `src/lib/transform.ts`: 数据转换引擎（影刀格式转换、企信格式转换、列自动识别）
- `src/lib/excel.ts`: Excel I/O 层（读取、写入、下载，支持 File System Access API）
- `src/types.ts`: 全局类型定义（`ParsedData`, `AppConfig`, `QixinConfig`, `ScriptConfig` 等）

**样式:**
- `src/index.css`: 全局唯一 CSS 文件（724行），定义完整设计系统

## 命名约定

**文件:**
- 组件: PascalCase (`ConfigPanel.tsx`, `ChatPreview.tsx`)
- 工具库: kebab-case (`wechat-emoji.ts`, `wechat-emoji-unicode.ts`)
- 类型定义: 小写 (`types.ts`)
- 入口: 小写 (`main.tsx`, `index.css`)

**目录:**
- 小写 kebab-case (`components/`, `lib/`)

**组件:**
- 函数名与文件名一致: `FileUpload.tsx` 导出 `function FileUpload`
- 默认导出: `export default function ComponentName` 或 `export default memo(ComponentName)`

**类型:**
- 接口: PascalCase (`AppConfig`, `ParsedData`)
- 类型别名: PascalCase (`ExportTemplate`, `ScriptType`)
- Props 接口: 组件名 + Props (`ConfigPanelProps`, `FileUploadProps`)

## 新代码添加指南

**新增导出模板:**
1. 在 `src/types.ts` 中扩展 `ExportTemplate` 联合类型，添加新的 Config 接口
2. 在 `src/lib/transform.ts` 中添加 `transformDataForXxx` 转换函数和 `autoDetectXxxColumns` 自动识别
3. 在 `src/components/` 中创建 `XxxConfigPanel.tsx` 配置面板
4. 在 `src/App.tsx` 中:
   - 添加新的 `useState` 管理配置
   - 在 `handleFileSelected` 中调用自动识别
   - 在步骤 2 条件渲染中添加新面板
5. 在 `src/components/TemplateSelector.tsx` 中添加新模板卡片
6. 在 `src/components/PreviewPanel.tsx` 中添加新的转换分支

**新增 UI 组件:**
- 放置位置: `src/components/XxxComponent.tsx`
- 使用 PascalCase 文件名
- 定义 Props 接口
- 频繁渲染的组件用 `memo()` 包裹
- 默认导出

**新增工具函数:**
- 放置位置: `src/lib/xxx.ts`
- 使用 kebab-case 文件名
- 导出纯函数，不包含 React 相关代码
- 在 `types.ts` 中定义需要的类型

**新增样式:**
- 添加到 `src/index.css` 底部
- 使用已有的 CSS 变量（`--c-primary`, `--c-surface`, `--r-md` 等）
- 组件样式以组件缩写为前缀（如 `sc-` 对应 ScriptCard, `cp-` 对应 ChatPreview, `dc-` 对应 DataCard）

## 特殊目录

**`public/emoji/`:**
- 用途: 微信表情 PNG 静态资源
- 生成: 否，手动从 `wechat-emojis` 包复制
- 提交: 是，随代码一起提交
- 构建行为: Vite 原样复制到 `dist/emoji/`

**`scripts/.perf-dist/`:**
- 用途: 性能基准测试的 TypeScript 编译输出
- 生成: 是，由 `npm run perf:build` 生成
- 提交: 不确定，可能应在 `.gitignore` 中

**`dist/`:**
- 用途: Vite 生产构建输出
- 生成: 是，由 `npm run build` 生成
- 提交: 否

---

*结构分析: 2026-04-13*
