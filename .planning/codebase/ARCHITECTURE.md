# 架构

**分析日期:** 2026-04-13

## 模式概述

**整体架构:** 纯客户端单页应用（SPA），三步向导流程

**核心特征:**
- 所有数据处理在浏览器端完成，无后端服务
- 三步线性流程：上传文件 -> 选择模板+配置 -> 预览下载
- 两条导出路径（影刀RPA / 企信RPA）共享上传和预览基础设施
- 状态集中在 `src/App.tsx` 中通过 `useState` 管理，无外部状态库

## 层次结构

**入口层:**
- 用途: 应用挂载和全局样式注入
- 位置: `src/main.tsx`, `index.html`
- 包含: React 根节点创建、StrictMode 包裹、CSS 引入
- 依赖: `src/App.tsx`, `src/index.css`

**流程控制层（App 组件）:**
- 用途: 管理全局状态、步骤切换、路由分发
- 位置: `src/App.tsx`
- 包含: 所有 `useState` 状态声明、步骤导航逻辑、条件渲染
- 管理的状态:
  - `step: 1 | 2 | 3` — 当前步骤
  - `parsedData: ParsedData | null` — 解析后的表格数据
  - `fileName: string` — 上传的文件名
  - `exportTemplate: ExportTemplate | null` — 选择的导出模板（`'yingdao'` 或 `'qixin'`）
  - `config: AppConfig` — 影刀RPA 配置
  - `qixinConfig: QixinConfig` — 企信RPA 配置
  - `isLoading: boolean` — 文件加载状态
  - `error: string | null` — 错误信息

**展示层（组件）:**
- 用途: UI 渲染和用户交互
- 位置: `src/components/`
- 包含: 8 个 React 组件
- 被 App 层通过 props 驱动

**数据处理层（lib）:**
- 用途: Excel 读写、数据转换、表情处理
- 位置: `src/lib/`
- 包含: 纯函数工具模块
- 被组件层和 App 层调用

**类型定义层:**
- 用途: 全局 TypeScript 类型
- 位置: `src/types.ts`
- 包含: 所有核心接口和类型别名
- 被所有其他层引用

## 数据流

**上传流程:**

1. 用户拖拽/选择文件 -> `FileUpload` 触发 `onFileSelected` 回调
2. `App.handleFileSelected` 调用 `readExcel(file)` 解析文件
3. `readExcel` (`src/lib/excel.ts`) 使用 FileReader + SheetJS 将文件解析为 `ParsedData`
4. `autoDetectColumns` / `autoDetectQixinColumns` (`src/lib/transform.ts`) 自动识别列映射
5. 状态更新: `parsedData`, `fileName`, `config.columnMapping`, `qixinConfig.columnMapping`
6. 停留在步骤 1，显示模板选择器

**配置流程:**

1. 用户选择导出模板 -> `TemplateSelector` 触发 `onSelect`
2. `App.handleTemplateSelect` 设置 `exportTemplate` 并跳转到步骤 2
3. 根据模板类型渲染 `ConfigPanel`（影刀）或 `QixinConfigPanel`（企信）
4. 用户修改配置 -> 组件通过 `onConfigChange` 回调更新 App 中的 `config` 或 `qixinConfig`
5. `ConfigPanel` 右侧 `ChatPreview` 实时预览消息效果（仅影刀路径）

**导出流程:**

1. 用户进入步骤 3 -> `PreviewPanel` 使用 `useMemo` 调用 `transformData` 或 `transformDataForQixin`
2. 转换后数据渲染为预览表格（前 10 行），话术列使用 `renderWechatEmojiHTML` 渲染表情
3. 用户点击下载 -> `downloadExcel` (`src/lib/excel.ts`) 生成 xlsx 并触发下载
4. 优先使用 File System Access API (`showSaveFilePicker`)，不支持时回退到 Blob + `<a>` 下载

**状态管理:**
- 无外部状态库，所有状态通过 `useState` 在 `App.tsx` 中声明
- 通过 props 传递给子组件，通过回调函数向上更新
- 使用 `useCallback` 和 `useMemo` 优化性能
- 使用 `useRef` 在 `ConfigPanel` 中避免 stale closure 问题（`configRef`）

