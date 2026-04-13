# 代码库问题清单

**分析日期:** 2026-04-13

## 技术债

### 1. 单文件 CSS 已达 724 行，接近上限

- 问题: 所有样式集中在 `src/index.css` 一个文件中（724 行），接近 800 行上限
- 文件: `src/index.css`
- 影响: 随着新功能增加，文件将超过可维护阈值；不同组件的样式混杂，修改一个组件可能意外影响其他组件
- 修复方案: 按组件或页面拆分为独立 CSS 文件（如 `components/FileUpload.css`、`components/ConfigPanel.css`），或使用 CSS Modules。保留 `index.css` 仅放设计系统变量和全局 reset

### 2. 无测试覆盖

- 问题: 整个项目没有任何测试文件，没有测试框架配置（无 vitest/jest）
- 文件: 整个 `src/` 目录
- 影响: 数据转换逻辑（`src/lib/transform.ts`）、Excel 读写（`src/lib/excel.ts`）、列自动识别（`autoDetectColumns`）全部没有测试。这些是核心业务逻辑，错误会直接导致导出数据错误，用户无法在下载前发现
- 修复方案: 
  1. 安装 vitest 并配置
  2. 优先为 `src/lib/transform.ts` 的 `transformData`、`transformDataForQixin`、`autoDetectColumns`、`autoDetectQixinColumns` 写单元测试
  3. 为 `src/lib/excel.ts` 的 `parseExcelBuffer`、`computeColumnWidths` 写单元测试
  4. 为 `src/lib/wechat-emoji-unicode.ts` 的 `wechatToUnicode` 写单元测试

### 3. 无代码格式化和 Lint 配置

- 问题: 项目缺少 ESLint、Prettier 等工具配置
- 文件: 项目根目录
- 影响: 代码风格不一致，无法自动检查潜在问题。多人协作时风格漂移
- 修复方案: 添加 `eslint.config.js` + `@eslint/js` + `typescript-eslint`，添加 `.prettierrc`

### 4. TypeScript 严格度不够

- 问题: `tsconfig.app.json` 中 `noUnusedLocals` 和 `noUnusedParameters` 都设为 `false`
- 文件: `tsconfig.app.json`（第 16-17 行）
- 影响: 未使用的变量和参数不会被检测，代码中可能残留死代码
- 修复方案: 将两个选项都设为 `true`，清理编译器警告的未使用代码

## 安全考虑

### 5. dangerouslySetInnerHTML 使用 — XSS 风险可控但需注意

- 风险: 三处使用 `dangerouslySetInnerHTML` 渲染微信表情 HTML
- 文件:
  - `src/components/ScriptCard.tsx`（第 108 行）— 渲染用户输入的话术文本
  - `src/components/ChatPreview.tsx`（第 60 行）— 渲染用户输入的话术预览
  - `src/components/PreviewPanel.tsx`（第 110 行）— 渲染转换后的数据预览
- 当前缓解措施: `src/lib/wechat-emoji.ts` 中的 `renderWechatEmojiHTML` 函数先调用 `escapeHTML`（第 39 行）转义所有 HTML 特殊字符，然后才替换 `[name]` 为 `<img>` 标签。`escapeHTML` 覆盖了 `&`、`<`、`>`、`"`、`'` 五个字符
- 残留风险: 
  1. `escapeHTML` 在 `renderWechatEmojiHTML` 内部调用，但 `ChatPreview.tsx` 第 62 行对 `sampleName` 单独调用 `escapeHTML`，说明开发者意识到了 XSS 问题
  2. 表情 PNG 的 `src` 属性来自 `wechat-emojis` 包的 `getAllEmojis()` 返回值 + `import.meta.env.BASE_URL` 前缀，不受用户输入控制
  3. 纯客户端应用，数据不跨用户传播，XSS 攻击面较小
- 建议: 维持现有做法即可。如果未来需要渲染从外部来源获取的数据，必须审查 `escapeHTML` 覆盖是否完整

### 6. 敏感数据无加密保护

- 风险: 用户上传的数据（微信号、联系人列表）在浏览器内存中以明文存储
- 文件: `src/App.tsx`（`parsedData` 状态，第 75 行）
- 当前缓解措施: 数据仅在浏览器端处理，不上传服务器（`src/components/FileUpload.tsx` 第 102 行有提示文案）
- 建议: 当前架构下风险可接受。确保未来不要引入任何数据上报、统计 SDK 或错误追踪服务（如 Sentry），否则敏感数据可能随错误栈一起上报

