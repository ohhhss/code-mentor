import { useEffect, useState } from 'react';
import '@/styles/AnalyzingScreen.css';

interface AnalyzingScreenProps {
  projectName: string;
  projectAccentColor: string;
  onComplete: () => void;
}

const codeLines = [
  '<span class="analyzing-code-keyword">import</span> { useState } <span class="analyzing-code-keyword">from</span> <span class="analyzing-code-string">\'react\'</span>;',
  '<span class="analyzing-code-comment">// Main component</span>',
  '<span class="analyzing-code-keyword">function</span> <span class="analyzing-code-function">App</span>() {',
  '  <span class="analyzing-code-keyword">const</span> [data, setData] = <span class="analyzing-code-function">useState</span>(<span class="analyzing-code-keyword">null</span>);',
  '  <span class="analyzing-code-keyword">return</span> &lt;div&gt;...&lt;/div&gt;;',
  '}',
  '<span class="analyzing-code-keyword">export</span> <span class="analyzing-code-keyword">default</span> App;',
  '',
  '<span class="analyzing-code-comment">// Analyzing architecture...</span>',
  '<span class="analyzing-code-keyword">const</span> result = <span class="analyzing-code-function">analyze</span>(codebase);',
];

const stages = [
  { id: 0, text: '📂 解析项目结构...', delay: 0 },
  { id: 1, text: '🔍 识别核心模块...', delay: 500 },
  { id: 2, text: '✨ 生成教学解读...', delay: 1200 },
];

export function AnalyzingScreen({ projectName, projectAccentColor, onComplete }: AnalyzingScreenProps) {
  const [activeStage, setActiveStage] = useState(-1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    stages.forEach((stage) => {
      timers.push(setTimeout(() => {
        setActiveStage(stage.id);
      }, stage.delay));
    });

    timers.push(setTimeout(() => {
      onComplete();
    }, 2000));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div className="analyzing-screen" style={{ '--accent-color': projectAccentColor } as React.CSSProperties}>
      <div className="analyzing-container">
        <h2 className="analyzing-project-name" style={{ color: projectAccentColor }}>
          正在分析 {projectName}
        </h2>

        <div className="analyzing-scan-container">
          <div className="analyzing-code-lines">
            {codeLines.map((line, index) => (
              <span
                key={index}
                className="analyzing-code-line"
                dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
              />
            ))}
          </div>
          <div className="analyzing-scan-glow" />
          <div className="analyzing-scan-line" />
        </div>

        <div className="analyzing-stages">
          {stages.map((stage) => {
            let stageClass = 'analyzing-stage';
            if (activeStage === stage.id) {
              stageClass += ' active';
            } else if (activeStage > stage.id) {
              stageClass += ' completed';
            }
            return (
              <div key={stage.id} className={stageClass}>
                {stage.text}
              </div>
            );
          })}
        </div>

        <div className="analyzing-progress-container">
          <div className="analyzing-progress-bar" />
        </div>
      </div>
    </div>
  );
}
