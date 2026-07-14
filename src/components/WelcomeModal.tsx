import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/WelcomeModal.css';

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement;
    buttonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleFocusTrap);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="welcome-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="welcome-modal-card" ref={modalRef}>
        <div className="welcome-modal-icon">🎓</div>
        <h2 id="welcome-modal-title" className="welcome-modal-title">欢迎来到 Code Mentor</h2>
        <p className="welcome-modal-description">
          Code Mentor 是一个代码阅读学习工具。
          <br />
          在这里，你将像有一位资深工程师在身边一样，逐行理解优秀开源项目的设计思路。
          <br />
          选择一个项目，开始你的源码阅读之旅吧！
        </p>
        <div className="welcome-modal-features">
          <div className="welcome-modal-feature-item">
            <span className="welcome-modal-feature-icon">📖</span>
            <span>逐行导师解读</span>
          </div>
          <div className="welcome-modal-feature-item">
            <span className="welcome-modal-feature-icon">🔍</span>
            <span>精选开源项目</span>
          </div>
          <div className="welcome-modal-feature-item">
            <span className="welcome-modal-feature-icon">🌓</span>
            <span>深色/浅色主题</span>
          </div>
        </div>
        <button ref={buttonRef} className="welcome-modal-button" onClick={onClose} aria-label="开始探索">
          开始探索 🚀
        </button>
      </div>
    </div>,
    document.body
  );
}