## 性能瓶颈

### 7. 大文件处理阻塞主线程

- 问题: Excel 读取（`readExcel`）、数据转换（`transformData`）、Excel 写入（`buildWorkbook`）全部在主线程同步执行。`readExcel` 使用 `FileReader.readAsArrayBuffer` 异步读文件，但 XLSX 解析（`XLSX.read`）和后续转换都是同步 CPU 密集操作
- 文件:
  - `src/lib/excel.ts`（`parseExcelBuffer` 第 36-44 行，`buildWorkbook` 第 94-124 行）
  - `src/lib/transform.ts`（`transformData` 第 6-41 行，`transformDataForQixin` 第 57-79 行）
- 影响: 上传超过 5 万行的 Excel 文件时，UI 会冻结数秒。性能基准测试（`scripts/perf-benchmark.mjs`）已验证 5 万行和 10 万行场景，说明开发者意识到了这个问题
- 修复方案: 将 `parseExcelBuffer` + `transformData` + `writeExcelToArrayBuffer` 移入 Web Worker。主线程只做文件读取和进度展示。`xlsx` 库支持在 Worker 中运行

### 8. 预览面板一次性转换全部数据

- 问题: `PreviewPanel.tsx` 在 `useMemo` 中对全部数据执行 `transformData`（第 30-35 行），但只显示前 10 行（第 41 行）
- 文件: `src/components/PreviewPanel.tsx`（第 30-41 行）
- 影响: 10 万行数据全部转换但只预览 10 行，浪费 CPU 时间和内存
- 修复方案: 分两步 — 先只转换前 10 行用于预览，下载时再转换全部数据。或使用懒转换策略

### 9. 无文件大小限制

- 问题: 上传组件没有检查文件大小，用户可上传任意大小的文件
- 文件: `src/components/FileUpload.tsx`（`handleFile` 函数第 18-28 行）
- 影响: 上传超大 Excel 文件（>100MB）可能导致浏览器 Tab 崩溃
- 修复方案: 在 `handleFile` 中添加 `file.size` 检查，建议上限 50MB，超出时显示错误提示

## 脆弱区域

### 10. 列自动识别依赖硬编码关键词

- 问题: `autoDetectColumns` 和 `autoDetectQixinColumns` 使用固定关键词匹配列名。如果数据源的列名格式变化（如从"客户编号"变为"ID"），自动识别会失败
- 文件: `src/lib/transform.ts`（第 99-159 行）
- 为什么脆弱: 
  1. `findColumn` 在所有关键词都不匹配时回退到 `headers[0]`（第 114 行），可能把错误的列映射为客户编号
  2. `findColumnOrEmpty` 在不匹配时返回空字符串，导致数据丢失但不报错
  3. `normalizeColumnName` 的 emoji 清理正则（第 93 行）硬编码了特定 emoji 字符，新增 emoji 需要手动添加
- 安全修改方式: 修改关键词列表时，同时测试所有已知的数据源格式
- 测试覆盖: 无（见问题 #2）

### 11. 微信表情 Unicode 映射不完整

- 问题: `wechat-emoji-unicode.ts` 的映射表约 60 个表情，微信实际有 100+ 个表情
- 文件: `src/lib/wechat-emoji-unicode.ts`（第 6-26 行的 `MAP` 对象）
- 为什么脆弱: 未映射的表情码会以 `[原文]` 形式直接写入 Excel，不影响功能但影响用户体验
- 修复方案: 从 `wechat-emojis` 包获取完整表情列表，补全 Unicode 映射。或允许用户配置自定义映射

### 12. 企信 RPA 模板的"昵称"列未映射到输出

- 问题: `QIXIN_HEADERS` 定义了 20 列，其中包含"昵称"列，但 `transformDataForQixin` 只映射了 `nicknameColumn` 到"名称"列（第 71 行），"昵称"列始终为空
- 文件: `src/lib/transform.ts`（第 48-79 行）
- 影响: 如果企信 RPA 工具依赖"昵称"列，会读到空值。需确认企信 RPA 的实际需求是"名称"还是"昵称"
- 修复方案: 确认企信 RPA 文档后，决定是将 `nicknameColumn` 同时映射到"名称"和"昵称"，还是只映射到其中一个

## 扩展性限制

### 13. 话术数量硬编码为 5 条上限

