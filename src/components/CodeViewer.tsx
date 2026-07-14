import { useState, useEffect, useRef, useCallback } from 'react';
import { Highlight, type Language } from 'prism-react-renderer';
import { Copy, Check, FileCode, FileJson, FileText, File } from 'lucide-react';
import '@/styles/CodeViewer.css';

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    case 'md':
      return FileText;
    default:
      return File;
  }
};

interface CodeViewerProps {
  code: string;
  language: string;
  fileName?: string;
  selectedLine: number | null;
  highlightedLines?: [number, number][];
  onLineClick: (lineNumber: number) => void;
  showCopyButton?: boolean;
  scrollToHighlight?: boolean;
}

const languageMap: Record<string, Language> = {
  typescript: 'tsx',
  ts: 'tsx',
  tsx: 'tsx',
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  markdown: 'markdown',
  md: 'markdown',
  python: 'python',
  py: 'python',
  c: 'c',
  cpp: 'cpp',
  css: 'css',
  html: 'markup',
  bash: 'bash',
  shell: 'bash',
};

function mapLanguage(lang: string): Language {
  const normalized = lang.toLowerCase();
  return languageMap[normalized] || 'tsx';
}

function isLineHighlighted(lineNumber: number, ranges?: [number, number][]): boolean {
  if (!ranges) return false;
  return ranges.some(([start, end]) => lineNumber >= start && lineNumber <= end);
}

export function CodeViewer({
  code,
  language,
  fileName,
  selectedLine,
  highlightedLines,
  onLineClick,
  showCopyButton = true,
  scrollToHighlight = false,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  useEffect(() => {
    if (selectedLine !== null && lineRefs.current.has(selectedLine)) {
      const lineEl = lineRefs.current.get(selectedLine);
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedLine]);

  useEffect(() => {
    if (scrollToHighlight && highlightedLines && highlightedLines.length > 0) {
      const [startLine] = highlightedLines[0];
      const lineEl = lineRefs.current.get(startLine);
      if (lineEl) {
        setTimeout(() => {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [scrollToHighlight, highlightedLines]);

  const mappedLanguage = mapLanguage(language);

  const FileIcon = fileName ? getFileIcon(fileName) : File;

  return (
    <div className="code-viewer">
      {fileName && (
        <div className="code-viewer-header">
          <div className="code-viewer-filename-wrapper">
            <span className="code-viewer-header-accent" />
            <FileIcon size={14} className="code-viewer-file-icon" aria-hidden="true" />
            <span className="code-viewer-filename">{fileName}</span>
          </div>
          {showCopyButton && (
            <button
              className={`code-viewer-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              type="button"
              aria-label={copied ? '已复制到剪贴板' : '复制代码'}
              title={copied ? '已复制' : '复制代码'}
            >
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? '已复制' : '复制'}
            </button>
          )}
        </div>
      )}
      <div className="code-viewer-content" ref={contentRef}>
        <Highlight
          code={code}
          language={mappedLanguage}
          theme={undefined}
        >
          {({ tokens, getTokenProps }) => (
            <pre className="code-viewer-pre">
              <code className="code-viewer-code">
                {tokens.map((line, i) => {
                  const lineNumber = i + 1;
                  const isSelected = selectedLine === lineNumber;
                  const isHighlighted = isLineHighlighted(lineNumber, highlightedLines);
                  const lineClasses = [
                    'code-line',
                    isSelected ? 'selected' : '',
                    isHighlighted ? 'highlighted' : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        if (el) {
                          lineRefs.current.set(lineNumber, el);
                        } else {
                          lineRefs.current.delete(lineNumber);
                        }
                      }}
                      className={lineClasses}
                      onClick={() => onLineClick(lineNumber)}
                    >
                      <span className="line-number">{lineNumber}</span>
                      <span className="line-content">
                        {line.map((token, key) => {
                          const { style: _style, ...tokenProps } = getTokenProps({ token });
                          return <span key={key} {...tokenProps} />;
                        })}
                      </span>
                    </div>
                  );
                })}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
