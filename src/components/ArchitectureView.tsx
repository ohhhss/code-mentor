import { Box, Layers, Sparkles, CheckCircle, ArrowDown } from 'lucide-react';
import type { ArchitectureOverview } from '@/types';
import '@/styles/ArchitectureView.css';

interface ArchitectureViewProps {
  projectName: string;
  architecture: ArchitectureOverview;
  accentColor: string;
}

interface DiagramLayer {
  label: string;
  modules: { name: string; description?: string }[];
}

function getProjectDiagram(projectId: string, modules: ArchitectureOverview['modules']): DiagramLayer[] {
  if (projectId === 'trek') {
    return [
      {
        label: '客户端/外部',
        modules: [{ name: 'React SPA + Mapbox GL', description: '桌面/移动端' }]
      },
      {
        label: '入口层',
        modules: [{ name: 'API Gateway', description: 'NestJS HTTP/WebSocket' }]
      },
      {
        label: '核心服务',
        modules: [
          { name: 'Collaboration Engine', description: 'WebSocket实时协作' },
          { name: 'Trip Planner', description: '行程规划' },
          { name: 'Budget Calculator', description: '预算计算' },
          { name: 'Plugin Runtime', description: '插件运行时' }
        ]
      },
      {
        label: '数据/外部服务',
        modules: [
          { name: 'PostgreSQL', description: '数据存储' },
          { name: 'Redis', description: '缓存/会话' },
          { name: 'Mapbox API', description: '地理服务' }
        ]
      }
    ];
  }

  if (projectId === 'codebase-memory') {
    return [
      {
        label: '输入层',
        modules: [{ name: 'Code Input', description: '文件系统/编辑器' }]
      },
      {
        label: '解析层',
        modules: [{ name: 'Multi-language Parser', description: 'Tree-sitter增量解析' }]
      },
      {
        label: '分析层',
        modules: [{ name: 'Symbol Extractor', description: '符号提取' }]
      },
      {
        label: '存储层',
        modules: [{ name: 'Knowledge Graph', description: 'SQLite图存储' }]
      },
      {
        label: '输出层',
        modules: [
          { name: 'LSP Server', description: '编辑器集成' },
          { name: 'WASM + 3D UI', description: '浏览器可视化' }
        ]
      }
    ];
  }

  if (projectId === 'strix') {
    return [
      {
        label: '用户输入',
        modules: [
          { name: 'CLI', description: '命令行' },
          { name: 'REST API', description: 'API接口' }
        ]
      },
      {
        label: '编排层',
        modules: [{ name: 'Scan Orchestrator', description: '阶段调度/状态管理' }]
      },
      {
        label: 'Agent层',
        modules: [
          { name: 'Recon Agent', description: '侦察' },
          { name: 'Scanner Agent', description: '漏洞扫描' },
          { name: 'Exploiter Agent', description: '漏洞利用' },
          { name: 'Reporter Agent', description: '报告' }
        ]
      },
      {
        label: '执行层',
        modules: [
          { name: 'Docker Sandbox', description: '隔离容器' },
          { name: 'Playwright', description: '浏览器自动化' }
        ]
      },
      {
        label: '输出',
        modules: [{ name: 'Reports', description: '结构化渗透报告' }]
      }
    ];
  }

  const mid = Math.floor(modules.length / 2);
  return [
    {
      label: '上层',
      modules: modules.slice(0, Math.max(1, mid - 1)).map(m => ({ name: m.name, description: m.description }))
    },
    {
      label: '核心层',
      modules: modules.slice(Math.max(1, mid - 1), mid + 1).map(m => ({ name: m.name, description: m.description }))
    },
    {
      label: '底层',
      modules: modules.slice(mid + 1).map(m => ({ name: m.name, description: m.description }))
    }
  ];
}

function DiagramLayerComponent({ layer, isLast, accentColor }: { layer: DiagramLayer; isLast: boolean; accentColor: string }) {
  return (
    <div className="diagram-layer">
      <div className="diagram-layer-label">{layer.label}</div>
      <div className="diagram-modules">
        {layer.modules.map((mod, idx) => (
          <div
            key={idx}
            className="diagram-module-card"
            style={{ '--accent': accentColor } as React.CSSProperties}
          >
            <div className="diagram-module-name">{mod.name}</div>
            {mod.description && (
              <div className="diagram-module-desc">{mod.description}</div>
            )}
          </div>
        ))}
      </div>
      {!isLast && (
        <div className="diagram-connector">
          <ArrowDown size={20} className="diagram-arrow" />
        </div>
      )}
    </div>
  );
}

export function ArchitectureView({ projectName, architecture, accentColor }: ArchitectureViewProps) {
  const projectId = projectName === 'TREK' ? 'trek' :
                    projectName === 'codebase-memory-mcp' ? 'codebase-memory' :
                    projectName === 'strix' ? 'strix' : projectName.toLowerCase();
  const diagramLayers = getProjectDiagram(projectId, architecture.modules);

  return (
    <div
      className="architecture-view"
      style={{ '--accent': accentColor } as React.CSSProperties}
    >
      <section className="arch-header">
        <h1 className="arch-project-name" style={{ color: accentColor }}>
          {projectName}
        </h1>
        <div className="arch-tech-stack">
          {architecture.techStack.map((tech, idx) => (
            <span key={idx} className="arch-tech-badge">{tech}</span>
          ))}
        </div>
        <p className="arch-summary">{architecture.summary}</p>
      </section>

      <section className="arch-diagram-section">
        <h2 className="arch-section-title">
          <Layers size={20} />
          架构示意图
        </h2>
        <div className="arch-diagram">
          {diagramLayers.map((layer, idx) => (
            <DiagramLayerComponent
              key={idx}
              layer={layer}
              isLast={idx === diagramLayers.length - 1}
              accentColor={accentColor}
            />
          ))}
        </div>
      </section>

      <section className="arch-modules-section">
        <h2 className="arch-section-title">
          <Box size={20} />
          核心模块
        </h2>
        <div className="arch-modules-list">
          {architecture.modules.map((mod, idx) => (
            <div key={idx} className="arch-module-detail-card">
              <div className="arch-module-detail-header">
                <Box size={18} className="arch-module-icon" />
                <h3 className="arch-module-detail-name">{mod.name}</h3>
              </div>
              <p className="arch-module-detail-desc">{mod.description}</p>
              <p className="arch-module-detail-responsibilities">{mod.responsibilities}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="arch-highlights-section">
        <h2 className="arch-section-title">
          <Sparkles size={20} />
          设计亮点
        </h2>
        <ul className="arch-highlights-list">
          {architecture.designHighlights.map((highlight, idx) => (
            <li key={idx} className="arch-highlight-item">
              <CheckCircle size={18} className="arch-highlight-icon" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="arch-cta-section">
        <div className="arch-cta-block">
          <span className="arch-cta-emoji">👉</span>
          <span>点击左侧精选代码段，深入学习核心实现</span>
        </div>
      </section>
    </div>
  );
}
