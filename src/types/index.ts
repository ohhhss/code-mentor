// 难度等级
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// 项目信息
export interface Project {
  id: string;
  name: string;
  description: string;
  tagline: string; // 一句话标语
  githubUrl: string;
  stars: number;
  difficulty: Difficulty;
  techStack: string[];
  estimatedTime: string; // 预计学习时长
  isWalkthrough: boolean; // 是否为完整走读项目（mitt=true，其他=false表示精选文件模式）
  accentColor: string; // 主题强调色
}

// 文件树节点
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string; // 代码语言：typescript, json, markdown 等
  isEntry?: boolean; // 是否为入口/重点文件
}

// 代码行解读
export interface LineExplanation {
  lineNumbers: [number, number]; // 起止行号（闭区间）
  title: string; // 简短标题
  content: string; // 详细解读（严谨专业导师风格，可以包含知识点标记 [[知识点名]]）
  knowledgePoints?: string[]; // 关联的知识点ID
}

// 文件教学内容
export interface FileLesson {
  filePath: string;
  overview: string; // 文件作用概述（2-4句话）
  keyConcepts: string[]; // 关键概念名称列表
  coreIdeas: string[]; // 核心思路要点列表
  lineExplanations: LineExplanation[]; // 逐行/逐段解读
}

// 知识点
export interface KnowledgePoint {
  id: string;
  name: string;
  category: 'typescript' | 'javascript' | 'design-pattern' | 'architecture' | 'general';
  explanation: string; // 简明解释（3-5句话）
  codeExample?: string; // 可选代码示例
}

// 逐步讲解步骤
export interface WalkthroughStep {
  id: number;
  title: string;
  description: string;
  filePath: string;
  highlightLines: [number, number]; // 高亮的行范围
  keyInsight: string; // 核心洞见
}

// 精选代码段（用于大型项目，非完整文件）
export interface CodeSnippet {
  id: string;
  title: string;
  whyThisFile: string; // 为什么选这个文件/代码段
  language: string;
  code: string;
  explanation: string; // 代码段讲解
  lineExplanations?: LineExplanation[]; // 可选的逐行解读
  walkthroughSteps?: WalkthroughStep[]; // 可选的逐步讲解步骤
}

// AI 分析结果
export interface AiAnalysisResult {
  overview: string; // 文件概述
  coreIdeas: string[]; // 核心思路
  keyConcepts: string[]; // 关键概念
  lineExplanations: LineExplanation[]; // 逐行解读
  walkthroughSteps: WalkthroughStep[]; // 逐步讲解步骤
}

// API Key 配置
export interface ApiKeyConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// 上传的文件
export interface UploadedFile {
  path: string;
  name: string;
  content: string;
  language: string;
}

// 批量分析结果
export interface BatchAnalysisResult {
  results: Record<string, AiAnalysisResult>; // filePath -> result
  errors: Record<string, string>;            // filePath -> error message
}

// 大型项目架构概览
export interface ArchitectureOverview {
  summary: string; // 项目简介（3-5句话）
  techStack: string[];
  modules: { name: string; description: string; responsibilities: string }[];
  diagramDescription: string; // 架构图描述（用文字描述模块关系，用于SVG绘制）
  designHighlights: string[]; // 设计亮点
}

// 大型项目数据
export interface LargeProjectData {
  projectId: string;
  architecture: ArchitectureOverview;
  snippets: CodeSnippet[];
}

// 完整项目数据（mitt用）
export interface FullProjectData {
  projectId: string;
  fileTree: FileNode;
  files: Record<string, { content: string; lesson: FileLesson }>; // path -> { content, lesson }
  walkthroughSteps: WalkthroughStep[];
}
