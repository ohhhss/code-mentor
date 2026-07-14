import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/OnboardingTour.css';

interface OnboardingTourProps {
  projectId: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface TourStep {
  title: string;
  description: string;
  arrowDirection: 'left' | 'center' | 'right' | 'top-right';
}

const ALL_STEPS: TourStep[] = [
  {
    title: '📁 文件浏览',
    description: '这里是文件浏览器，你可以浏览项目的目录结构，点击文件名查看源码。',
    arrowDirection: 'left',
  },
  {
    title: '💻 源码阅读',
    description: '这里是代码查看区，点击任意代码行，右侧导师面板会显示详细解读。',
    arrowDirection: 'center',
  },
  {
    title: '🎓 导师解读',
    description: 'AI 导师在这里为你逐行讲解代码，解释设计思路和技术要点。',
    arrowDirection: 'right',
  },
  {
    title: '📖 逐步讲解',
    description: "试试'逐步讲解'模式，按逻辑顺序（而非物理行序）一步步理解代码。",
    arrowDirection: 'right',
  },
  {
    title: '🌓 主题切换',
    description: '你可以随时切换深色/浅色主题，找到最舒适的阅读体验。',
    arrowDirection: 'top-right',
  },
];

const WALKTHROUGH_PROJECTS = new Set(['mitt']);

export function OnboardingTour({ projectId, onComplete, onSkip }: OnboardingTourProps) {
  const isWalkthroughProject = WALKTHROUGH_PROJECTS.has(projectId);
  const steps = isWalkthroughProject
    ? ALL_STEPS
    : [ALL_STEPS[0], ALL_STEPS[1], ALL_STEPS[2], ALL_STEPS[4]];

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = steps.length;
  const step = steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const getArrowClass = () => {
    switch (step.arrowDirection) {
      case 'left':
        return 'onboarding-tour-arrow-left';
      case 'center':
        return 'onboarding-tour-arrow-center';
      case 'right':
        return 'onboarding-tour-arrow-right';
      case 'top-right':
        return 'onboarding-tour-arrow-top-right';
      default:
        return 'onboarding-tour-arrow-center';
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentStep(prev => {
          if (prev === totalSteps - 1) {
            onComplete();
            return prev;
          }
          return prev + 1;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [totalSteps, onSkip, onComplete]);

  return createPortal(
    <div
      className="onboarding-tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="onboarding-tour-card">
        <div className={`onboarding-tour-arrow ${getArrowClass()}`} />
        <div className="onboarding-tour-step-indicator" aria-live="polite" aria-atomic="true">
          第 {currentStep + 1} / {totalSteps} 步：{step.title}
        </div>
        <h2 id="tour-title" className="onboarding-tour-title">{step.title}</h2>
        <p className="onboarding-tour-description">{step.description}</p>
        <div className="onboarding-tour-footer">
          <button className="onboarding-tour-skip" onClick={onSkip} aria-label="跳过引导">
            跳过引导
          </button>
          <div className="onboarding-tour-dots" aria-hidden="true">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`onboarding-tour-dot ${index === currentStep ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="onboarding-tour-nav-buttons">
            {currentStep > 0 && (
              <button
                className="onboarding-tour-btn onboarding-tour-btn-prev"
                onClick={handlePrev}
                aria-label="上一步"
              >
                上一步
              </button>
            )}
            <button
              className="onboarding-tour-btn onboarding-tour-btn-next"
              onClick={handleNext}
              aria-label={isLastStep ? '开始学习' : '下一步'}
            >
              {isLastStep ? '开始学习 🎉' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
