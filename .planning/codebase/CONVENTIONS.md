# 编码约定

**分析日期:** 2026-04-13

## 命名模式

**文件:**
- 组件文件：PascalCase（`FileUpload.tsx`, `ConfigPanel.tsx`, `ChatPreview.tsx`）
- 工具库文件：kebab-case（`wechat-emoji.ts`, `wechat-emoji-unicode.ts`）
- 类型定义：单文件 `types.ts`，集中管理所有类型
- 入口文件：`main.tsx`（Vite 默认）、`App.tsx`（根组件）

**函数:**
- 组件函数：PascalCase（`FileUpload`, `ConfigPanel`, `StepIndicator`）
- 普通函数：camelCase（`readExcel`, `transformData`, `autoDetectColumns`）
- 事件处理：`handle` 前缀（`handleFileSelected`, `handleDrop`, `handleDragStart`）
- 回调 props：`on` 前缀（`onFileSelected`, `onConfigChange`, `onBack`, `onNext`）

**变量:**
- 状态变量：camelCase（`parsedData`, `exportTemplate`, `isLoading`）
- 布尔值：`is`/`show`/`can` 前缀（`isLoading`, `isDragging`, `showConfirmPopup`, `canProceed`）
- 常量：UPPER_SNAKE_CASE（`SCRIPT_KEYS`, `STEP_LABELS`, `QIXIN_HEADERS`, `ORDINALS`）
- CSS 变量前缀：`--c-`（颜色）、`--r-`（圆角）、`--shadow-`（阴影）、`--ease`（动画曲线）

**类型:**
- interface：PascalCase，组件 props 以 `Props` 后缀（`FileUploadProps`, `ConfigPanelProps`）
- type alias：PascalCase，用于联合类型（`ScriptType`, `ExportTemplate`, `Step`）

## 代码风格

**格式化:**
- 无 Prettier/ESLint 配置——项目未使用任何自动格式化工具
- 缩进：2 空格
- 引号：单引号（TypeScript/JSX）
- 分号：行末分号
- 尾逗号：有（函数参数、对象、数组末尾均有尾逗号）

**Linting:**
- 无 ESLint 配置——项目未使用 Linter
- TypeScript 严格模式（`strict: true`）作为唯一的静态检查
- `noUnusedLocals: false`、`noUnusedParameters: false`——未强制清理未使用变量

## TypeScript 配置

**严格程度:**
- `strict: true` 启用所有严格检查
- `noFallthroughCasesInSwitch: true` 防止 switch 漏写 break
- `noUncheckedSideEffectImports: true` 检查副作用导入
- 但 `noUnusedLocals` 和 `noUnusedParameters` 均为 `false`，允许未使用的变量

**模块系统:**
- `module: ESNext`，`moduleResolution: bundler`
- `target: ES2020`
- `jsx: react-jsx`（自动 JSX 转换，无需手动导入 React）

## 导入组织

**顺序:**
1. React 核心 hooks（`import { useState, useCallback, useMemo } from 'react'`）
2. 类型导入，使用 `import type`（`import type { AppConfig, ParsedData } from '../types'`）
3. 工具库函数（`import { readExcel } from '../lib/excel'`）
4. 组件导入（`import FileUpload from './components/FileUpload'`）

**路径规则:**
- 使用相对路径，无路径别名（`../types`, `../lib/transform`, `./components/FileUpload`）
- lib 文件内部导入带 `.js` 后缀（`from '../types.js'`, `from './wechat-emoji-unicode.js'`）
- 组件文件导入不带扩展名（`from '../types'`, `from '../lib/transform'`）

**类型导入:**
- 始终使用 `import type` 分离类型导入：`import type { AppConfig } from '../types'`
- 这是项目中一致遵守的模式

## 组件设计模式

**组件导出:**
- 所有组件使用 `export default function ComponentName()` 形式
- 需要性能优化的组件用 `memo()` 包裹后再 `export default memo(ComponentName)`
- 当前使用 memo 的组件：`ScriptCard`, `ChatPreview`, `DataCard`

**Props 定义:**
- 每个组件在文件顶部定义独立的 `interface XxxProps`
- Props 接口紧跟在 import 语句之后
- 使用解构参数：`function Component({ prop1, prop2 }: ComponentProps)`

