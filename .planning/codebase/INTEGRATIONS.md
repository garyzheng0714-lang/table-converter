# 外部集成

**分析日期:** 2026-04-13

## API 与外部服务

**无。** 这是一个纯浏览器端应用，不调用任何外部 API、后端服务或第三方在线服务。

所有数据处理（读取、转换、导出）全部在浏览器本地完成。应用在 `src/components/FileUpload.tsx` 中明确提示用户："所有数据仅在您的电脑本地处理，不会上传"。

## 数据存储

**数据库:**
- 无。不使用任何数据库。

**文件存储:**
- 仅浏览器本地文件系统
- 输入：用户通过 `<input type="file">` 或拖拽上传 Excel/CSV 文件
- 输出：通过 File System Access API 或 Blob 下载保存 `.xlsx` 文件
- 相关代码：`src/lib/excel.ts`

**缓存:**
- 无持久化缓存
- 微信表情映射表在内存中懒加载一次（`src/lib/wechat-emoji.ts` 中的 `emojiSrcMap` 模块级变量）

## 认证与身份

**无。** 应用无需任何认证机制。无用户登录、无 API Key、无 OAuth。

## 监控与可观测性

**错误追踪:**
- 无外部错误追踪服务
- 错误通过 React 状态（`useState`）显示在 UI 中
- Excel 读写错误在 `src/lib/excel.ts` 中通过 try-catch 捕获并转为中文错误提示
- 下载失败通过 `alert()` 提示用户（`src/components/PreviewPanel.tsx`）

**日志:**
- 无日志系统
- 性能基准测试使用 `console.log` 和 `console.table`（`scripts/perf-benchmark.mjs`）

## CI/CD 与部署

**托管:**
- 未检测到部署配置
- `vite.config.ts` 中 `base: './'` 表明设计为可部署到任意静态文件服务

**CI 管道:**
- 无。未检测到 GitHub Actions、GitLab CI 或其他 CI 配置。

## 环境配置

**必需环境变量:**
- 无。应用不依赖任何环境变量。
- `import.meta.env.BASE_URL` 是 Vite 自动提供的内置变量。

**密钥/凭证:**
- 无。应用不使用任何密钥、API Key 或凭证。

## 第三方库集成详情

### SheetJS (xlsx) — 核心集成

**用途:** Excel/CSV 文件的读写

**读取流程（`src/lib/excel.ts`）:**
1. `FileReader.readAsArrayBuffer()` 读取文件
2. `XLSX.read(data, { type: 'array', dense: true })` 解析工作簿
3. `XLSX.utils.sheet_to_json()` 转为 JSON 数组
4. 返回 `{ headers, rows }` 结构

**写入流程（`src/lib/excel.ts`）:**
1. 手动构建 `aoa`（Array of Arrays）以优化大数据性能
2. `XLSX.utils.aoa_to_sheet()` 创建工作表
3. 计算自适应列宽（采样 5000 行）
4. `XLSX.write(wb, { bookType: 'xlsx', type: 'array' })` 生成二进制
5. 通过 `showSaveFilePicker` 或 Blob 下载

**注意:** 使用的是 SheetJS 社区版（CE），非 Pro 版。版本 0.18.5。

### wechat-emojis — 辅助集成

**用途:** 获取微信表情的名称列表

**集成方式（`src/lib/wechat-emoji.ts`）:**
1. `getAllEmojis()` 获取所有表情对象数组
2. 构建 `Map<string, string>`（表情名 → PNG 路径）
3. 正则匹配 `[表情名]` 文本码并替换为 `<img>` 标签
4. 表情 PNG 文件（109 张）存放在 `public/emoji/` 目录

**双重映射系统:**
- HTML 渲染用 PNG 图片：`src/lib/wechat-emoji.ts` — 用于聊天预览和表格预览中的视觉渲染
- Excel 导出用 Unicode 表情：`src/lib/wechat-emoji-unicode.ts` — 硬编码的 `[表情名] → Unicode` 映射表（约 70 个常用表情）

### 浏览器 File System Access API

**用途:** 提供原生"另存为"对话框体验

**集成方式（`src/lib/excel.ts` 的 `downloadExcel()`）:**
1. 检查 `window.showSaveFilePicker` 是否可用
2. 可用时（Chrome/Edge）：打开系统保存对话框，用户选择保存位置
3. 用户取消时返回 `false`，其他错误回退到传统下载
4. 不可用时（Safari/Firefox）：通过创建 `<a>` 标签 + `URL.createObjectURL` 下载

**类型声明:** `src/lib/excel.ts` 中通过 `declare global` 扩展了 `Window` 接口以包含 `showSaveFilePicker`

## Webhooks 与回调

**入站:**
- 无

**出站:**
- 无

## 下游系统（RPA 工具）

虽然应用本身不与 RPA 工具直接集成，但生成的 Excel 文件是为以下 RPA 工具设计的：

**影刀RPA（手机端点对点群发）:**
- 输出文件格式定义在 `src/lib/transform.ts` 的 `transformData()`
- 固定列：客户编号, 客户名称/微信号, 话术1~5, 发送状态, 发送时间
- 文件名格式：`待发送名单表格_{wechatId}_等待群发.xlsx`

**企信RPA（电脑端群发）:**
- 输出文件格式定义在 `src/lib/transform.ts` 的 `transformDataForQixin()`
- 固定 20 列通讯录格式（`QIXIN_HEADERS` 常量）
- 文件名格式：`企信RPA_{昵称}_{微信号}_群发列表.xlsx`
- Sheet 名格式：`【{昵称}】通讯录`

---

*集成审计: 2026-04-13*
