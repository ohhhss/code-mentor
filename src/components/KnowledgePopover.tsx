import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { knowledgePoints } from '@/data/knowledgePoints';
import '@/styles/KnowledgePopover.css';

interface KnowledgePopoverProps {
  knowledgePointId: string | null;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
}

const categoryLabels: Record<string, string> = {
  'typescript': 'TypeScript',
  'javascript': 'JavaScript',
  'design-pattern': '设计模式',
  'architecture': '架构',
  'general': '通用',
};

export default function KnowledgePopover({
  knowledgePointId,
  onClose,
  anchorPosition,
}: KnowledgePopoverProps) {
  const [isClosing, setIsClosing] = useState(false);

  const kp = knowledgePointId ? knowledgePoints[knowledgePointId] : null;

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (knowledgePointId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [knowledgePointId]);

  useEffect(() => {
    if (!knowledgePointId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [knowledgePointId, handleClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!knowledgePointId) return null;

  const cardStyle: React.CSSProperties = {};
  const overlayStyle: React.CSSProperties = {};

  if (anchorPosition) {
    cardStyle.position = 'fixed';
    cardStyle.top = anchorPosition.y;
    cardStyle.left = anchorPosition.x;
    cardStyle.transform = 'translate(-50%, calc(-100% - 12px))';
    cardStyle.margin = 0;
    overlayStyle.alignItems = 'flex-start';
    overlayStyle.justifyContent = 'flex-start';
  }

  return createPortal(
    <div
      className={`kp-overlay ${isClosing ? 'kp-closing' : ''}`}
      onClick={handleOverlayClick}
      style={overlayStyle}
    >
      <div className="kp-card" onClick={(e) => e.stopPropagation()} style={cardStyle}>
        {kp ? (
          <>
            <div className="kp-header">
              <div className="kp-title-section">
                <h2 className="kp-title">{kp.name}</h2>
                <span className={`kp-badge kp-badge-${kp.category}`}>
                  {categoryLabels[kp.category] || kp.category}
                </span>
              </div>
              <button className="kp-close-btn" onClick={handleClose} aria-label="关闭">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="kp-content">
              <p className="kp-explanation">{kp.explanation}</p>
              {kp.codeExample && (
                <div className="kp-code-block">
                  <pre>{kp.codeExample}</pre>
                </div>
              )}
            </div>
            <div className="kp-footer">
              <span className="kp-hint">💡 点击外部或按 Esc 关闭</span>
            </div>
          </>
        ) : (
          <div className="kp-not-found">
            <p>知识点未找到</p>
            <button className="kp-close-btn" onClick={handleClose} style={{ marginTop: '16px' }}>
              关闭
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
