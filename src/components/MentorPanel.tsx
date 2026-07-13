import { useState, useRef, useEffect } from 'react';
import { GraduationCap, Lightbulb, ChevronLeft, ChevronRight, BookOpen, Check } from 'lucide-react';
import type { FileLesson, LineExplanation, WalkthroughStep } from '@/types';
import { knowledgePoints } from '@/data/knowledgePoints';
import '@/styles/MentorPanel.css';

interface MentorPanelProps {
  lesson?: FileLesson;
  snippetExplanation?: string;
  snippetWhyThisFile?: string;
  selectedLine: number | null;
  onKnowledgePointClick: (kpId: string) => void;
  variant: 'walkthrough' | 'snippets';
  extraContent?: React.ReactNode;
  walkthroughMode?: boolean;
  currentStep?: WalkthroughStep | null;
  currentStepIndex?: number;
  totalSteps?: number;
  onToggleWalkthrough?: () => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  onCompleteWalkthrough?: () => void;
}

function parseContentWithKnowledgePoints(
  text: string,
  onKpClick: (id: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[\[([^\]]+)\]\]|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    if (match[1]) {
      const kpId = match[1];
      const kp = knowledgePoints[kpId];
      parts.push(
        <span
          key={key++}
          className="mentor-kp-inline"
          onClick={() => onKpClick(kpId)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onKpClick(kpId);
            }
          }}
        >
          {kp ? kp.name : kpId}
        </span>
      );
    } else if (match[2]) {
      parts.push(
        <code key={key++} className="mentor-code-inline">{match[2]}</code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={key++}>{text.slice(lastIndex)}</span>
    );
  }

  return parts;
}

function findLineExplanation(
  explanations: LineExplanation[],
  line: number
): LineExplanation | null {
  return explanations.find(
    (exp) => line >= exp.lineNumbers[0] && line <= exp.lineNumbers[1]
  ) || null;
}

