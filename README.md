# 群发名单整理助手

将微信好友导出的 CSV 文件转换为 RPA 群发工具所需的 Excel 格式。纯浏览器端处理，数据不上传服务器。

## 功能

- **上传 CSV** — 支持 `.csv` / `.xlsx` / `.xls`，自动识别列映射
- **两种导出模板**
  - 📱 **手机端 · 影刀RPA点对点** — 配置话术脚本（文字/文章卡片），支持微信表情、前缀称呼拼接，最多 5 条话术
  - 💻 **电脑端 · 企信RPA** — 导出通讯录格式（20列），填写所属微信昵称/微信号/类型即可
- **微信表情** — 支持 `[smile]` 等文本码在编辑器中实时预览，导出时转为 Unicode emoji
- **聊天预览** — 影刀模板实时显示消息气泡效果
- **自定义保存** — 支持系统原生"另存为"对话框选择保存位置（Chrome/Edge）

## 技术栈

- React 18 + TypeScript
- Vite 6
- [SheetJS (xlsx)](https://sheetjs.com/) — Excel 读写
- [wechat-emojis](https://www.npmjs.com/package/wechat-emojis) — 微信表情 PNG 资源

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

产物在 `dist/` 目录，可直接部署为静态站点。

## 数据流

```
CSV/Excel 文件
  ↓ readExcel()
ParsedData { headers, rows }
  ↓ autoDetectColumns() / autoDetectQixinColumns()
ColumnMapping / QixinColumnMapping
  ↓ 用户配置
AppConfig / QixinConfig
  ↓ transformData() / transformDataForQixin()
导出数据 Record<string, string>[]
  ↓ downloadExcel()
.xlsx 文件（支持自选保存位置）
```

## 项目结构

```
src/
├── App.tsx                    # 主应用，步骤流程控制
├── types.ts                   # 类型定义
├── main.tsx                   # 入口
├── index.css                  # 设计系统 + 全局样式
├── components/
│   ├── FileUpload.tsx         # 步骤1：文件上传（拖拽）
│   ├── TemplateSelector.tsx   # 步骤1.5：选择导出模板
│   ├── ConfigPanel.tsx        # 步骤2A：影刀RPA配置
│   ├── QixinConfigPanel.tsx   # 步骤2B：企信RPA配置
│   ├── PreviewPanel.tsx       # 步骤3：预览 + 下载
│   ├── ScriptCard.tsx         # 话术卡片编辑器
│   ├── ChatPreview.tsx        # 聊天气泡预览
│   └── DataCard.tsx           # 数据源卡片
└── lib/
    ├── excel.ts               # Excel 读写 + 下载
    ├── transform.ts           # 数据转换 + 列映射
    ├── wechat-emoji.ts        # 微信表情 → HTML 渲染
    └── wechat-emoji-unicode.ts # 微信表情 → Unicode 转换
```