**状态管理:**
- 所有状态集中在 `App.tsx` 中通过 `useState` 管理
- 无外部状态库（无 Redux、Zustand、Jotai 等）
- 子组件通过 `onConfigChange` 回调向上传递状态变更

**性能优化模式:**
- `useCallback` 包裹所有事件处理函数和回调
- `useMemo` 用于派生数据（`transformedData`, `previewRows`, `displayColumns`）
- `useRef` 用于避免闭包陷阱：`configRef.current = config`（见 `ConfigPanel.tsx` 第 29-30 行）
- `memo()` 用于频繁重渲染的子组件

**内联组件:**
- 小型展示组件可在同文件中定义（如 `App.tsx` 中的 `StepIndicator`）

## 不可变数据更新

**始终使用展开运算符创建新对象:**
```typescript
// 更新嵌套对象
onConfigChange({
  ...config,
  columnMapping: { ...config.columnMapping, [field]: value },
});

// 更新数组
onConfigChange({
  ...current,
  scripts: current.scripts.filter((_, i) => i !== index),
});
```

## 错误处理

**模式:**
- 用户操作错误：通过 `useState<string | null>(null)` 管理错误状态，在 UI 中显示中文提示
- 异步操作：`try/catch` + `finally` 确保 loading 状态重置
- 错误信息：`err instanceof Error ? err.message : '文件读取失败，请重试'`
- 下载失败：使用 `alert()` 简单提示

**错误类型收窄:**
```typescript
catch (err: unknown) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return false; // 用户取消
  }
}
```

## CSS 约定

**单文件全局样式:**
- 所有样式在 `src/index.css`（724 行）中
- 无 CSS Modules、Styled Components 或 Tailwind
- 使用 CSS 自定义属性（变量）作为设计系统

**CSS 变量命名:**
- 颜色：`--c-primary`, `--c-bg`, `--c-text`, `--c-border`, `--c-success`, `--c-error`
- 圆角：`--r-sm`, `--r-md`, `--r-lg`, `--r-xl`
- 阴影：`--shadow-sm`, `--shadow-card`
- 字体：`--font`, `--font-display`
- 过渡：`--ease`

**CSS 类名:**
- 组件前缀缩写：`sc-`（ScriptCard）、`cp-`（ChatPreview）、`dc-`（DataCard）、`dz-`（DropZone）
- BEM 变体修饰符：`drop-zone--active`, `form-input--empty`, `sc-tab--on`
- 状态类：`step-active`, `step-done`, `step-clickable`
- 语义化类名：`upload-hero`, `config-layout`, `preview-table`

**CSS 组织分区:**
- 使用注释块分隔各区域：`/* ============ App Shell ============ */`

## 注释风格

**何时注释:**
- 非直觉的业务逻辑用中文注释
- 代码段用 `/* ---- Section Name ---- */` 分割
- JSDoc 用于复杂的工具函数导出（如 `downloadExcel`）
- 内联注释解释"为什么"而非"是什么"

**语言:**
- UI 文案：全中文
- 代码注释：中英混合，技术术语用英文（如 `Drag`, `CRUD`）
- JSDoc：英文

## 函数设计

**大小:** 大多数函数 < 30 行，最大的组件函数（`ConfigPanel`）约 110 行 JSX

**参数:** 组件使用 Props 接口解构；工具函数使用具体类型参数

**返回值:** 组件返回 JSX；工具函数返回明确的类型（`Record<string, string>[]`, `string`, `Promise<boolean>`）

## 模块设计

**导出模式:**
- 组件：`export default function`（每个文件一个组件）
- 工具函数：具名 `export function`（每个文件多个相关函数）
- 类型：具名 `export interface` / `export type`（集中在 `types.ts`）

**Barrel 文件:** 不使用——直接导入具体文件路径

## SVG 图标

- 内联 SVG，不使用图标库
- 直接在 JSX 中编写 `<svg>` 元素
- 统一使用 `currentColor` 继承文字颜色

## HTML 安全

- `dangerouslySetInnerHTML` 用于渲染微信表情 HTML（经过 `escapeHTML` 处理后替换表情标签）
- `escapeHTML` 函数在 `src/lib/wechat-emoji.ts` 中定义，转义 `& < > " '` 五个字符
- 用户输入先 escape 再插入 HTML

---

*约定分析: 2026-04-13*
