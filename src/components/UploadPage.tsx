import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  XCircle,
  Key,
  RefreshCw,
  Layers,
  FileText,
} from 'lucide-react';
import { FileTree } from '@/components/FileTree';
import { CodeViewer } from '@/components/CodeViewer';
import { MentorPanel } from '@/components/MentorPanel';
import { ArchitectureView } from '@/components/ArchitectureView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useApiKey, testConnection, fetchModels } from '@/hooks/useApiKey';
import type { ModelInfo } from '@/hooks/useApiKey';
import { analyzeCode, analyzeProjectArchitecture } from '@/services/aiAnalysis';
import type { FileSummary } from '@/services/aiAnalysis';
import type {
  UploadedFile,
  FileNode,
  AiAnalysisResult,
  FileLesson,
  WalkthroughStep,
  ArchitectureOverview,
} from '@/types';
import '@/styles/UploadPage.css';

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';

const ACCEPT_EXTENSIONS = [
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cc',
  'go', 'rs', 'rb', 'php', 'kt', 'swift', 'scala',
  'css', 'scss', 'less', 'sass',
  'html', 'xml', 'svg', 'vue', 'svelte',
  'json', 'md', 'markdown',
  'sh', 'bash', 'zsh',
  'yml', 'yaml', 'toml', 'ini', 'conf',
  'sql', 'graphql', 'gql',
  'dockerfile', 'gitignore',
];

const ACCEPT_ATTRIBUTE = '.' + ACCEPT_EXTENSIONS.join(',.');

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  py: 'python', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cc: 'cpp',
  go: 'go', rs: 'rust', rb: 'ruby', php: 'php', kt: 'kotlin', swift: 'swift', scala: 'scala',
  css: 'css', scss: 'scss', less: 'less', sass: 'sass',
  html: 'html', xml: 'xml', svg: 'xml', vue: 'html', svelte: 'html',
  json: 'json', md: 'markdown', markdown: 'markdown',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'ini', conf: 'ini',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  dockerfile: 'docker', gitignore: 'bash',
};

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : '';
}

function getLanguageFromFileName(fileName: string): string {
  const ext = getExtension(fileName);
  if (!ext && fileName.toLowerCase() === 'dockerfile') return 'docker';
  return EXTENSION_LANGUAGE_MAP[ext] || 'typescript';
}

function isAcceptedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (lower === 'dockerfile' || lower === '.gitignore') return true;
  return ACCEPT_EXTENSIONS.includes(getExtension(fileName));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

function buildFileTree(files: UploadedFile[]): FileNode | null {
  if (files.length === 0) return null;

  const root: FileNode = {
    name: '上传项目',
    path: '',
    type: 'directory',
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isFile) {
        current.children!.push({
          name: part,
          path: currentPath,
          type: 'file',
          language: file.language,
        });
      } else {
        let dir = current.children!.find(
          (c) => c.type === 'directory' && c.name === part
        );
        if (!dir) {
          dir = {
            name: part,
            path: currentPath,
            type: 'directory',
            children: [],
          };
          current.children!.push(dir);
        }
        current = dir;
      }
    }
  }

  const sortNode = (node: FileNode) => {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortNode);
  };
  sortNode(root);

  return root;
}

function convertResultToLesson(
  result: AiAnalysisResult,
  filePath: string
): FileLesson {
  return {
    filePath,
    overview: result.overview,
    keyConcepts: result.keyConcepts,
    coreIdeas: result.coreIdeas,
    lineExplanations: result.lineExplanations,
  };
}

function inferProjectName(files: UploadedFile[]): string {
  if (files.length === 0) return '我的项目';
  const firstPath = files[0].path;
  const slashIdx = firstPath.indexOf('/');
  if (slashIdx > 0) {
    return firstPath.slice(0, slashIdx);
  }
  return '我的项目';
}