export function MentorPanel({
  lesson,
  snippetExplanation,
  snippetWhyThisFile,
  selectedLine,
  onKnowledgePointClick,
  variant,
  extraContent,
  walkthroughMode = false,
  currentStep = null,
  currentStepIndex = 0,
  totalSteps = 0,
  onToggleWalkthrough,
  onPrevStep,
  onNextStep,
  onCompleteWalkthrough,
}: MentorPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'line'>('overview');
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = {
    overview: useRef<HTMLButtonElement>(null),
    line: useRef<HTMLButtonElement>(null),
  };

  useEffect(() => {
    const activeTabRef = tabRefs[activeTab].current;
    if (activeTabRef && activeTabRef.parentElement) {
      const parentRect = activeTabRef.parentElement.getBoundingClientRect();
      const tabRect = activeTabRef.getBoundingClientRect();
      setTabIndicatorStyle({
        left: tabRect.left - parentRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  const renderSnippetContent = () => (
    <div className="mentor-panel-content">
      {extraContent && <div className="mentor-extra-content">{extraContent}</div>}
      {snippetWhyThisFile && (
        <div className="mentor-section">
          <div className="mentor-snippet-why">
            <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              💡 为什么选这个文件
            </div>
            {parseContentWithKnowledgePoints(snippetWhyThisFile, onKnowledgePointClick)}
          </div>
        </div>
      )}
      {snippetExplanation && (
        <div className="mentor-section">
          <div className="mentor-snippet-content">
            {parseContentWithKnowledgePoints(snippetExplanation, onKnowledgePointClick)}
          </div>
        </div>
      )}
    </div>
  );

  const renderOverviewTab = () => (
    <div className="mentor-panel-content">
      {extraContent && <div className="mentor-extra-content">{extraContent}</div>}
      {lesson && (
        <>
          <div className="mentor-section">
            <h3 className="mentor-section-title">文件概述</h3>
            <p className="mentor-overview-text">
              {parseContentWithKnowledgePoints(lesson.overview, onKnowledgePointClick)}
            </p>
          </div>

          <div className="mentor-section">
            <h3 className="mentor-section-title">核心思路</h3>
            <ul className="mentor-core-ideas">
              {lesson.coreIdeas.map((idea, i) => (
                <li key={i} className="mentor-core-idea-item">
                  <span className="mentor-core-idea-icon" style={{ color: 'var(--accent-color)' }}>
                    <Lightbulb size={16} />
                  </span>
                  <span>{parseContentWithKnowledgePoints(idea, onKnowledgePointClick)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mentor-section">
            <h3 className="mentor-section-title">关键知识点</h3>
            <div className="mentor-key-concepts">
              {lesson.keyConcepts.map((concept, i) => (
                <span
                  key={i}
                  className="mentor-concept-tag"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-color) 15%, transparent)',
                    color: 'var(--accent-color)',
                  }}
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderLineTab = () => {
    if (!lesson) return null;

    if (selectedLine === null) {
      return (
        <div className="mentor-panel-content">
          <div className="mentor-line-prompt" style={{ fontSize: '15px', padding: '80px 20px' }}>
            👆 点击左侧代码行，查看导师的详细解读
          </div>
        </div>
      );
    }

    const lineExp = findLineExplanation(lesson.lineExplanations, selectedLine);

    if (!lineExp) {
      return (
        <div className="mentor-panel-content">
          <div className="mentor-line-prompt">
            这一行没有额外解读，试试点击其他高亮的代码行
          </div>
        </div>
      );
    }

    return (
      <div className="mentor-panel-content">
        <div className="mentor-line-explanation">
          <div className="mentor-line-header">
            <span className="mentor-line-range">
              第 {lineExp.lineNumbers[0]}-{lineExp.lineNumbers[1]} 行
            </span>
            <h3 className="mentor-line-title">{lineExp.title}</h3>
          </div>
          <div className="mentor-line-content">
            {parseContentWithKnowledgePoints(lineExp.content, onKnowledgePointClick)}
          </div>
        </div>
      </div>
    );
  };

  const renderWalkthroughToggle = () => {
    if (!onToggleWalkthrough) return null;
    return (
      <div className="mentor-walkthrough-toggle-wrapper">
        <button
          id="walkthrough-toggle-btn"
          type="button"
          className={`mentor-walkthrough-toggle-btn ${walkthroughMode ? 'active' : ''}`}
          onClick={onToggleWalkthrough}
        >
          <BookOpen size={16} />
          {walkthroughMode ? '退出逐步讲解' : '📖 开始逐步讲解'}
        </button>
      </div>
    );
  };

  const renderWalkthroughStepContent = () => {
    if (!currentStep) return null;
    return (
      <div className="mentor-walkthrough-step">
        <div className="mentor-walkthrough-step-header">
          <h2 className="mentor-walkthrough-step-title">{currentStep.title}</h2>
        </div>
        <div className="mentor-walkthrough-step-description">
          {parseContentWithKnowledgePoints(currentStep.description, onKnowledgePointClick)}
        </div>
        <div className="mentor-walkthrough-step-insight">
          <div className="mentor-walkthrough-step-insight-icon">💡</div>
          <div className="mentor-walkthrough-step-insight-content">
            {parseContentWithKnowledgePoints(currentStep.keyInsight, onKnowledgePointClick)}
          </div>
        </div>
      </div>
    );
  };

  const renderWalkthroughControls = () => {
    if (!walkthroughMode || totalSteps === 0) return null;
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === totalSteps - 1;

    return (
      <div className="mentor-walkthrough-controls">
        <div className="mentor-walkthrough-progress">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`mentor-walkthrough-progress-dot ${i === currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
            />
          ))}
        </div>
        <div className="mentor-walkthrough-step-indicator">
          第 {currentStepIndex + 1} / {totalSteps} 步
        </div>
        <div className="mentor-walkthrough-nav-buttons">
          <button
            type="button"
            className="mentor-walkthrough-nav-btn"
            onClick={onPrevStep}
            disabled={isFirstStep}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className={`mentor-walkthrough-nav-btn primary ${isLastStep ? 'complete' : ''}`}
            onClick={isLastStep ? onCompleteWalkthrough : onNextStep}
          >
            {isLastStep ? (
              <>
                <Check size={18} />
                <span>完成</span>
              </>
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderWalkthroughContent = () => (
    <>
      {!walkthroughMode && (
        <div className="mentor-panel-tabs">
          <button
            ref={tabRefs.overview}
            type="button"
            className={`mentor-panel-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            文件概览
          </button>
          <button
            ref={tabRefs.line}
            type="button"
            className={`mentor-panel-tab ${activeTab === 'line' ? 'active' : ''}`}
            onClick={() => setActiveTab('line')}
          >
            逐行解读
          </button>
          <div 
            className="mentor-panel-tab-indicator" 
            style={{ left: tabIndicatorStyle.left, width: tabIndicatorStyle.width }}
          />
        </div>
      )}
      <div className="mentor-walkthrough-container">
        {renderWalkthroughToggle()}
        {walkthroughMode ? (
          <div className="mentor-panel-content walkthrough-mode">
            {renderWalkthroughStepContent()}
          </div>
        ) : (
          activeTab === 'overview' ? renderOverviewTab() : renderLineTab()
        )}
      </div>
      {renderWalkthroughControls()}
    </>
  );

  return (
    <div className="mentor-panel">
      <div className="mentor-panel-header">
        <div className="mentor-panel-header-icon">
          <GraduationCap size={20} />
        </div>
        <span className="mentor-panel-header-title">导师解读</span>
      </div>
      {variant === 'snippets' ? renderSnippetContent() : renderWalkthroughContent()}
    </div>
  );
}