## 关键抽象

**ParsedData:**
- 用途: 统一表示解析后的表格数据
- 定义: `src/types.ts`
- 结构: `{ headers: string[], rows: Record<string, string>[] }`
- 由 `readExcel` 产出，被所有步骤消费

**ExportTemplate (`'yingdao' | 'qixin'`):**
- 用途: 决定整个应用的配置和导出路径
- 定义: `src/types.ts`
- 影响: 步骤 2 渲染哪个配置面板，步骤 3 使用哪个转换函数

**AppConfig (影刀RPA):**
- 用途: 影刀导出路径的完整配置
- 定义: `src/types.ts`
- 包含: `wechatId`, `columnMapping: ColumnMapping`, `scripts: ScriptConfig[]`
- 特点: 支持 1-5 条话术，每条可选文字或文章卡片类型，支持前缀客户称呼

**QixinConfig (企信RPA):**
- 用途: 企信导出路径的完整配置
- 定义: `src/types.ts`
- 包含: `wechatNickname`, `wechatId`, `contactType`, `columnMapping: QixinColumnMapping`
- 特点: 固定 20 列模板，仅 3 个用户输入字段

**微信表情双映射系统:**
- HTML 渲染: `src/lib/wechat-emoji.ts` — `[表情名]` -> `<img>` 标签（PNG 图片）
- Excel 导出: `src/lib/wechat-emoji-unicode.ts` — `[表情名]` -> Unicode emoji
- 原因: Excel 不支持内嵌图片，使用 Unicode 兼容显示

## 入口点

**Web 入口:**
- 位置: `src/main.tsx`
- 触发: 浏览器加载 `index.html` -> Vite 注入 `<script type="module">`
- 职责: 创建 React 根节点，渲染 `<App />`

**构建入口:**
- 位置: `vite.config.ts`
- 触发: `npm run build` 或 `npm run dev`
- 职责: Vite 构建配置，`base: './'` 支持相对路径部署

## 错误处理

**策略:** 在用户操作边界捕获，UI 中展示中文错误提示

**模式:**
- 文件上传: `App.handleFileSelected` 中 try-catch 捕获 `readExcel` 抛出的错误，设置 `error` 状态
- 文件格式校验: `FileUpload` 在调用回调前检查文件扩展名（`.xlsx`, `.xls`, `.csv`）
- 空数据校验: 上传后检查 `headers.length === 0` 和 `rows.length === 0`
- Excel 解析: `parseExcelBuffer` 中 try-catch，抛出中文错误消息
- 下载失败: `PreviewPanel.handleDownload` 中 try-catch，`alert('下载失败，请重试')`
- 用户取消保存: `downloadExcel` 检测 `AbortError`，返回 `false` 不报错

## 横切关注点

**日志:** 无日志系统。纯客户端应用，无服务端日志需求。

**校验:**
- 文件格式校验在 `FileUpload` 组件中（扩展名检查）
- 表单必填校验通过 `canProceed` 计算属性控制按钮禁用状态
- 列自动识别通过关键字匹配 `autoDetectColumns` / `autoDetectQixinColumns`
- 微信号包含中文时显示警告提示

**安全:**
- 所有数据本地处理，不上传到服务器
- 使用 `escapeHTML` 防止 XSS（在 `renderWechatEmojiHTML` 中先转义再替换）
- `dangerouslySetInnerHTML` 仅用于已转义的表情 HTML

**性能优化:**
- `memo()` 包裹频繁渲染的组件: `ScriptCard`, `ChatPreview`, `DataCard`
- `useMemo` 缓存转换后的数据和预览行
- `useCallback` 避免不必要的子组件重渲染
- Excel 列宽计算采样（`DEFAULT_WIDTH_SAMPLE_SIZE = 5000`），避免大文件全量扫描
- `useRef` + `configRef` 模式避免 drag-and-drop 回调中的 stale closure

---

*架构分析: 2026-04-13*