async function readEntryRecursive(
  entry: FileSystemEntry,
  basePath: string
): Promise<UploadedFile[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise<UploadedFile[]>((resolve) => {
      fileEntry.file(async (file) => {
        if (!isAcceptedFile(file.name)) {
          resolve([]);
          return;
        }
        try {
          const content = await readFileAsText(file);
          resolve([
            {
              path: basePath || file.name,
              name: file.name,
              content,
              language: getLanguageFromFileName(file.name),
            },
          ]);
        } catch {
          resolve([]);
        }
      }, () => resolve([]));
    });
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const allFiles: UploadedFile[] = [];

    const readAllEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        const collected: FileSystemEntry[] = [];
        const readBatch = () => {
          reader.readEntries((batch) => {
            if (batch.length === 0) {
              resolve(collected);
            } else {
              collected.push(...batch);
              readBatch();
            }
          }, reject);
        };
        readBatch();
      });
    };

    const childEntries = await readAllEntries();
    for (const child of childEntries) {
      const childPath = basePath ? `${basePath}/${child.name}` : child.name;
      const childFiles = await readEntryRecursive(child, childPath);
      allFiles.push(...childFiles);
    }
    return allFiles;
  }

  return [];
}

export function UploadPage() {
  const navigate = useNavigate();
  const { config, saveConfig, clearConfig } = useApiKey();

  // 上传相关状态
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [reading, setReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API 配置表单状态
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState(DEFAULT_BASE_URL);
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  // 模型选择状态
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState('');

  // AI 分析状态
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analyzedFilePath, setAnalyzedFilePath] = useState('');

  // 批量分析状态
  const [analysisScope, setAnalysisScope] = useState<'single' | 'batch'>('single');
  const [batchResults, setBatchResults] = useState<Record<string, AiAnalysisResult>>({});
  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchCurrentFile, setBatchCurrentFile] = useState('');

  // 逐步讲解状态
  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // 项目架构分析状态
  const [projectArchitecture, setProjectArchitecture] = useState<ArchitectureOverview | null>(null);
  const [analyzingArchitecture, setAnalyzingArchitecture] = useState(false);
  const [architectureError, setArchitectureError] = useState('');
  const [activeView, setActiveView] = useState<'file' | 'architecture'>('file');
  const projectName = inferProjectName(uploadedFiles);

  const selectedFile =
    uploadedFiles.find((f) => f.path === selectedFilePath) || null;
  const hasAnalysisForCurrentFile =
    analysisResult !== null && analyzedFilePath === selectedFilePath;
  const walkthroughSteps: WalkthroughStep[] =
    hasAnalysisForCurrentFile && analysisResult
      ? analysisResult.walkthroughSteps
      : [];
  const currentStep =
    walkthroughMode && walkthroughSteps.length > 0
      ? walkthroughSteps[currentStepIndex] ?? null
      : null;
  const highlightedLines: [number, number][] =
    walkthroughMode && currentStep ? [currentStep.highlightLines] : [];

  const lesson: FileLesson | undefined =
    hasAnalysisForCurrentFile && analysisResult
      ? convertResultToLesson(analysisResult, selectedFilePath)
      : undefined;

  // 已分析/失败的文件路径集合（用于文件树标记）
  const analyzedPathsSet = new Set(Object.keys(batchResults));
  const errorPathsSet = new Set(Object.keys(batchErrors));
  const batchDoneCount = batchProgress.current;
  const batchTotalCount = batchProgress.total;
  const batchSuccessCount = Object.keys(batchResults).length;
  const batchFailCount = Object.keys(batchErrors).length;

  // ===== 文件树重建 =====
  useEffect(() => {
    const tree = buildFileTree(uploadedFiles);
    setFileTree(tree);
    if (!selectedFilePath && uploadedFiles.length > 0) {
      setSelectedFilePath(uploadedFiles[0].path);
    }
  }, [uploadedFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== 添加上传文件 =====
  const addUploadedFiles = useCallback((newFiles: UploadedFile[]) => {
    setUploadedFiles((prev) => {
      const map = new Map<string, UploadedFile>();
      for (const f of prev) map.set(f.path, f);
      for (const f of newFiles) map.set(f.path, f);
      return Array.from(map.values());
    });
  }, []);

  // ===== 处理文件列表（来自 input） =====
  const processFileList = useCallback(
    async (fileList: File[]) => {
      setUploadError('');
      setReading(true);
      try {
        const accepted: UploadedFile[] = [];
        for (const file of fileList) {
          if (!isAcceptedFile(file.name)) continue;
          try {
            const content = await readFileAsText(file);
            accepted.push({
              path: file.name,
              name: file.name,
              content,
              language: getLanguageFromFileName(file.name),
            });
          } catch {
            // 跳过无法读取的文件
          }
        }
        if (accepted.length === 0) {
          setUploadError('没有可读取的源代码文件');
        } else {
          addUploadedFiles(accepted);
        }
      } finally {
        setReading(false);
      }
    },
    [addUploadedFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      void processFileList(files);
      e.target.value = '';
    },
    [processFileList]
  );

  // ===== 拖拽处理 =====
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      setUploadError('');

      const items = e.dataTransfer.items;
      setReading(true);
      try {
        if (
          items &&
          items.length > 0 &&
          typeof items[0].webkitGetAsEntry === 'function'
        ) {
          const entries: FileSystemEntry[] = [];
          for (let i = 0; i < items.length; i++) {
            const entry = items[i].webkitGetAsEntry();
            if (entry) entries.push(entry);
          }
          if (entries.length > 0) {
            const droppedFiles: UploadedFile[] = [];
            for (const entry of entries) {
              const files = await readEntryRecursive(entry, entry.name);
              droppedFiles.push(...files);
            }
            if (droppedFiles.length === 0) {
              setUploadError('没有可读取的源代码文件');
            } else {
              addUploadedFiles(droppedFiles);
            }
            return;
          }
        }
        // 回退：普通文件拖放
        const files = Array.from(e.dataTransfer.files);
        await processFileList(files);
      } finally {
        setReading(false);
      }
    },
    [addUploadedFiles, processFileList]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setIsDragging(false);
  }, []);

  // ===== 文件选择 =====
  const handleSelectFile = useCallback((path: string) => {
    setSelectedFilePath(path);
    setSelectedLine(null);
    setWalkthroughMode(false);
    setCurrentStepIndex(0);
    setActiveView('file');

    // 如果批量分析结果中有该文件，直接加载
    setBatchResults((prevBatch) => {
      const cached = prevBatch[path];
      if (cached) {
        setAnalysisResult(cached);
        setAnalyzedFilePath(path);
        setAnalysisError('');
        if (cached.walkthroughSteps && cached.walkthroughSteps.length > 0) {
          setWalkthroughMode(true);
          setCurrentStepIndex(0);
        }
      } else {
        setAnalysisResult(null);
        setAnalyzedFilePath('');
        setAnalysisError('');
      }
      return prevBatch;
    });
  }, []);

  // ===== 行点击 =====
  const handleLineClick = useCallback(
    (line: number) => {
      if (walkthroughMode) return;
      setSelectedLine(line);
    },
    [walkthroughMode]
  );

  // ===== API 配置处理 =====
  const handleTestConnection = useCallback(async () => {
    if (!apiKeyInput.trim() || !baseUrlInput.trim()) {
      setConnectionStatus('error');
      setConnectionMessage('请填写 API Key 和 Base URL');
      return;
    }
    setConnectionStatus('testing');
    setConnectionMessage('');
    setFetchingModels(true);
    setFetchModelsError('');
    try {
      const result = await testConnection(apiKeyInput, baseUrlInput, selectedModel);
      setConnectionStatus(result.success ? 'success' : 'error');
      setConnectionMessage(result.message);

      // 连接成功后自动获取模型列表
      if (result.success) {
        const modelResult = await fetchModels(apiKeyInput, baseUrlInput);
        if (modelResult.success && modelResult.models) {
          setModels(modelResult.models);
          // 如果当前选中的模型不在列表中，自动选中第一个
          if (!modelResult.models.some((m) => m.id === selectedModel)) {
            setSelectedModel(modelResult.models[0].id);
          }
        } else {
          setFetchModelsError(modelResult.message || '获取模型列表失败');
        }
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionMessage(err instanceof Error ? err.message : '测试失败');
    } finally {
      setFetchingModels(false);
    }
  }, [apiKeyInput, baseUrlInput, selectedModel]);

  const handleSaveConfig = useCallback(() => {
    if (!apiKeyInput.trim() || !baseUrlInput.trim()) {
      setConnectionStatus('error');
      setConnectionMessage('请填写 API Key 和 Base URL');
      return;
    }
    saveConfig(apiKeyInput, baseUrlInput, selectedModel);
    setConnectionStatus('idle');
    setConnectionMessage('');
  }, [apiKeyInput, baseUrlInput, selectedModel, saveConfig]);

  const handleClearConfig = useCallback(() => {
    clearConfig();
    setApiKeyInput('');
    setBaseUrlInput(DEFAULT_BASE_URL);
    setConnectionStatus('idle');
    setConnectionMessage('');
    setAnalysisResult(null);
    setAnalysisError('');
    setAnalyzedFilePath('');
    setWalkthroughMode(false);
    setCurrentStepIndex(0);
    setBatchResults({});
    setBatchErrors({});
    setBatchProgress({ current: 0, total: 0 });
    setBatchAnalyzing(false);
    setBatchCurrentFile('');
    setModels([]);
    setSelectedModel('deepseek-chat');
    setFetchingModels(false);
    setFetchModelsError('');
    setProjectArchitecture(null);
    setAnalyzingArchitecture(false);
    setArchitectureError('');
    setActiveView('file');
  }, [clearConfig]);

  // ===== 项目架构分析 =====
  const handleAnalyzeArchitecture = useCallback(async () => {
    if (!config) return;
    const successResults = Object.entries(batchResults);
    if (successResults.length < 3) {
      setArchitectureError('至少需要成功分析 3 个文件才能生成项目架构视图');
      return;
    }

    const fileSummaries: FileSummary[] = successResults.map(([path, result]) => {
      const file = uploadedFiles.find((f) => f.path === path);
      return {
        path,
        name: file?.name ?? path.split('/').pop() ?? path,
        overview: result.overview,
        coreIdeas: result.coreIdeas,
        keyConcepts: result.keyConcepts,
      };
    });

    setAnalyzingArchitecture(true);
    setArchitectureError('');
    try {
      const arch = await analyzeProjectArchitecture(config, fileSummaries);
      setProjectArchitecture(arch);
      setActiveView('architecture');
    } catch (err) {
      setArchitectureError(err instanceof Error ? err.message : '架构分析失败，请重试');
    } finally {
      setAnalyzingArchitecture(false);
    }
  }, [config, batchResults, uploadedFiles]);

  // ===== AI 分析处理 =====
  const handleAnalyze = useCallback(async () => {
    if (!config) return;

    if (analysisScope === 'single') {
      // 单文件分析
      if (!selectedFile) return;
      setAnalyzing(true);
      setAnalysisError('');
      setAnalysisResult(null);
      setAnalyzedFilePath('');
      setWalkthroughMode(false);
      setCurrentStepIndex(0);
      try {
        const result = await analyzeCode(
          config,
          selectedFile.name,
          selectedFile.language,
          selectedFile.content
        );
        setAnalysisResult(result);
        setAnalyzedFilePath(selectedFile.path);
        // 同时存入 batchResults 缓存
        setBatchResults((prev) => ({ ...prev, [selectedFile.path]: result }));
        setBatchErrors((prev) => {
          const next = { ...prev };
          delete next[selectedFile.path];
          return next;
        });
        if (result.walkthroughSteps && result.walkthroughSteps.length > 0) {
          setWalkthroughMode(true);
          setCurrentStepIndex(0);
        }
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : '分析失败，请重试');
      } finally {
        setAnalyzing(false);
      }
    } else {
      // 批量分析所有文件
      if (uploadedFiles.length === 0) return;
      setBatchAnalyzing(true);
      setBatchResults({});
      setBatchErrors({});
      setBatchProgress({ current: 0, total: uploadedFiles.length });
      setAnalysisResult(null);
      setAnalyzedFilePath('');
      setAnalysisError('');
      setWalkthroughMode(false);
      setCurrentStepIndex(0);
      setProjectArchitecture(null);
      setArchitectureError('');
      setActiveView('file');

      const newResults: Record<string, AiAnalysisResult> = {};
      const newErrors: Record<string, string> = {};

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setBatchProgress({ current: i, total: uploadedFiles.length });
        setBatchCurrentFile(file.name);
        try {
          const result = await analyzeCode(
            config,
            file.name,
            file.language,
            file.content
          );
          newResults[file.path] = result;
          setBatchResults((prev) => ({ ...prev, [file.path]: result }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : '分析失败';
          newErrors[file.path] = msg;
          setBatchErrors((prev) => ({ ...prev, [file.path]: msg }));
        }
      }

      setBatchProgress({ current: uploadedFiles.length, total: uploadedFiles.length });
      setBatchCurrentFile('');
      setBatchAnalyzing(false);

      // 自动展示当前选中文件的分析结果
      if (newResults[selectedFilePath]) {
        setAnalysisResult(newResults[selectedFilePath]);
        setAnalyzedFilePath(selectedFilePath);
        if (newResults[selectedFilePath].walkthroughSteps?.length) {
          setWalkthroughMode(true);
          setCurrentStepIndex(0);
        }
      }

      // 批量分析完成后，自动触发项目架构分析（如果成功文件数 >= 3）
      const successCount = Object.keys(newResults).length;
      if (successCount >= 3) {
        const fileSummaries: FileSummary[] = Object.entries(newResults).map(([path, result]) => {
          const file = uploadedFiles.find((f) => f.path === path);
          return {
            path,
            name: file?.name ?? path.split('/').pop() ?? path,
            overview: result.overview,
            coreIdeas: result.coreIdeas,
            keyConcepts: result.keyConcepts,
          };
        });

        setAnalyzingArchitecture(true);
        setArchitectureError('');
        try {
          const arch = await analyzeProjectArchitecture(config, fileSummaries);
          setProjectArchitecture(arch);
          setActiveView('architecture');
        } catch (err) {
          setArchitectureError(err instanceof Error ? err.message : '架构分析失败，可点击重试按钮手动生成');
        } finally {
          setAnalyzingArchitecture(false);
        }
      }
    }
  }, [config, selectedFile, analysisScope, uploadedFiles, selectedFilePath]);

  // ===== 逐步讲解控制 =====
  const handleToggleWalkthrough = useCallback(() => {
    setWalkthroughMode((prev) => {
      const next = !prev;
      if (next) setCurrentStepIndex(0);
      return next;
    });
  }, []);

  const handlePrevStep = useCallback(() => {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNextStep = useCallback(() => {
    setCurrentStepIndex((i) => Math.min(walkthroughSteps.length - 1, i + 1));
  }, [walkthroughSteps.length]);

  const handleCompleteWalkthrough = useCallback(() => {
    setWalkthroughMode(false);
  }, []);

  const handleKnowledgePointClick = useCallback((_kpId: string) => {
    // 上传项目的 AI 分析结果不包含关联知识点数据，此回调为空操作
  }, []);

  // ===== 渲染 =====
  return (
    <div className="upload-page">
      <div className="upload-nav">
        <button className="nav-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          <span>返回</span>
        </button>
        <div className="nav-project-name">上传项目分析</div>
        <div className="nav-right-actions">
          <ThemeToggle containerId="upload-theme-toggle" />
        </div>
      </div>

      <div className="upload-content">
        {/* 左侧：上传区 + 文件树 */}
        <div className="upload-sidebar">
          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="upload-dropzone-icon">
              {reading ? (
                <Loader2 size={28} className="spin" />
              ) : (
                <Upload size={28} />
              )}
            </div>
            <div className="upload-dropzone-text">
              {reading
                ? '正在读取文件...'
                : isDragging
                  ? '松开鼠标以上传'
                  : '拖拽文件或文件夹到此处'}
            </div>
            <button
              type="button"
              className="upload-select-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={reading}
            >
              选择文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          {uploadError && (
            <div className="upload-error-msg">
              <AlertCircle size={14} />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="upload-file-count">
              共 {uploadedFiles.length} 个文件
            </div>
          )}

          <div className="upload-file-tree-wrapper">
            <FileTree
              variant="walkthrough"
              projectId="upload"
              fileTree={fileTree || undefined}
              selectedFile={selectedFilePath}
              onSelectFile={handleSelectFile}
              analyzedPaths={analyzedPathsSet}
              errorPaths={errorPathsSet}
            />
          </div>
        </div>

        {/* 中间：代码查看器 */}
        <div className="upload-code-area">
          {selectedFile ? (
            <CodeViewer
              code={selectedFile.content}
              language={selectedFile.language}
              fileName={selectedFile.name}
              selectedLine={walkthroughMode ? null : selectedLine}
              highlightedLines={highlightedLines}
              onLineClick={handleLineClick}
              scrollToHighlight={walkthroughMode}
            />
          ) : (
            <div className="code-placeholder">
              {uploadedFiles.length === 0
                ? '请上传源代码文件'
                : '请在左侧选择一个文件'}
            </div>
          )}
        </div>

        {/* 右侧：API 配置 / 导师面板 */}
        <div className="upload-mentor-sidebar">
          {!config ? (
            <div className="upload-api-config">
              <div className="upload-api-config-header">
                <div className="upload-api-config-icon">
                  <Key size={18} />
                </div>
                <span className="upload-api-config-title">
                  配置 DeepSeek API
                </span>
              </div>
              <div className="upload-api-config-body">
                <div className="upload-form-group">
                  <label className="upload-form-label">API Key</label>
                  <div className="upload-input-wrapper">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      className="upload-form-input"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="sk-..."
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="upload-input-suffix-btn"
                      onClick={() => setShowApiKey((s) => !s)}
                      aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                      title={showApiKey ? '隐藏' : '显示'}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="upload-form-group">
                  <label className="upload-form-label">Base URL</label>
                  <input
                    type="text"
                    className="upload-form-input"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder={DEFAULT_BASE_URL}
                  />
                </div>

                <div className="upload-form-group">
                  <label className="upload-form-label">
                    模型
                    {fetchingModels && (
                      <span className="upload-model-fetching">
                        <Loader2 size={12} className="spin" />
                        获取中...
                      </span>
                    )}
                  </label>
                  {models.length > 0 ? (
                    <select
                      className="upload-form-input upload-model-select"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="upload-form-input"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder="deepseek-chat"
                    />
                  )}
                  {fetchModelsError && (
                    <div className="upload-model-error">
                      <AlertCircle size={12} />
                      <span>{fetchModelsError}</span>
                    </div>
                  )}
                  {models.length === 0 && !fetchModelsError && (
                    <div className="upload-model-hint">
                      点击"测试连接"后自动获取可用模型列表
                    </div>
                  )}
                </div>

                {connectionStatus !== 'idle' && connectionMessage && (
                  <div className={`upload-connection-msg ${connectionStatus}`}>
                    {connectionStatus === 'testing' && (
                      <Loader2 size={14} className="spin" />
                    )}
                    {connectionStatus === 'success' && (
                      <CheckCircle size={14} />
                    )}
                    {connectionStatus === 'error' && <XCircle size={14} />}
                    <span>{connectionMessage}</span>
                  </div>
                )}

                <div className="upload-api-config-actions">
                  <button
                    type="button"
                    className="upload-btn upload-btn-secondary"
                    onClick={handleTestConnection}
                    disabled={connectionStatus === 'testing'}
                  >
                    {connectionStatus === 'testing' ? (
                      <>
                        <Loader2 size={14} className="spin" />
                        测试中...
                      </>
                    ) : (
                      '测试连接'
                    )}
                  </button>
                  <button
                    type="button"
                    className="upload-btn upload-btn-primary"
                    onClick={handleSaveConfig}
                  >
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          ) : !selectedFile && !batchAnalyzing ? (
            <div className="upload-mentor-placeholder">
              <div className="upload-mentor-placeholder-icon">📝</div>
              <div className="upload-mentor-placeholder-title">
                请在左侧选择一个文件
              </div>
              <div className="upload-mentor-placeholder-desc">
                选择文件后即可开始 AI 分析
              </div>
              <button
                type="button"
                className="upload-btn upload-btn-ghost"
                onClick={handleClearConfig}
              >
                <RefreshCw size={14} />
                重新配置 API
              </button>
            </div>
          ) : (
            <div className="upload-mentor-content">
              <div className="upload-analyze-bar">
                <div className="upload-scope-toggle">
                  <button
                    type="button"
                    className={`upload-scope-option ${analysisScope === 'single' ? 'active' : ''}`}
                    onClick={() => setAnalysisScope('single')}
                    disabled={batchAnalyzing || analyzingArchitecture}
                  >
                    分析当前文件
                  </button>
                  <button
                    type="button"
                    className={`upload-scope-option ${analysisScope === 'batch' ? 'active' : ''}`}
                    onClick={() => setAnalysisScope('batch')}
                    disabled={batchAnalyzing || analyzingArchitecture}
                  >
                    分析全部文件
                  </button>
                </div>
                <div className="upload-analyze-bar-row">
                  <button
                    type="button"
                    className="upload-analyze-btn"
                    onClick={handleAnalyze}
                    disabled={analyzing || batchAnalyzing || analyzingArchitecture}
                  >
                    {analyzing || batchAnalyzing ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>
                          {batchAnalyzing
                            ? `分析中 ${batchDoneCount}/${batchTotalCount}...`
                            : 'AI 正在分析代码...'}
                        </span>
                      </>
                    ) : analyzingArchitecture ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>正在生成架构视图...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>
                          {analysisScope === 'single' ? 'AI 分析' : `分析全部 ${uploadedFiles.length} 个文件`}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="upload-btn upload-btn-ghost upload-btn-sm"
                    onClick={handleClearConfig}
                    aria-label="重新配置 API"
                    title="重新配置 API"
                    disabled={analyzing || batchAnalyzing || analyzingArchitecture}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* 视图切换 Tab */}
              {(projectArchitecture || analyzingArchitecture || architectureError || (batchTotalCount > 0 && batchDoneCount === batchTotalCount && batchSuccessCount >= 3)) && (
                <div className="upload-view-tabs">
                  <button
                    type="button"
                    className={`upload-view-tab ${activeView === 'architecture' ? 'active' : ''}`}
                    onClick={() => setActiveView('architecture')}
                    disabled={analyzing || batchAnalyzing}
                  >
                    <Layers size={15} />
                    <span>项目架构</span>
                  </button>
                  <button
                    type="button"
                    className={`upload-view-tab ${activeView === 'file' ? 'active' : ''}`}
                    onClick={() => setActiveView('file')}
                    disabled={analyzing || batchAnalyzing}
                  >
                    <FileText size={15} />
                    <span>文件讲解</span>
                  </button>
                  {projectArchitecture && !analyzingArchitecture && (
                    <button
                      type="button"
                      className="upload-view-regen-btn"
                      onClick={handleAnalyzeArchitecture}
                      disabled={analyzingArchitecture || analyzing || batchAnalyzing}
                      title="重新生成架构"
                    >
                      <RefreshCw size={13} className={analyzingArchitecture ? 'spin' : ''} />
                    </button>
                  )}
                </div>
              )}

              <div className="upload-mentor-body">
                {activeView === 'architecture' ? (
                  analyzingArchitecture ? (
                    <div className="upload-analyzing-state">
                      <Loader2 size={28} className="spin" />
                      <div className="upload-analyzing-text">
                        AI 正在分析项目架构...
                      </div>
                      <div className="upload-analyzing-subtext">
                        基于已分析的文件信息梳理整体模块关系
                      </div>
                    </div>
                  ) : architectureError ? (
                    <div className="upload-analysis-error">
                      <AlertCircle size={16} />
                      <div>
                        <div className="upload-analysis-error-title">
                          架构分析失败
                        </div>
                        <div className="upload-analysis-error-msg">
                          {architectureError}
                        </div>
                        <button
                          type="button"
                          className="upload-btn upload-btn-secondary upload-btn-sm"
                          onClick={handleAnalyzeArchitecture}
                          style={{ marginTop: 12 }}
                        >
                          <RefreshCw size={13} />
                          重试生成架构
                        </button>
                      </div>
                    </div>
                  ) : projectArchitecture ? (
                    <div className="upload-architecture-view">
                      <ArchitectureView
                        projectName={projectName}
                        architecture={projectArchitecture}
                        accentColor="var(--accent-color)"
                      />
                    </div>
                  ) : batchTotalCount > 0 && batchDoneCount === batchTotalCount && batchSuccessCount >= 3 ? (
                    <div className="upload-arch-prompt">
                      <div className="upload-mentor-prompt-icon">
                        <Layers size={28} />
                      </div>
                      <div className="upload-mentor-prompt-text">
                        批量分析完成！点击下方按钮生成项目架构视图
                      </div>
                      <button
                        type="button"
                        className="upload-analyze-btn"
                        onClick={handleAnalyzeArchitecture}
                        style={{ marginTop: 16 }}
                      >
                        <Sparkles size={16} />
                        <span>生成项目架构</span>
                      </button>
                    </div>
                  ) : (
                    <div className="upload-mentor-prompt">
                      <div className="upload-mentor-prompt-icon">
                        <Layers size={28} />
                      </div>
                      <div className="upload-mentor-prompt-text">
                        先选择「分析全部文件」，完成后可生成项目架构视图
                      </div>
                    </div>
                  )
                ) : batchAnalyzing ? (
                  <div className="upload-batch-progress">
                    <div className="upload-batch-progress-header">
                      <Loader2 size={20} className="spin" />
                      <span className="upload-batch-progress-title">
                        正在分析第 {batchDoneCount + 1}/{batchTotalCount} 个文件
                      </span>
                    </div>
                    <div className="upload-batch-progress-file">
                      {batchCurrentFile}
                    </div>
                    <div className="upload-batch-progress-bar">
                      <div
                        className="upload-batch-progress-bar-fill"
                        style={{ width: `${batchTotalCount > 0 ? (batchDoneCount / batchTotalCount) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="upload-batch-progress-stats">
                      <span className="upload-batch-stat-success">
                        ✅ 已完成 {batchSuccessCount}
                      </span>
                      {batchFailCount > 0 && (
                        <span className="upload-batch-stat-error">
                          ❌ 失败 {batchFailCount}
                        </span>
                      )}
                    </div>
                  </div>
                ) : analyzing ? (
                  <div className="upload-analyzing-state">
                    <Loader2 size={28} className="spin" />
                    <div className="upload-analyzing-text">
                      AI 正在分析代码...
                    </div>
                  </div>
                ) : analysisError && !hasAnalysisForCurrentFile ? (
                  <div className="upload-analysis-error">
                    <AlertCircle size={16} />
                    <div>
                      <div className="upload-analysis-error-title">
                        分析失败
                      </div>
                      <div className="upload-analysis-error-msg">
                        {analysisError}
                      </div>
                    </div>
                  </div>
                ) : hasAnalysisForCurrentFile ? (
                  <MentorPanel
                    lesson={lesson}
                    selectedLine={walkthroughMode ? null : selectedLine}
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
                ) : batchTotalCount > 0 && batchDoneCount === batchTotalCount ? (
                  <div className="upload-batch-summary">
                    <div className="upload-batch-summary-icon">
                      <CheckCircle size={28} />
                    </div>
                    <div className="upload-batch-summary-title">
                      批量分析完成
                    </div>
                    <div className="upload-batch-summary-stats">
                      <span className="upload-batch-stat-success">
                        ✅ 成功 {batchSuccessCount} 个
                      </span>
                      {batchFailCount > 0 && (
                        <span className="upload-batch-stat-error">
                          ❌ 失败 {batchFailCount} 个
                        </span>
                      )}
                    </div>
                    {batchSuccessCount >= 3 ? (
                      <button
                        type="button"
                        className="upload-analyze-btn"
                        onClick={handleAnalyzeArchitecture}
                        style={{ marginTop: 16 }}
                        disabled={analyzingArchitecture}
                      >
                        {analyzingArchitecture ? (
                          <>
                            <Loader2 size={16} className="spin" />
                            <span>正在生成架构视图...</span>
                          </>
                        ) : (
                          <>
                            <Layers size={16} />
                            <span>生成项目架构视图</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="upload-batch-summary-hint">
                        成功分析的文件不足 3 个，无法生成架构视图
                      </div>
                    )}
                    <div className="upload-batch-summary-hint" style={{ marginTop: 8 }}>
                      在左侧文件树中点击文件查看分析结果
                    </div>
                  </div>
                ) : (
                  <div className="upload-mentor-prompt">
                    <div className="upload-mentor-prompt-icon">
                      <Sparkles size={28} />
                    </div>
                    <div className="upload-mentor-prompt-text">
                      {analysisScope === 'single'
                        ? '点击上方"AI 分析"按钮，让 AI 导师为你解读当前文件'
                        : `点击上方按钮，AI 将逐个分析全部 ${uploadedFiles.length} 个文件，完成后可生成项目架构视图`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
