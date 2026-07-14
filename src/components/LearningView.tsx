import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { FileTree } from '@/components/FileTree';
import { CodeViewer } from '@/components/CodeViewer';
import { MentorPanel } from '@/components/MentorPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArchitectureView } from '@/components/ArchitectureView';
import { OnboardingTour } from '@/components/OnboardingTour';
import KnowledgePopover from '@/components/KnowledgePopover';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { projects, fullProjectData, largeProjectData } from '@/data/projects';
import type { WalkthroughStep } from '@/types';
import '@/styles/LearningView.css';

const WALKTHROUGH_PROJECTS = new Set(['mitt']);
const ARCHITECTURE_ID = '__architecture__';

const getFileLanguage = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    py: 'python',
    c: 'c',
    h: 'c',
    css: 'css',
    html: 'html',
  };
  return languageMap[ext] || 'typescript';
};

const getBasename = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

export function LearningView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const project = projects.find((p) => p.id === projectId);
  const isWalkthrough = projectId ? WALKTHROUGH_PROJECTS.has(projectId) : false;

  const handleBack = () => {
    navigate('/');
  };

  const [activeKpId, setActiveKpId] = useState<string | null>(null);
  const [toured, setToured] = useLocalStorage('code-mentor-toured', false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!toured) {
      setShowTour(true);
    }
  }, [toured]);

  const handleHelpClick = () => {
    setToured(false);
    setShowTour(true);
  };

  const handleTourComplete = () => {
    setToured(true);
    setShowTour(false);
  };

  const handleTourSkip = () => {
    setToured(true);
    setShowTour(false);
  };

  const [walkthroughSelectedFile, setWalkthroughSelectedFile] = useState<string>(
    isWalkthrough ? '/src/index.ts' : ''
  );
  const [walkthroughSelectedLine, setWalkthroughSelectedLine] = useState<number | null>(null);

  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const walkthroughSteps: WalkthroughStep[] = isWalkthrough ? fullProjectData['mitt'].walkthroughSteps : [];

  const [snippetsSelectedItem, setSnippetsSelectedItem] = useState<string>(
    !isWalkthrough ? ARCHITECTURE_ID : ''
  );
  const [snippetsSelectedLine, setSnippetsSelectedLine] = useState<number | null>(null);

  const [snippetWalkthroughMode, setSnippetWalkthroughMode] = useState(false);
  const [currentSnippetStepIndex, setCurrentSnippetStepIndex] = useState(0);

  if (!project || !projectId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>项目未找到</p>
        <Link to="/" style={{ color: 'var(--accent-color, #3b82f6)' }}>返回首页</Link>
      </div>
    );
  }

  const handleKnowledgePointClick = (kpId: string) => {
    setActiveKpId(kpId);
  };

  useEffect(() => {
    if (isWalkthrough && walkthroughMode && walkthroughSteps.length > 0) {
      const step = walkthroughSteps[currentStepIndex];
      if (step) {
        setWalkthroughSelectedFile(step.filePath);
        setWalkthroughSelectedLine(step.highlightLines[0]);
      }
    }
  }, [isWalkthrough, walkthroughMode, currentStepIndex, walkthroughSteps]);

  useEffect(() => {
    if (isWalkthrough && walkthroughSteps.length > 0) {
      setWalkthroughMode(true);
    }
  }, [isWalkthrough, walkthroughSteps.length]);

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < walkthroughSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleToggleWalkthrough = () => {
    setWalkthroughMode(!walkthroughMode);
    if (!walkthroughMode) {
      setCurrentStepIndex(0);
    }
  };

  const handleCompleteWalkthrough = () => {
    setWalkthroughMode(false);
  };

  if (isWalkthrough) {
    const mittData = fullProjectData['mitt'];
    const selectedFileData = mittData.files[walkthroughSelectedFile];
    const fileName = getBasename(walkthroughSelectedFile);
    const language = getFileLanguage(walkthroughSelectedFile);
    const currentStep = walkthroughMode ? walkthroughSteps[currentStepIndex] : null;
    const highlightedLines = currentStep ? [currentStep.highlightLines] : [];

    return (
      <div className="learning-view">
        <div className="learning-nav">
          <button className="nav-back-btn" onClick={handleBack}>
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="nav-project-name">{project.name}</div>
          <div className="nav-right-actions">
            <ThemeToggle containerId="theme-toggle-container" />
            <button
              className="nav-help-btn"
              onClick={handleHelpClick}
              aria-label="帮助"
            >
              <CircleHelp size={20} />
            </button>
          </div>
        </div>

        <div className="learning-content">
          <div className="learning-sidebar file-tree-sidebar">
            <FileTree
              variant="walkthrough"
              projectId={projectId}
              fileTree={mittData.fileTree}
              selectedFile={walkthroughSelectedFile}
              onSelectFile={(path) => {
                if (!walkthroughMode) {
                  setWalkthroughSelectedFile(path);
                  setWalkthroughSelectedLine(null);
                }
              }}
            />
          </div>

          <div className="learning-code-area">
            {selectedFileData ? (
              <CodeViewer
                code={selectedFileData.content}
                language={language}
                fileName={fileName}
                selectedLine={walkthroughMode ? null : walkthroughSelectedLine}
                highlightedLines={highlightedLines}
                onLineClick={(lineNum) => {
                  if (!walkthroughMode) {
                    setWalkthroughSelectedLine(lineNum);
                  }
                }}
                scrollToHighlight={walkthroughMode}
              />
            ) : (
              <div className="code-placeholder">请选择一个文件</div>
            )}
          </div>

          <div className="learning-sidebar mentor-sidebar">
            <MentorPanel
              lesson={selectedFileData?.lesson}
              selectedLine={walkthroughMode ? null : walkthroughSelectedLine}
              variant="walkthrough"
              onKnowledgePointClick={handleKnowledgePointClick}
              walkthroughMode={walkthroughMode}
              currentStep={currentStep}
              currentStepIndex={currentStepIndex}
              totalSteps={walkthroughSteps.length}
              onToggleWalkthrough={handleToggleWalkthrough}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              onCompleteWalkthrough={handleCompleteWalkthrough}
            />
          </div>
        </div>

        <KnowledgePopover
          knowledgePointId={activeKpId}
          onClose={() => setActiveKpId(null)}
        />

        {showTour && (
          <OnboardingTour
            projectId={projectId}
            onComplete={handleTourComplete}
            onSkip={handleTourSkip}
          />
        )}
      </div>
    );
  }

  const projectData = largeProjectData[projectId];
  const isArchitectureSelected = snippetsSelectedItem === ARCHITECTURE_ID;
  const selectedSnippet = !isArchitectureSelected
    ? projectData?.snippets.find((s) => s.id === snippetsSelectedItem)
    : null;

  const currentSnippetStep = snippetWalkthroughMode && selectedSnippet?.walkthroughSteps
    ? selectedSnippet.walkthroughSteps[currentSnippetStepIndex]
    : null;
  const snippetHighlightedLines = snippetWalkthroughMode && currentSnippetStep
    ? [currentSnippetStep.highlightLines]
    : [];

  const handleSnippetPrevStep = () => {
    if (currentSnippetStepIndex > 0) {
      setCurrentSnippetStepIndex(currentSnippetStepIndex - 1);
    }
  };

  const handleSnippetNextStep = () => {
    const totalSteps = selectedSnippet?.walkthroughSteps?.length || 0;
    if (currentSnippetStepIndex < totalSteps - 1) {
      setCurrentSnippetStepIndex(currentSnippetStepIndex + 1);
    }
  };

  const handleSnippetToggleWalkthrough = () => {
    setSnippetWalkthroughMode(!snippetWalkthroughMode);
    if (!snippetWalkthroughMode) {
      setCurrentSnippetStepIndex(0);
    }
  };

  const handleSnippetCompleteWalkthrough = () => {
    setSnippetWalkthroughMode(false);
  };

  return (
    <div className="learning-view">
      <div className="learning-nav">
        <button className="nav-back-btn" onClick={handleBack}>
          <ArrowLeft size={18} />
          <span>返回</span>
        </button>
        <div className="nav-project-name">{project.name}</div>
        <div className="nav-right-actions">
          <ThemeToggle containerId="theme-toggle-container" />
          <button
            className="nav-help-btn"
            onClick={handleHelpClick}
            aria-label="帮助"
          >
            <CircleHelp size={20} />
          </button>
        </div>
      </div>

      <div className="learning-content">
        <div className="learning-sidebar file-tree-sidebar">
          <FileTree
            variant="snippets"
            projectId={projectId}
            snippets={projectData?.snippets}
            selectedFile={snippetsSelectedItem}
            onSelectFile={() => {}}
            onSelectSnippet={(snippetId) => {
              setSnippetsSelectedItem(snippetId);
              setSnippetsSelectedLine(null);
              const snippet = projectData?.snippets.find((s) => s.id === snippetId);
              setSnippetWalkthroughMode(!!snippet?.walkthroughSteps?.length);
              setCurrentSnippetStepIndex(0);
            }}
          />
        </div>

        <div className="learning-code-area">
          {isArchitectureSelected && projectData ? (
            <ArchitectureView
              projectName={project.name}
              architecture={projectData.architecture}
              accentColor={project.accentColor}
            />
          ) : selectedSnippet ? (
            <CodeViewer
              code={selectedSnippet.code}
              language={selectedSnippet.language}
              fileName={selectedSnippet.title}
              selectedLine={snippetWalkthroughMode ? null : snippetsSelectedLine}
              highlightedLines={snippetHighlightedLines}
              onLineClick={(lineNum) => {
                if (!snippetWalkthroughMode) {
                  setSnippetsSelectedLine(lineNum);
                }
              }}
              scrollToHighlight={snippetWalkthroughMode}
            />
          ) : (
            <div className="code-placeholder">请选择一个代码段</div>
          )}
        </div>

        <div className="learning-sidebar mentor-sidebar">
          {isArchitectureSelected ? (
            <MentorPanel
              selectedLine={null}
              variant="snippets"
              onKnowledgePointClick={handleKnowledgePointClick}
              extraContent={
                <div className="architecture-overview-placeholder">
                  <h3>架构概览</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    {projectData?.architecture.summary || '架构概览内容将在此展示'}
                  </p>
                </div>
              }
            />
          ) : selectedSnippet ? (
            <MentorPanel
              snippetExplanation={selectedSnippet.explanation}
              snippetWhyThisFile={selectedSnippet.whyThisFile}
              selectedLine={snippetWalkthroughMode ? null : snippetsSelectedLine}
              variant="snippets"
              onKnowledgePointClick={handleKnowledgePointClick}
              snippetWalkthroughMode={snippetWalkthroughMode}
              currentSnippetStep={currentSnippetStep}
              currentSnippetStepIndex={currentSnippetStepIndex}
              totalSnippetSteps={selectedSnippet?.walkthroughSteps?.length || 0}
              hasSnippetWalkthrough={!!selectedSnippet?.walkthroughSteps?.length}
              onSnippetToggleWalkthrough={handleSnippetToggleWalkthrough}
              onSnippetPrevStep={handleSnippetPrevStep}
              onSnippetNextStep={handleSnippetNextStep}
              onSnippetCompleteWalkthrough={handleSnippetCompleteWalkthrough}
            />
          ) : (
            <MentorPanel
              selectedLine={null}
              variant="snippets"
              onKnowledgePointClick={handleKnowledgePointClick}
            />
          )}
        </div>
      </div>

      <KnowledgePopover
        knowledgePointId={activeKpId}
        onClose={() => setActiveKpId(null)}
      />

      {showTour && (
        <OnboardingTour
          projectId={projectId}
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      )}
    </div>
  );
}
