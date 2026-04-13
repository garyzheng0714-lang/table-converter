# CLAUDE.md

## 项目概述

群发名单整理助手 — 将微信好友 CSV 导出转换为 RPA 群发工具所需的 Excel 格式。纯浏览器端 React + TypeScript 应用，无后端。

## 技术栈

- React 18 + TypeScript + Vite 6
- SheetJS (xlsx) 处理 Excel 读写
- wechat-emojis 提供微信表情 PNG

## 常用命令

```bash
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npx tsc --noEmit   # 类型检查
```

## 架构

三步流程：上传 → 选模板+配置 → 预览下载

两条导出路径共享上传和预览基础设施：
- **影刀RPA**（AppConfig）：话术脚本配置，支持文字/文章卡片/表情/前缀称呼
- **企信RPA**（QixinConfig）：通讯录格式，20列固定模板，3个用户输入字段

状态管理：App.tsx 中 useState，无外部状态库。

## 关键文件

- `src/App.tsx` — 主流程控制，步骤切换，状态管理
- `src/types.ts` — 所有类型定义（ExportTemplate, AppConfig, QixinConfig 等）
- `src/lib/transform.ts` — 数据转换核心（transformData, transformDataForQixin, autoDetect*）
- `src/lib/excel.ts` — Excel 读写 + downloadExcel（支持 showSaveFilePicker）
- `src/components/PreviewPanel.tsx` — 两模板共用的预览+下载页

## 编码约定

- 单文件不超过 900 行
- CSS 全局单文件 `index.css`，使用 CSS 变量设计系统
- 组件用 memo() 包裹优化性能（ScriptCard, ChatPreview, DataCard）
- 不可变数据更新（spread operator）
- 中文 UI，中文注释

## 导入 CSV 固定表头

```
📌客户编号 | 所属账号 | 备注名称 | 昵称 | 所属标签 | 📌【保密】微信号 | 称呼订正 | 重点昵称关注
```

## 导出格式

### 影刀RPA
文件名：`待发送名单表格_{wechatId}_等待群发.xlsx`
列：客户编号, 客户名称/微信号, 话术1~5, 发送状态, 发送时间

### 企信RPA
文件名：`企信RPA_{昵称}_{微信号}_群发列表.xlsx`
Sheet名：`【{昵称}】通讯录`
列（20列）：所属微信昵称, 所属微信号, 类型, 名称, 昵称, 微信号, 备注, 朋友权限, 个性签名, 标签, 描述, 电话, 来源, 地区, 打招呼自定义备注1~6

## 注意事项

- 处理敏感数据（微信号、联系人），所有处理在浏览器端完成
- Excel 导出使用 File System Access API（Chrome/Edge），不支持时回退到 Blob 下载
- 微信表情有两套映射：HTML 渲染用 PNG 图片，Excel 导出用 Unicode
