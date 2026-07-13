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
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onToggleExpand,
  onSelect,
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const paddingLeft = 8 + depth * 16;

  if (node.type === 'directory') {
    return (
      <div>
        <div
          className="file-tree-item directory-item"
          style={{ paddingLeft }}
          onClick={() => onToggleExpand(node.path)}
        >
          <span className={`file-tree-chevron ${isExpanded ? 'expanded' : ''}`}>
            <ChevronRight size={14} />
          </span>
          <span className="file-icon folder-icon">
            {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
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
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { icon: FileIconComponent, colorClass } = getFileIcon(node.name);

  return (
    <div
      className={`file-tree-item file-item ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: isSelected ? paddingLeft - 3 : paddingLeft }}
      onClick={() => onSelect(node.path)}
    >
      <span className="file-tree-chevron" />
      <span className={`file-icon ${colorClass}`}>
        <FileIconComponent size={14} />
      </span>
      <span className="file-name">{node.name}</span>
      {node.isEntry && <span className="entry-badge">⭐</span>}
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
          <span className="file-tree-header-icon">📂</span>
          <span>精选模块</span>
        </div>
        <div className="file-tree-content">
          <div
            className={`architecture-item ${selectedFile === ARCHITECTURE_ID ? 'selected' : ''}`}
            onClick={() => onSelectSnippet?.(ARCHITECTURE_ID)}
          >
            <span className="file-icon icon-arch">📐</span>
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
              >
                <div className="snippet-title-row" style={{ paddingLeft: isSelected ? 9 : 12 }}>
                  <span className={`file-icon ${colorClass}`}>
                    <SnippetIcon size={14} />
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
        <span className="file-tree-header-icon">📁</span>
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
          />
        )}
      </div>
    </div>
  );
};
