import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/WelcomeModal.css';

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="welcome-modal-overlay">
      <div className="welcome-modal-card">
        <div className="welcome-modal-icon">🎓</div>
        <h2 className="welcome-modal-title">欢迎来到 Code Mentor</h2>
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
        <button className="welcome-modal-button" onClick={onClose}>
          开始探索 🚀
        </button>
      </div>
    </div>,
    document.body
  );
}
