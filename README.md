# table-converter

![类型](https://img.shields.io/badge/%E7%B1%BB%E5%9E%8B-%E8%A1%A8%E6%A0%BC%E5%B7%A5%E5%85%B7-2563eb)
![技术栈](https://img.shields.io/badge/%E6%8A%80%E6%9C%AF%E6%A0%88-React%20%2B%20TypeScript%20%2B%20Vite-0f766e)
![状态](https://img.shields.io/badge/%E7%8A%B6%E6%80%81-%E7%BB%B4%E6%8A%A4%E4%B8%AD-16a34a)
![README](https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-brightgreen)

一个纯浏览器端运行的表格转换工具，用于把微信好友、客户名单或已发送名单整理成 RPA 工具需要的 Excel 格式。

## 仓库定位

- **分类**：表格工具 / RPA 名单整理。
- **服务对象**：需要整理微信群发名单、企信通讯录字段或已发送名单过滤结果的运营人员。
- **区别说明**：这是前端本地 Excel 转换器，不是飞书多维表格插件，不是数据库 ETL 工具，也不负责海报、模板或页面渲染。

## 功能

- 支持上传 `.csv`、`.xlsx`、`.xls` 文件。
- 自动读取工作表、表头和行数据，并为常见字段做列映射。
- 提供三类处理模板：
  - **手机端 · 影刀 RPA 点对点**：配置最多 5 条话术，支持文字、文章卡片占位、微信表情和称呼前缀。
  - **电脑端 · 企信 RPA**：导出企信通讯录格式，包含所属微信、类型、昵称、微信号、备注、标签和打招呼字段。
  - **名单过滤**：在多工作表文件中按关键列匹配主名单和已发送名单，筛出匹配记录并输出统计。
- 支持微信表情文本码预览，并在导出时转换为 Unicode。
- 提供聊天气泡预览和导出预览。
- 支持浏览器原生“另存为”能力；不支持时回退为普通下载。
- 对 Excel XML 非法控制字符做清理，降低导出文件损坏风险。
- 文件解析和导出都在浏览器本地完成，默认不上传到服务器。

## 技术栈

- React 18
- TypeScript
- Vite 6
- SheetJS (`xlsx`)
- JSZip
- `wechat-emojis`

## 项目结构

```text
.
├── src/
│   ├── App.tsx                       # 三步流程和模板路由
│   ├── types.ts                      # 配置、模板和解析数据类型
│   ├── components/
│   │   ├── FileUpload.tsx            # 文件上传
│   │   ├── TemplateSelector.tsx      # 导出模板选择
│   │   ├── ConfigPanel.tsx           # 影刀 RPA 配置
│   │   ├── QixinConfigPanel.tsx      # 企信 RPA 配置
│   │   ├── FilterConfigPanel.tsx     # 名单过滤配置
│   │   ├── PreviewPanel.tsx          # RPA 导出预览
│   │   ├── FilterPreviewPanel.tsx    # 过滤结果预览
│   │   ├── ScriptCard.tsx            # 话术编辑器
│   │   └── ChatPreview.tsx           # 聊天气泡预览
│   ├── lib/
│   │   ├── excel.ts                  # Excel 读写和下载
│   │   ├── export.worker.ts          # 导出 worker
│   │   ├── transform.ts              # 数据转换、列识别和过滤
│   │   ├── wechat-emoji.ts           # 微信表情 HTML 预览
│   │   └── wechat-emoji-unicode.ts   # 微信表情转 Unicode
│   └── index.css                     # 全局样式
├── public/
│   ├── logo.png
│   └── emoji/                        # 微信表情资源
├── scripts/
│   └── perf-benchmark.mjs            # 性能基准脚本
├── package.json
├── vite.config.ts
└── README.md
```

## 快速开始

```bash
npm install
npm run dev
```

Vite 会启动本地开发服务器，具体地址以命令输出为准。

## 使用流程

1. 上传 CSV 或 Excel 文件。
2. 选择导出模板。
3. 确认或调整自动识别的列映射。
4. 配置话术、所属微信、标签或过滤关键列。
5. 在预览页检查结果并导出 `.xlsx` 文件。

## 构建

```bash
npm run build
```

构建产物输出到 `dist/`，可作为静态站点部署。

本地预览构建产物：

```bash
npm run preview
```

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 构建 + Vite 构建 |
| `npm run preview` | 预览 `dist/` 产物 |
| `npm run perf:test` | 构建并运行性能基准脚本 |

## 数据流

```text
CSV / Excel 文件
  ↓ readExcelAllSheets()
MultiSheetData / ParsedData
  ↓ autoDetectColumns() / autoDetectQixinColumns() / autoDetectKeyColumn()
模板配置
  ↓ transformData() / transformDataForQixin() / filterByMatch()
导出数据
  ↓ downloadExcel()
.xlsx 文件
```

## 隐私说明

本工具在浏览器中完成文件解析、转换和导出。除非部署方自行修改代码接入服务端，否则源表格数据不会离开用户的浏览器环境。

## 维护说明

- 表格字段识别和转换逻辑集中在 `src/lib/transform.ts`。
- Excel 读写、worker 导出和下载逻辑集中在 `src/lib/excel.ts` 与 `src/lib/export.worker.ts`。
- 微信表情资源位于 `public/emoji/`，导出转换逻辑位于 `src/lib/wechat-emoji-unicode.ts`。
