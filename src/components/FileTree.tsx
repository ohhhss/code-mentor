import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  FileCode,
  FileJson,
  FileText,
  File,
} from 'lucide-react';
import type { FileNode, CodeSnippet } from '@/types';
import '@/styles/FileTree.css';

interface FileTreeProps {
  variant: 'walkthrough' | 'snippets';
  fileTree?: FileNode;
  snippets?: CodeSnippet[];
  projectId: string;
  selectedFile: string;
  onSelectFile: (path: string) => void;
  onSelectSnippet?: (snippetId: string) => void;
  analyzedPaths?: Set<string>; // 已分析成功的文件路径
  errorPaths?: Set<string>;    // 分析失败的文件路径
}

const ARCHITECTURE_ID = '__architecture__';

const getFileIcon = (fileName?: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return { icon: FileCode, colorClass: 'icon-ts' };
    case 'json':
      return { icon: FileJson, colorClass: 'icon-json' };
    case 'md':
      return { icon: FileText, colorClass: 'icon-md' };
    default:
      return { icon: File, colorClass: 'icon-default' };
  }
};

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  selectedPath: string;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string) => void;
  analyzedPaths?: Set<string>;
  errorPaths?: Set<string>;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onToggleExpand,
  onSelect,
  analyzedPaths,
  errorPaths,
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const paddingLeft = 8 + depth * 16;

  if (node.type === 'directory') {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleExpand(node.path);
      } else if (e.key === 'ArrowRight' && !isExpanded) {
        e.preventDefault();
        onToggleExpand(node.path);
      } else if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        onToggleExpand(node.path);
      }
    };

    return (
      <div>
        <div
          className="file-tree-item directory-item"
          style={{ paddingLeft }}
          onClick={() => onToggleExpand(node.path)}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? '折叠' : '展开'}文件夹 ${node.name}`}
        >
          <span className={`file-tree-chevron ${isExpanded ? 'expanded' : ''}`}>
            <ChevronRight size={14} aria-hidden="true" />
          </span>
          <span className="file-icon folder-icon">
            {isExpanded ? <FolderOpen size={14} aria-hidden="true" /> : <Folder size={14} aria-hidden="true" />}
          </span>
          <span className="file-name">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div className="file-tree-children">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                analyzedPaths={analyzedPaths}
                errorPaths={errorPaths}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { icon: FileIconComponent, colorClass } = getFileIcon(node.name);

  const handleFileKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(node.path);
    }
  };

  return (
    <div
      className={`file-tree-item file-item ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: isSelected ? paddingLeft - 3 : paddingLeft }}
      onClick={() => onSelect(node.path)}
      onKeyDown={handleFileKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`选择文件 ${node.name}`}
      aria-selected={isSelected}
    >
      <span className="file-tree-chevron" />
      <span className={`file-icon ${colorClass}`}>
        <FileIconComponent size={14} aria-hidden="true" />
      </span>
      <span className="file-name">{node.name}</span>
      {node.isEntry && <span className="entry-badge">⭐</span>}
      {analyzedPaths?.has(node.path) && (
        <span className="analysis-badge analysis-badge-success" title="已分析" aria-label="已分析完成">●</span>
      )}
      {errorPaths?.has(node.path) && (
        <span className="analysis-badge analysis-badge-error" title="分析失败" aria-label="分析失败">●</span>
      )}
    </div>
  );
};

const collectDefaultExpanded = (node: FileNode, depth: number = 0): Set<string> => {
  const paths = new Set<string>();
  if (node.type === 'directory') {
    if (depth <= 1) {
      paths.add(node.path);
      if (node.children) {
        for (const child of node.children) {
          for (const p of collectDefaultExpanded(child, depth + 1)) {
            paths.add(p);
          }
        }
      }
    }
  }
  return paths;
};

const getLanguageIcon = (title: string) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('typescript') || lowerTitle.includes('javascript') || 
      lowerTitle.includes('.ts') || lowerTitle.includes('.js') ||
      lowerTitle.includes('python') || lowerTitle.includes('.py') ||
      lowerTitle.includes('.c') || lowerTitle.includes('.cpp')) {
    return { icon: FileCode, colorClass: 'icon-ts' };
  }
  if (lowerTitle.includes('json')) {
    return { icon: FileJson, colorClass: 'icon-json' };
  }
  if (lowerTitle.includes('markdown') || lowerTitle.includes('.md')) {
    return { icon: FileText, colorClass: 'icon-md' };
  }
  return { icon: FileCode, colorClass: 'icon-ts' };
};

export const FileTree: React.FC<FileTreeProps> = ({
  variant,
  fileTree,
  snippets,
  selectedFile,
  onSelectFile,
  onSelectSnippet,
  analyzedPaths,
  errorPaths,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    if (fileTree) {
      return collectDefaultExpanded(fileTree);
    }
    return new Set();
  });

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (variant === 'snippets') {
    return (
      <div className="file-tree-panel">
        <div className="file-tree-header">
          <span className="file-tree-header-icon" aria-hidden="true">📂</span>
          <span>精选模块</span>
        </div>
        <div className="file-tree-content">
          <div
            className={`architecture-item ${selectedFile === ARCHITECTURE_ID ? 'selected' : ''}`}
            onClick={() => onSelectSnippet?.(ARCHITECTURE_ID)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSnippet?.(ARCHITECTURE_ID);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="查看架构概览"
            aria-selected={selectedFile === ARCHITECTURE_ID}
          >
            <span className="file-icon icon-arch" aria-hidden="true">📐</span>
            <span>架构概览</span>
          </div>
          {snippets?.map((snippet) => {
            const isSelected = selectedFile === snippet.id;
            const { icon: SnippetIcon, colorClass } = getLanguageIcon(snippet.title);
            return (
              <div
                key={snippet.id}
                className={`snippet-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSnippet?.(snippet.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSnippet?.(snippet.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`查看代码段 ${snippet.title}`}
                aria-selected={isSelected}
              >
                <div className="snippet-title-row" style={{ paddingLeft: isSelected ? 9 : 12 }}>
                  <span className={`file-icon ${colorClass}`}>
                    <SnippetIcon size={14} aria-hidden="true" />
                  </span>
                  <span className="file-name">{snippet.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="file-tree-panel">
      <div className="file-tree-header">
        <span className="file-tree-header-icon" aria-hidden="true">📁</span>
        <span>文件浏览</span>
      </div>
      <div className="file-tree-content">
        {fileTree && (
          <TreeNode
            node={fileTree}
            depth={0}
            selectedPath={selectedFile}
            expandedPaths={expandedPaths}
            onToggleExpand={handleToggleExpand}
            onSelect={onSelectFile}
            analyzedPaths={analyzedPaths}
            errorPaths={errorPaths}
          />
        )}
      </div>
    </div>
  );
};