- 问题: `SCRIPT_KEYS` 固定为 `['话术1', '话术2', '话术3', '话术4', '话术5']`，`addScript` 中限制 `scripts.length >= 5`
- 文件:
  - `src/lib/transform.ts`（第 4 行）
  - `src/components/ConfigPanel.tsx`（第 89 行）
- 影响: 如果影刀 RPA 工具支持更多话术列，需要修改两个文件中的硬编码值
- 修复方案: 将话术上限提取为 `types.ts` 中的常量 `MAX_SCRIPTS = 5`，在 `transform.ts` 和 `ConfigPanel.tsx` 中引用

### 14. 单 Sheet 页读取

- 问题: `parseWorkbook` 只读取第一个 Sheet 页（`workbook.SheetNames[0]`）
- 文件: `src/lib/excel.ts`（第 26 行）
- 影响: 如果用户的数据在第二个或更后面的 Sheet，会读到错误的数据或空数据
- 修复方案: 在上传后显示 Sheet 选择器（当文件有多个 Sheet 时），让用户选择要处理的 Sheet

## 依赖风险

### 15. xlsx (SheetJS) 0.18.5 — 社区版功能受限

- 问题: `xlsx` 0.18.5 是 SheetJS 的最后一个免费社区版本，后续版本改为商业授权（SheetJS Pro）。社区版不再收到安全更新和 bug 修复
- 文件: `package.json`（第 17 行）
- 影响: 
  1. 无法获得新 Excel 格式的支持
  2. 潜在安全漏洞不会被修复
  3. 社区版缺少样式支持（单元格颜色、字体等）
- 迁移方案: 
  1. 短期：维持现有版本，功能满足需求
  2. 长期：如需样式支持或安全更新，考虑迁移到 `exceljs`（MIT 许可，支持样式）

## 缺失的关键功能

### 16. 无数据导出后的校验确认

- 问题: 下载 Excel 后没有任何校验步骤，用户无法确认导出数据是否正确
- 缺失位置: `src/components/PreviewPanel.tsx`（`handleDownload` 第 60-68 行）
- 影响: 如果列映射配置错误，用户需要打开 Excel 文件手动检查才能发现
- 建议: 下载后显示摘要信息（总行数、非空话术列数、示例第一行数据）

### 17. 无操作历史 / 撤销功能

- 问题: 配置面板中的修改（话术编辑、列映射变更）没有撤销机制
- 文件: `src/App.tsx`（状态管理第 74-80 行）
- 影响: 用户误操作后只能手动恢复或重新上传
- 建议: 优先级低，当前三步流程足够简单，"重新上传"按钮可作为重置手段

## 测试覆盖缺口

### 18. 核心数据转换逻辑零覆盖

- 未测试内容: 
  1. `transformData` — 话术拼接、名字前缀、表情转 Unicode
  2. `transformDataForQixin` — 20 列固定模板映射
  3. `autoDetectColumns` / `autoDetectQixinColumns` — 列名关键词匹配
  4. `wechatToUnicode` — 微信表情码转 Unicode
  5. `parseExcelBuffer` — 异常文件解析
  6. `escapeHTML` — HTML 特殊字符转义
- 文件: `src/lib/transform.ts`、`src/lib/excel.ts`、`src/lib/wechat-emoji.ts`、`src/lib/wechat-emoji-unicode.ts`
- 风险: 数据转换是应用的核心价值，任何 bug 会直接导致群发名单错误。由于群发操作不可撤回，错误成本极高
- 优先级: **高**

## 无障碍访问缺陷

### 19. 完全缺少 ARIA 属性和键盘导航

- 问题: 整个应用没有使用任何 `aria-*` 属性、`role` 属性或键盘事件处理
- 文件: 所有组件文件
- 具体缺陷:
  1. 拖拽排序（`src/components/ScriptCard.tsx`）仅支持鼠标，无键盘备选方案
  2. 步骤指示器（`src/App.tsx` 中的 `StepIndicator`）使用 `div` + `onClick`，不可通过键盘聚焦和操作
  3. 文件拖放区域（`src/components/FileUpload.tsx`）缺少 `role="button"` 和 `tabIndex`
  4. 表格预览（`src/components/PreviewPanel.tsx`）缺少 `aria-label`
  5. 无 `prefers-reduced-motion` 媒体查询支持
- 影响: 依赖键盘或屏幕阅读器的用户无法使用此应用
- 优先级: 中（内部工具，用户群体较小）

---

*问题审计: 2026-04-13*
