<div align="center">

# 🏗️ Code Mentor

**AI Source Code Mentor — Read code like a senior engineer is sitting right next to you**

[![Built with TRAE](https://img.shields.io/badge/Built%20with-TRAE-blueviolet?style=for-the-badge)](https://trae.ai)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

English | [中文](README_CN.md)

</div>

---

> 📖 **Looking for the Chinese version?** [点击查看中文版 README](README_CN.md)

---

## 🎯 Demo Overview

**What it is**: Code Mentor is an **AI-powered source code reading web app** designed for beginners — it's like having a senior engineer sitting right next to you, walking you through great open-source projects step by step.

**Who it's for**: Programming beginners, developers who want to read great open-source projects but don't know where to start, and students preparing for technical interviews who need to understand project source code.

### Core Features

- 🏗️ **Architecture Bird's-Eye View** — Automatically generates a layered architecture diagram showing core modules, tech stack, and design highlights, so you **see the forest before the trees**.
- 📖 **Line-by-Line Explanation** — The AI mentor explains code section by section using plain language and everyday analogies. Key concepts are highlighted — click to see detailed explanations.
- 📤 **Upload Your Own Projects** — After configuring your DeepSeek API Key, you can upload your own project folders. The AI automatically analyzes all files and generates a custom architecture view and per-file explanations.
- 🚶 **Step-by-Step Walkthrough** — Read code along the execution path; the current line is highlighted so you truly understand how the code runs.
- 🌓 **Light/Dark Themes** — Carefully designed dual-theme color system ensures code is clearly readable in both modes.

---

## 💡 Inspiration & Design Thinking

### Inspiration

Many beginners face the same loop when encountering great open-source projects on GitHub: "open source code → can't understand → close tab." I've been there myself — staring at dozens of files not knowing where to start, unable to see how modules relate, and wondering why certain code is written that way. Online tutorials usually only cover core fragments, lacking a systematic overview of the overall architecture, and they certainly can't give custom explanations for your own projects.

### Problems Solved

- **"Where do I start?"** — Opening a repo with dozens of files and feeling lost
- **Architecture black box** — Reading individual files but still not understanding how modules collaborate or how data flows
- **Code that doesn't make sense** — Missing instant explanations for design patterns, syntax sugar, and framework APIs
- **No one explains your own code** — Tutorials only cover popular open-source projects, not the code you actually work with

### Why This Direction

I believe one of AI's greatest values is **lowering the barrier to learning**. Rather than having AI write code for you (which makes you stop thinking), using AI as a patient mentor to help you read well-written code is what truly improves your programming ability. I chose to build a web app rather than a plugin or native app because source code reading naturally needs a large screen with a multi-column layout (file tree | code area | explanation panel) — the web is the perfect medium.

---

## 🛠️ Quick Start

### Run Locally

```bash
# Clone the repo
git clone https://github.com/ohhhss/code-mentor.git
cd code-mentor

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5184/` in your browser.

### How to Use

1. **Try the built-in example**: The homepage features [mitt](https://github.com/developit/mitt) (a lightweight event emitter library) as a starter project. No API configuration needed — you can experience the architecture view, line-by-line explanations, and step-by-step walkthrough right away.
2. **Upload your own project**:
   - Click the "Upload Your Project" banner on the homepage
   - Configure your DeepSeek API Key (free credits available on sign-up)
   - Drag & drop or select a project folder
   - Wait for AI analysis to complete, then explore your custom architecture view and file explanations

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🏛️ Architecture

```
code-mentor/
├── src/
│   ├── components/          # React components
│   │   ├── HomePage.tsx          # Homepage (project cards + CTA banner)
│   │   ├── AnalyzePage.tsx       # Code reading page (3-column layout)
│   │   ├── UploadPage.tsx        # Upload page (file tree + architecture view)
│   │   ├── ArchitectureView.tsx  # Architecture diagram component
│   │   ├── CodeViewer.tsx        # Syntax-highlighted code viewer
│   │   ├── MentorPanel.tsx       # AI mentor explanation panel
│   │   ├── FileTree.tsx          # File tree navigation
│   │   └── ...
│   ├── services/
│   │   └── aiAnalysis.ts         # AI analysis service (single file + project architecture)
│   ├── data/
│   │   └── projects/             # Built-in example project data
│   ├── hooks/                    # Custom React hooks
│   ├── styles/                   # CSS stylesheets
│   └── types/                    # TypeScript type definitions
├── public/                 # Static assets
└── package.json
```

### Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Syntax Highlighting | prism-react-renderer |
| Icons | Lucide React |
| AI Integration | DeepSeek API (OpenAI-compatible) |
| Styling | Vanilla CSS (CSS variables + glassmorphism design system) |

---

## 🤖 Building with TRAE

This project was built entirely with [TRAE AI Coding Assistant](https://trae.ai). Here's the complete development workflow:

### Phase 1: Project Setup & Foundation

Described the product idea in natural language: "I want to build an AI source code reading website." TRAE automatically handled project scaffolding, dependency installation, and directory structure planning. Through multi-turn conversations describing each component's purpose, TRAE generated core components like HomePage, CodeViewer, MentorPanel, and FileTree.

### Phase 2: Iteration Through Problem-Solving

**Typical workflow examples**:
- Reported issue: "Code is hard to read in light mode" → TRAE analyzed color contrast for all 22 code token types and redesigned a high-contrast dual theme
- Requested: "Make explanations more beginner-friendly, treat users as complete newbies" → TRAE adjusted the AI system prompt to use analogies and added a step-by-step walkthrough mode
- Desired: "Make the upload project entry more eye-catching" → TRAE designed a full-width gradient CTA banner with pulse glow animation and sparkle effects

### Phase 3: Feature Expansion — Upload Your Own Projects

Used `/spec` to trigger requirements specification — TRAE auto-generated a detailed spec document. Used `/plan` to generate a step-by-step implementation plan. Implemented file upload, API configuration, automatic model discovery, file tree display, single-file/batch analysis, progress tracking, and result caching.

### Phase 4: Design Polish — Visual & Interaction

Called the `frontend-design` skill for a global design system overhaul, adopting a "Refined Studio" aesthetic with gradient glassmorphism backgrounds, floating light orbs, and carefully tuned colors/shadows/radii/typography. Called the `web-design-guidelines` skill for accessibility and performance audit — fixed `transition: all` anti-patterns, added keyboard navigation, ARIA labels, and focus states.

### Phase 5: Architecture View for Uploaded Projects

Used Plan Mode to integrate the architecture diagram from advanced mode into the upload page, enabling automatic project architecture generation after batch analysis, a view toggle tab (Architecture / File Explanation), and compact-mode styling to fit the narrow sidebar.

### Key Takeaways from Using TRAE

| Stage | TRAE's Role | Developer's Role |
|-------|------------|-----------------|
| Requirements | Understands natural language, asks clarifying questions | Describe "what I want" and "why" |
| Design | `/spec` generates specs, `/plan` generates plans | Review plans, confirm direction |
| Coding | Generates components/styles/types/services | Observe results, point out issues |
| Bug fixing | Auto-diagnoses root causes (e.g., inline style overrides) | Describe "what went wrong" |
| Design polish | Calls frontend-design skill | Express style preferences |
| Code review | Calls web-design-guidelines for a11y/perf | Approve changes |

**Efficiency gain**: What would normally take 2–3 days of development was completed in hours with TRAE. No need to memorize API docs or CSS properties — just describe the effect you want.

---

## 📄 License

MIT
