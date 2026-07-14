import type { AiAnalysisResult, ApiKeyConfig, ArchitectureOverview } from '@/types';

export interface FileSummary {
  path: string;
  name: string;
  overview: string;
  coreIdeas: string[];
  keyConcepts: string[];
}

const SYSTEM_PROMPT = `你是一位极具耐心、循循善诱的代码导师，专门面向完全零基础的初学者讲解代码。

请遵循以下原则：
1. 用通俗易懂的生活比喻（类比）来解释技术概念，让初学者能立即产生画面感。
2. 语言亲切、循序渐进，避免堆砌术语；若必须使用术语，请用一句话解释清楚。
3. 所有输出内容必须使用简体中文。
4. 严格只返回一个合法的 JSON 对象，不要包含任何 markdown 标记、不要使用 \`\`\` 代码块、不要有任何解释性文字或前后缀。

返回的 JSON 必须严格符合如下结构：
{
  "overview": string,                   // 文件作用概述，3-5 句话
  "coreIdeas": string[],                // 核心思路要点，3-6 条
  "keyConcepts": string[],              // 关键概念名称列表，3-8 个
  "lineExplanations": [                 // 逐段/逐行解读
    {
      "lineNumbers": [number, number],  // 起止行号（闭区间，1 开始计数，必须对应所给代码的真实行号）
      "title": string,                  // 简短标题
      "content": string,                // 详细解读，可使用比喻帮助理解
      "knowledgePoints": string[]       // 可选，关联的知识点名称
    }
  ],
  "walkthroughSteps": [                 // 逐步讲解步骤，必须包含 3-5 个
    {
      "id": number,                     // 步骤序号，从 1 开始递增
      "title": string,                  // 步骤标题
      "description": string,            // 步骤描述
      "filePath": string,               // 当前分析的文件路径
      "highlightLines": [number, number], // 高亮的行范围（1 开始计数，必须对应代码真实行号）
      "keyInsight": string              // 本步骤的核心洞见
    }
  ]
}

关键约束：
- lineNumbers 与 highlightLines 的行号必须严格对应所提供代码的实际行号（1 开始计数），不得凭空捏造。
- walkthroughSteps 必须给出 3 到 5 个，且 highlightLines 应指向代码中最能体现该步骤的关键代码段。
- 内容要贴合实际代码，不要泛泛而谈。`;

function buildUserMessage(fileName: string, language: string, code: string): string {
  const totalLines = code.split('\n').length;
  return [
    '请分析以下源代码文件，并严格按照系统提示中的 JSON 结构返回结果。',
    '',
    `文件名：${fileName}`,
    `编程语言：${language}`,
    `总行数：${totalLines}`,
    '',
    '以下是代码内容（行号从 1 开始计数）：',
    '',
    code,
  ].join('\n');
}

interface OpenAiChoice {
  message?: { content?: string };
}

