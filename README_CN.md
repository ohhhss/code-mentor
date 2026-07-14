<div align="center">

# 🏗️ Code Mentor

**AI 源码导读导师 — 像资深工程师一样手把手带你读源码**

[![Built with TRAE](https://img.shields.io/badge/Built%20with-TRAE-blueviolet?style=for-the-badge)](https://trae.ai)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

[English](README.md) | 中文

</div>

---

> 🚀 **在线体验**：[https://ohhhss.github.io/code-mentor/](https://ohhhss.github.io/code-mentor/)

---

## 🎯 Demo 简介

**是什么**：Code Mentor 是一款面向编程初学者的 **AI 源码导读网站**，像一位资深工程师在身边手把手带你读懂优秀开源项目的源码。

**面向谁**：编程初学者、想阅读优秀开源项目但不知从何下手的开发者、准备技术面试需要理解项目源码的学生。

### 核心功能

- 🏗️ **项目架构鸟瞰**：自动生成项目分层架构示意图，展示核心模块、技术栈和设计亮点，让你**先见森林再见树木**。
- 📖 **逐行代码讲解**：AI 导师用通俗易懂的比喻逐段解读代码，关键概念高亮标注，点击即可查看详细解释。
- 📤 **上传自己的项目**：配置 DeepSeek API Key 后，可以上传自己的项目文件夹，AI 自动分析所有文件并生成专属架构视图和逐文件讲解。
- 🚶 **逐步走读模式**：按执行流程一步步带你读代码，高亮当前讲解区域，真正理解代码的运行逻辑。
- 🌓 **浅色/深色主题**：精心设计的双主题配色，代码在任何模式下都清晰可读。

---

## 💡 Demo 创作思路

### 灵感来源

很多初学者面对 GitHub 上的优秀开源项目都会陷入"打开源码 → 看不懂 → 关掉页面"的死循环。我自己在学习源码时也常常不知道该从哪个文件开始读、各模块之间是什么关系、某段代码为什么要这样写。网上的源码解析文章往往只讲核心片段，缺乏对整体架构的系统性梳理，也无法针对你自己的项目进行定制化讲解。

### 想解决的问题

- **"从哪开始读"的迷茫**：打开一个开源项目仓库，几十个文件不知从何下手
- **架构黑盒**：看完单个文件仍然不理解模块间如何协作、整体数据流是什么
- **代码读不懂**：缺乏对关键设计模式、语法糖、框架 API 的即时解释
- **自己的项目没人讲**：教程只讲热门开源项目，实际工作中你自己的项目代码没人帮你梳理

### 为什么做这个方向

AI 最大的价值之一就是**降低学习门槛**。与其让 AI 帮你写代码（那会让你丧失思考能力），不如让 AI 当一位耐心的导师，教你读懂已经写好的优秀代码——这才是真正提升编程能力的路径。选择做 Web 端而非插件/App，因为源码阅读天然需要大屏+多栏布局（文件树｜代码区｜讲解面板），网页是最适合的载体。

---

## 🛠️ 快速开始

### 本地运行

```bash
# 克隆项目
git clone https://github.com/ohhhss/code-mentor.git
cd code-mentor

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5184/` 即可体验。

### 使用说明

1. **体验内置示例**：首页提供了 [mitt](https://github.com/developit/mitt)（轻量级事件发布订阅库）作为入门示例，无需配置 API 即可完整体验架构视图、逐行讲解、逐步走读功能。
2. **上传自己的项目**：
   - 点击首页横幅中的"上传你的项目"按钮
   - 配置你的 DeepSeek API Key（注册即送免费额度）
   - 拖拽或选择项目文件夹上传
   - 等待 AI 分析完成，即可查看专属架构视图和文件讲解

### 构建生产版本

```bash
npm run build
npm run preview
```

---

## 🏛️ 技术架构

```
code-mentor/
├── src/
│   ├── components/       # React 组件
│   │   ├── HomePage.tsx       # 首页（示例项目列表 + CTA横幅）
│   │   ├── AnalyzePage.tsx    # 源码讲解页（三栏布局）
│   │   ├── UploadPage.tsx     # 上传项目页（文件树 + 架构视图）
│   │   ├── ArchitectureView.tsx  # 架构示意图组件
│   │   ├── CodeViewer.tsx     # 代码高亮查看器
│   │   ├── MentorPanel.tsx    # AI导师讲解面板
│   │   ├── FileTree.tsx       # 文件树导航
│   │   └── ...
│   ├── services/
│   │   └── aiAnalysis.ts      # AI分析服务（单文件+项目架构）
│   ├── data/
│   │   └── projects/          # 内置示例项目数据
│   ├── hooks/                 # 自定义 Hooks
│   ├── styles/                # CSS 样式文件
│   └── types/                 # TypeScript 类型定义
├── public/              # 静态资源
└── package.json
```

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 代码高亮 | prism-react-renderer |
| 图标 | Lucide React |
| AI 接入 | DeepSeek API（OpenAI 兼容） |
| 样式 | 原生 CSS（CSS 变量 + 毛玻璃设计系统） |

---

## 🤖 TRAE 实践过程

本项目完全使用 [TRAE AI 编程助手](https://trae.ai) 开发，以下是完整的开发流程：

### 阶段一：项目初始化与基础功能搭建

使用自然语言描述需求："我要做一个 AI 源码导读网站"。TRAE 自动完成了项目脚手架搭建、依赖安装、目录结构规划。通过多轮对话描述各组件功能，TRAE 生成了 HomePage、CodeViewer、MentorPanel、FileTree 等核心组件。

### 阶段二：问题驱动的迭代优化

**典型工作流示例**：
- 描述问题："浅色模式下部分代码不容易看清" → TRAE 自动分析 22 种代码 Token 配色对比度，重新设计了高对比度双主题
- 描述需求："讲解部分不够详细，把用户当纯小白" → TRAE 调整 AI 系统提示词，添加比喻式讲解和逐步走读功能
- 描述期望："上传项目入口要更醒目" → TRAE 设计了全宽蓝紫渐变 CTA 横幅，带脉冲发光动画

### 阶段三：功能扩展 — 上传自己的项目

使用 `/spec` 命令触发需求规格化，TRAE 自动生成功能规格文档；使用 `/plan` 命令生成分步实现计划。实现了文件上传、API 配置、模型自动获取、文件树展示、单文件/批量分析、进度跟踪、结果缓存等完整功能。

### 阶段四：设计优化 — 视觉与交互提升

调用 `frontend-design` 技能进行全局设计系统重构，采用"Refined Studio"风格，包含渐变毛玻璃背景、浮动光斑动画、精心调校的颜色/阴影/圆角/字体系统。调用 `web-design-guidelines` 技能进行无障碍和性能审查，修复了 `transition: all` 性能反模式、添加了键盘导航、ARIA 标签、focus 状态。

### 阶段五：上传项目的架构视图

使用 Plan Mode 规划架构视图集成，将进阶模式中的架构示意图和模块详情展示复用到上传页面，实现了批量分析后自动生成项目架构、视图切换 Tab（架构/文件讲解）、compact 模式样式适配窄侧边栏。

### TRAE 使用心得

| 环节 | TRAE 的作用 | 开发者角色 |
|------|------------|-----------|
| 需求沟通 | 理解自然语言意图，追问歧义点 | 描述"我想要什么"和"为什么" |
| 方案设计 | `/spec` 生成规格，`/plan` 生成计划 | 审阅计划，确认方向 |
| 编码实现 | 生成组件/样式/类型/服务逻辑 | 观察结果，指出不满意处 |
| Bug 修复 | 自动定位根因（如内联样式覆盖） | 描述"出现了什么问题" |
| 设计优化 | 调用 frontend-design 技能 | 给出风格偏好 |
| 代码审查 | 调用 web-design-guidelines 检查无障碍/性能 | 认可结果，批准修改 |

**效率提升**：原本需要 2-3 天的开发工作，在 TRAE 辅助下数小时内完成。不需要记忆 API 文档和 CSS 属性，描述效果即可。

---

## 📄 License

MIT
