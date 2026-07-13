import type { Project, FullProjectData, LargeProjectData } from '@/types';
import { mittProjectData } from './mitt';
import { trekProjectData } from './trek';
import { codebaseMemoryData } from './codebase-memory';
import { strixProjectData } from './strix';

export const projects: Project[] = [
  {
    id: 'mitt',
    name: 'mitt',
    description: '一个只有200字节的微型函数式事件发射器/PubSub库，是学习TypeScript类型设计、函数式编程和极简库设计的绝佳案例。',
    tagline: '200字节的事件发射器，TypeScript类型安全的发布订阅模式典范',
    githubUrl: 'https://github.com/developit/mitt',
    stars: 11000,
    difficulty: 'beginner',
    techStack: ['TypeScript', 'Event Emitter', 'Pub/Sub'],
    estimatedTime: '15分钟',
    isWalkthrough: true,
    accentColor: '#3b82f6',
  },
  {
    id: 'trek',
    name: 'TREK',
    description: '实时协作旅行规划平台，使用NestJS + React + WebSocket + Mapbox构建，支持多人实时协同编辑行程、地图交互、预算管理，具有设计精良的插件SDK架构。',
    tagline: '实时协作旅行规划平台，NestJS WebSocket多人协作与插件架构实战',
    githubUrl: 'https://github.com/example/trek',
    stars: 320,
    difficulty: 'intermediate',
    techStack: ['NestJS', 'React', 'WebSocket', 'Mapbox'],
    estimatedTime: '25分钟',
    isWalkthrough: false,
    accentColor: '#10b981',
  },
  {
    id: 'codebase-memory',
    name: 'codebase-memory-mcp',
    description: 'C语言实现的高性能代码智能分析引擎，通过Tree-sitter解析158种语言构建代码知识图谱，提供LSP支持和3D代码可视化，学习系统级编程和增量解析的高级项目。',
    tagline: '158种语言代码知识图谱引擎，Tree-sitter增量解析与C语言系统级架构',
    githubUrl: 'https://github.com/example/codebase-memory-mcp',
    stars: 890,
    difficulty: 'advanced',
    techStack: ['C', 'tree-sitter', 'SQLite', 'LSP'],
    estimatedTime: '30分钟',
    isWalkthrough: false,
    accentColor: '#f59e0b',
  },
  {
    id: 'strix',
    name: 'strix',
    description: 'AI驱动的自动化渗透测试工具，编排多个安全Agent执行侦察、扫描、漏洞利用全流程，使用LangChain + Docker沙箱 + Playwright构建，学习多Agent系统架构的实战项目。',
    tagline: 'AI多Agent渗透测试框架，Docker沙箱隔离与ReAct Agent编排设计',
    githubUrl: 'https://github.com/example/strix',
    stars: 2100,
    difficulty: 'advanced',
    techStack: ['Python', 'Multi-Agent', 'Docker', 'Security'],
    estimatedTime: '30分钟',
    isWalkthrough: false,
    accentColor: '#ef4444',
  },
];

export const fullProjectData: Record<string, FullProjectData> = {
  'mitt': mittProjectData,
};

export const largeProjectData: Record<string, LargeProjectData> = {
  'trek': trekProjectData,
  'codebase-memory': codebaseMemoryData,
  'strix': strixProjectData,
};