interface OpenAiResponse {
  choices?: OpenAiChoice[];
  error?: { message?: string };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function validateLineExplanation(raw: unknown, index: number): void {
  if (!isObject(raw)) {
    throw new Error(`lineExplanations[${index}] 不是合法对象`);
  }
  if (!isNumberPair(raw.lineNumbers)) {
    throw new Error(`lineExplanations[${index}].lineNumbers 必须是 [number, number] 格式`);
  }
  if (typeof raw.title !== 'string') {
    throw new Error(`lineExplanations[${index}].title 缺失或类型错误`);
  }
  if (typeof raw.content !== 'string') {
    throw new Error(`lineExplanations[${index}].content 缺失或类型错误`);
  }
  if (raw.knowledgePoints !== undefined && !isStringArray(raw.knowledgePoints)) {
    throw new Error(`lineExplanations[${index}].knowledgePoints 必须是字符串数组`);
  }
}

function validateWalkthroughStep(raw: unknown, index: number): void {
  if (!isObject(raw)) {
    throw new Error(`walkthroughSteps[${index}] 不是合法对象`);
  }
  if (typeof raw.id !== 'number') {
    throw new Error(`walkthroughSteps[${index}].id 缺失或类型错误`);
  }
  if (typeof raw.title !== 'string') {
    throw new Error(`walkthroughSteps[${index}].title 缺失或类型错误`);
  }
  if (typeof raw.description !== 'string') {
    throw new Error(`walkthroughSteps[${index}].description 缺失或类型错误`);
  }
  if (typeof raw.filePath !== 'string') {
    throw new Error(`walkthroughSteps[${index}].filePath 缺失或类型错误`);
  }
  if (!isNumberPair(raw.highlightLines)) {
    throw new Error(`walkthroughSteps[${index}].highlightLines 必须是 [number, number] 格式`);
  }
  if (typeof raw.keyInsight !== 'string') {
    throw new Error(`walkthroughSteps[${index}].keyInsight 缺失或类型错误`);
  }
}

function validateResult(raw: unknown): AiAnalysisResult {
  if (!isObject(raw)) {
    throw new Error('AI 返回的内容不是合法的 JSON 对象');
  }

  const missing: string[] = [];
  if (typeof raw.overview !== 'string') missing.push('overview');
  if (!isStringArray(raw.coreIdeas)) missing.push('coreIdeas');
  if (!isStringArray(raw.keyConcepts)) missing.push('keyConcepts');
  if (!Array.isArray(raw.lineExplanations)) missing.push('lineExplanations');
  if (!Array.isArray(raw.walkthroughSteps)) missing.push('walkthroughSteps');

  if (missing.length > 0) {
    throw new Error(`AI 返回结果缺少必需字段：${missing.join('、')}`);
  }

  const lineExplanations = raw.lineExplanations as unknown[];
  lineExplanations.forEach((item, i) => validateLineExplanation(item, i));

  const walkthroughSteps = raw.walkthroughSteps as unknown[];
  if (walkthroughSteps.length < 3 || walkthroughSteps.length > 5) {
    throw new Error(`walkthroughSteps 必须包含 3-5 个步骤，当前为 ${walkthroughSteps.length} 个`);
  }
  walkthroughSteps.forEach((item, i) => validateWalkthroughStep(item, i));

  return raw as unknown as AiAnalysisResult;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

export async function analyzeCode(
  config: ApiKeyConfig,
  fileName: string,
  language: string,
  code: string
): Promise<AiAnalysisResult> {
  const userMessage = buildUserMessage(fileName, language, code);
  return callChatCompletion(config, SYSTEM_PROMPT, userMessage, validateResult, 0.3);
}

const ARCHITECTURE_SYSTEM_PROMPT = `你是一位资深的软件架构师，擅长从多个源代码文件中快速梳理出整个项目的架构概览。

请遵循以下原则：
1. 基于提供的文件列表、目录结构和每个文件的概述信息，分析整个项目的整体架构。
2. 所有输出内容必须使用简体中文。
3. 严格只返回一个合法的 JSON 对象，不要包含任何 markdown 标记、不要使用 \`\`\` 代码块、不要有任何解释性文字或前后缀。

返回的 JSON 必须严格符合如下结构：
{
  "summary": string,                    // 项目整体简介，3-5 句话，说明项目用途和核心价值
  "techStack": string[],                // 技术栈列表，列出主要使用的编程语言、框架、库、工具（3-8 项）
  "modules": [                          // 核心模块划分，3-6 个
    {
      "name": string,                   // 模块名称，简洁有力
      "description": string,            // 模块是做什么的（一句话）
      "responsibilities": string        // 模块的主要职责和关键功能（2-3 句话）
    }
  ],
  "diagramDescription": string,         // 架构图描述，说明模块间的调用关系和数据流向（2-4 句话）
  "designHighlights": string[]          // 设计亮点，列出值得学习的设计决策或技术特点（3-6 条）
}

关键约束：
- 模块划分应基于目录结构和文件职责，不要太细也不要太粗。
- 技术栈应从文件名（如 package.json、go.mod、requirements.txt）和文件概述中推断。
- 内容要贴合实际文件信息，不要泛泛而谈或编造不存在的功能。`;

function buildArchitectureUserMessage(files: FileSummary[]): string {
  const lines: string[] = [
    '请根据以下项目文件信息，分析整个项目的架构，并严格按照系统提示中的 JSON 结构返回结果。',
    '',
    `共 ${files.length} 个文件：`,
    '',
  ];
  for (const f of files) {
    lines.push(`--- 文件: ${f.path} ---`);
    lines.push(`概述: ${f.overview}`);
    if (f.coreIdeas.length > 0) {
      lines.push(`核心思路: ${f.coreIdeas.join('；')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function validateArchitectureResult(raw: unknown): ArchitectureOverview {
  if (!isObject(raw)) {
    throw new Error('AI 返回的内容不是合法的 JSON 对象');
  }

  const missing: string[] = [];
  if (typeof raw.summary !== 'string') missing.push('summary');
  if (!isStringArray(raw.techStack)) missing.push('techStack');
  if (!Array.isArray(raw.modules)) missing.push('modules');
  if (typeof raw.diagramDescription !== 'string') missing.push('diagramDescription');
  if (!isStringArray(raw.designHighlights)) missing.push('designHighlights');

  if (missing.length > 0) {
    throw new Error(`AI 返回架构结果缺少必需字段：${missing.join('、')}`);
  }

  const modules = raw.modules as unknown[];
  if (modules.length < 2 || modules.length > 8) {
    throw new Error(`modules 应包含 2-8 个模块，当前为 ${modules.length} 个`);
  }

  modules.forEach((mod, i) => {
    if (!isObject(mod)) {
      throw new Error(`modules[${i}] 不是合法对象`);
    }
    if (typeof mod.name !== 'string') {
      throw new Error(`modules[${i}].name 缺失或类型错误`);
    }
    if (typeof mod.description !== 'string') {
      throw new Error(`modules[${i}].description 缺失或类型错误`);
    }
    if (typeof mod.responsibilities !== 'string') {
      throw new Error(`modules[${i}].responsibilities 缺失或类型错误`);
    }
  });

  const techStack = raw.techStack as string[];
  if (techStack.length < 2) {
    throw new Error('techStack 至少应包含 2 项技术');
  }

  const highlights = raw.designHighlights as string[];
  if (highlights.length < 2) {
    throw new Error('designHighlights 至少应包含 2 条');
  }

  return raw as unknown as ArchitectureOverview;
}

function selectFilesForArchitecture(files: FileSummary[]): FileSummary[] {
  const maxFiles = 40;
  if (files.length <= maxFiles) return files;

  const priorityKeywords = [
    'readme', 'package.json', 'tsconfig', 'cargo.toml', 'go.mod', 'pyproject.toml',
    'requirements.txt', 'pom.xml', 'build.gradle', 'makefile', 'dockerfile',
    'index.', 'main.', 'app.', 'server.', 'config', 'router', 'route',
    'controller', 'service', 'model', 'view', 'util', 'helper', 'core',
  ];

  const scored = files.map((f) => {
    const lower = f.path.toLowerCase();
    let score = 0;
    const depth = (f.path.match(/\//g) || []).length;
    score += Math.max(0, 5 - depth);
    for (const kw of priorityKeywords) {
      if (lower.includes(kw)) score += 3;
    }
    return { file: f, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxFiles).map((s) => s.file);
}

async function callChatCompletion<T>(
  config: ApiKeyConfig,
  systemPrompt: string,
  userMessage: string,
  validator: (raw: unknown) => T,
  temperature = 0.3
): Promise<T> {
  const trimmedKey = config.apiKey.trim();
  const trimmedUrl = config.baseUrl.trim().replace(/\/+$/, '');

  if (!trimmedKey) throw new Error('API Key 不能为空');
  if (!trimmedUrl) throw new Error('Base URL 不能为空');

  let response: Response;
  try {
    response = await fetch(`${trimmedUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('网络错误：无法连接到 AI 服务，请检查 Base URL 是否正确以及网络是否通畅');
    }
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`请求 AI 服务失败：${msg}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = (await response.json()) as OpenAiResponse;
      detail = errBody?.error?.message || '';
    } catch {
      // ignore
    }
    const prefix = `AI 服务返回错误（HTTP ${response.status}）`;
    throw new Error(detail ? `${prefix}：${detail}` : prefix);
  }

  let data: OpenAiResponse;
  try {
    data = (await response.json()) as OpenAiResponse;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`解析 AI 服务响应失败：${msg}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 服务返回内容为空，缺少 choices[0].message.content');
  }

  const jsonText = stripCodeFences(content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`AI 返回内容无法解析为 JSON：${msg}`);
  }

  return validator(parsed);
}

export async function analyzeProjectArchitecture(
  config: ApiKeyConfig,
  files: FileSummary[]
): Promise<ArchitectureOverview> {
  if (files.length === 0) {
    throw new Error('没有可用于分析的文件信息');
  }
  const selected = selectFilesForArchitecture(files);
  const userMessage = buildArchitectureUserMessage(selected);
  return callChatCompletion(
    config,
    ARCHITECTURE_SYSTEM_PROMPT,
    userMessage,
    validateArchitectureResult,
    0.3
  );
}
