import type { LargeProjectData } from '@/types';

const agentBaseCode = `from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    WAITING_FOR_INPUT = "waiting_for_input"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AgentContext:
    """Agent执行上下文，在Agent间传递状态"""
    scan_id: str
    target: str
    shared_state: dict[str, Any] = field(default_factory=dict)
    findings: list[Finding] = field(default_factory=list)
    artifacts: list[Artifact] = field(default_factory=list)
    parent_agent_id: Optional[str] = None


@dataclass
class Finding:
    """安全发现/漏洞"""
    severity: str  # critical, high, medium, low, info
    title: str
    description: str
    evidence: str
    cwe_id: Optional[str] = None
    cvss_score: Optional[float] = None
    remediation: Optional[str] = None


@dataclass
class Artifact:
    """执行过程中产生的产物（请求响应、截图、日志等）"""
    type: str
    name: str
    content: Any
    mime_type: str = "application/json"


class AgentResult(BaseModel):
    """Agent执行结果"""
    success: bool
    summary: str
    findings: list[Finding] = Field(default_factory=list)
    artifacts: list[Artifact] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    should_stop: bool = False


class BaseSecurityAgent(ABC):
    """安全Agent基类，所有扫描Agent继承此类"""

    name: str
    description: str
    version: str = "1.0.0"

    def __init__(
        self,
        llm: BaseChatModel,
        tools: Optional[list[BaseTool]] = None,
        max_iterations: int = 20,
        verbose: bool = False,
    ):
        self.agent_id = str(uuid4())
        self.llm = llm
        self.tools = tools or []
        self.max_iterations = max_iterations
        self.verbose = verbose
        self.status = AgentStatus.IDLE
        self.logger = logging.getLogger(f"strix.agent.{self.name}")
        self._messages: list[BaseMessage] = []

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Agent系统提示词，子类必须实现"""
        ...

    def initialize(self, context: AgentContext) -> None:
        """初始化Agent状态，在每次扫描前调用"""
        self.context = context
        self.status = AgentStatus.IDLE
        self._messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=self._build_initial_prompt(context)),
        ]
        self._on_initialize(context)

    def _on_initialize(self, context: AgentContext) -> None:
        """子类可重写的初始化钩子"""
        pass

    @abstractmethod
    def _build_initial_prompt(self, context: AgentContext) -> str:
        """构建初始任务提示"""
        ...

    async def run(self, context: AgentContext) -> AgentResult:
        """执行Agent主循环"""
        self.initialize(context)
        self.status = AgentStatus.RUNNING
        self.logger.info(f"Agent {self.name} starting scan on {context.target}")

        try:
            for iteration in range(self.max_iterations):
                result = await self._step(iteration)

                if result.should_stop:
                    self.status = AgentStatus.COMPLETED
                    self.logger.info(
                        f"Agent {self.name} completed after {iteration + 1} iterations"
                    )
                    return result

                if iteration == self.max_iterations - 1:
                    self.logger.warning(
                        f"Agent {self.name} reached max iterations ({self.max_iterations})"
                    )

            return AgentResult(
                success=True,
                summary=f"Agent {self.name} finished after {self.max_iterations} iterations",
                findings=context.findings,
                artifacts=context.artifacts,
                should_stop=True,
            )

        except Exception as e:
            self.status = AgentStatus.FAILED
            self.logger.error(f"Agent {self.name} failed: {e}", exc_info=True)
            return AgentResult(
                success=False,
                summary=f"Agent failed with error: {str(e)}",
                should_stop=True,
            )

    async def _step(self, iteration: int) -> AgentResult:
        """执行单步思考-行动循环（ReAct模式）"""
        response = await self.llm.ainvoke(self._messages)
        self._messages.append(response)

        tool_call = self._extract_tool_call(response)

        if tool_call:
            tool_result = await self._execute_tool(tool_call)
            self._messages.append(HumanMessage(content=f"Tool result: {tool_result}"))
            return AgentResult(success=True, summary="Tool executed", should_stop=False)

        return self._parse_result(response)

    def _extract_tool_call(self, message: AIMessage) -> Optional[dict]:
        """从LLM响应中提取工具调用"""
        if hasattr(message, "tool_calls") and message.tool_calls:
            return message.tool_calls[0]

        if "\`\`\`json" in message.content:
            try:
                import json
                json_str = message.content.split("\`\`\`json")[1].split("\`\`\`")[0]
                return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass

        return None

    async def _execute_tool(self, tool_call: dict) -> str:
        """执行工具调用"""
        tool_name = tool_call.get("name")
        tool_args = tool_call.get("args", {})

        tool = next((t for t in self.tools if t.name == tool_name), None)
        if not tool:
            return f"Error: Tool '{tool_name}' not found"

        try:
            self.logger.debug(f"Executing tool {tool_name} with args {tool_args}")
            result = await tool.ainvoke(tool_args)
            return str(result)
        except Exception as e:
            return f"Tool execution error: {str(e)}"

    @abstractmethod
    def _parse_result(self, message: AIMessage) -> AgentResult:
        """解析LLM最终结果，子类实现"""
        ...

    def add_finding(self, finding: Finding) -> None:
        """记录一个安全发现"""
        self.context.findings.append(finding)
        self.logger.info(f"Finding: [{finding.severity}] {finding.title}")
`;

const orchestratorCode = `from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Type

from langchain_core.language_models import BaseChatModel
from .agents.base import BaseSecurityAgent, AgentContext, AgentResult
from .agents.recon import ReconAgent
from .agents.scanner import VulnerabilityScannerAgent
from .agents.exploiter import ExploiterAgent
from .agents.reporter import ReporterAgent
from .containers import DockerSandbox
from .playwright import BrowserManager
from .config import ScanConfig

logger = logging.getLogger(__name__)


class ScanPhase(str, Enum):
    RECONNAISSANCE = "reconnaissance"
    SCANNING = "scanning"
    EXPLOITATION = "exploitation"
    REPORTING = "reporting"
    COMPLETED = "completed"


@dataclass
class ScanState:
    scan_id: str
    target: str
    config: ScanConfig
    phase: ScanPhase = ScanPhase.RECONNAISSANCE
    context: AgentContext = field(default=None)
    results: dict[str, AgentResult] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


class ScanOrchestrator:
    """扫描编排器：协调多个Agent执行完整渗透测试流程"""

    PHASE_AGENTS: dict[ScanPhase, list[Type[BaseSecurityAgent]]] = {
        ScanPhase.RECONNAISSANCE: [ReconAgent],
        ScanPhase.SCANNING: [VulnerabilityScannerAgent],
        ScanPhase.EXPLOITATION: [ExploiterAgent],
        ScanPhase.REPORTING: [ReporterAgent],
    }

    def __init__(
        self,
        llm: BaseChatModel,
        config: ScanConfig,
        docker_sandbox: Optional[DockerSandbox] = None,
        browser_manager: Optional[BrowserManager] = None,
    ):
        self.llm = llm
        self.config = config
        self.docker_sandbox = docker_sandbox or DockerSandbox()
        self.browser_manager = browser_manager or BrowserManager()
        self.active_scans: dict[str, ScanState] = {}

    async def start_scan(self, target: str) -> str:
        """启动新的扫描任务，返回scan_id"""
        import uuid
        scan_id = str(uuid.uuid4())[:8]

        context = AgentContext(
            scan_id=scan_id,
            target=target,
            shared_state={
                "open_ports": [],
                "technologies": [],
                "endpoints": [],
                "vulnerabilities": [],
                "credentials": [],
            },
        )

        state = ScanState(
            scan_id=scan_id,
            target=target,
            config=self.config,
            context=context,
        )
        self.active_scans[scan_id] = state

        asyncio.create_task(self._run_scan(state))
        logger.info(f"Scan {scan_id} started for target {target}")

        return scan_id

    async def _run_scan(self, state: ScanState) -> None:
        """按阶段执行扫描流程"""
        try:
            for phase in [
                ScanPhase.RECONNAISSANCE,
                ScanPhase.SCANNING,
                ScanPhase.EXPLOITATION,
                ScanPhase.REPORTING,
            ]:
                if state.config.dry_run and phase == ScanPhase.EXPLOITATION:
                    logger.info("Dry run mode, skipping exploitation phase")
                    continue

                state.phase = phase
                logger.info(f"Scan {state.scan_id} entering phase: {phase}")

                agent_classes = self.PHASE_AGENTS[phase]
                await self._run_phase_agents(state, agent_classes)

                if not self._should_continue(state):
                    logger.info(f"Scan {state.scan_id} stopping early after {phase}")
                    break

            state.phase = ScanPhase.COMPLETED
            logger.info(
                f"Scan {state.scan_id} completed. "
                f"Findings: {len(state.context.findings)}"
            )

        except Exception as e:
            logger.error(f"Scan {state.scan_id} failed: {e}", exc_info=True)
            state.errors.append(str(e))

    async def _run_phase_agents(
        self,
        state: ScanState,
        agent_classes: list[Type[BaseSecurityAgent]],
    ) -> None:
        """执行一个阶段的所有Agent（并行执行）"""
        agents = []
        for agent_cls in agent_classes:
            tools = self._get_tools_for_agent(agent_cls, state)
            agent = agent_cls(llm=self.llm, tools=tools)
            agents.append(agent)

        tasks = [agent.run(state.context) for agent in agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for agent, result in zip(agents, results):
            if isinstance(result, Exception):
                state.errors.append(f"{agent.name}: {str(result)}")
                logger.error(f"Agent {agent.name} failed: {result}")
            else:
                state.results[agent.name] = result

    def _get_tools_for_agent(
        self,
        agent_cls: Type[BaseSecurityAgent],
        state: ScanState,
    ) -> list:
        """根据Agent类型注入对应的工具集"""
        from .tools import (
            PortScanTool,
            HttpProbeTool,
            DirectoryBruteforceTool,
            WebFuzzTool,
            SqlInjectionTool,
            XssScanTool,
            ExploitTool,
            BrowserNavigateTool,
        )

        if agent_cls is ReconAgent:
            return [
                PortScanTool(sandbox=self.docker_sandbox),
                HttpProbeTool(),
                DirectoryBruteforceTool(),
            ]
        elif agent_cls is VulnerabilityScannerAgent:
            return [
                WebFuzzTool(),
                SqlInjectionTool(sandbox=self.docker_sandbox),
                XssScanTool(browser=self.browser_manager),
                BrowserNavigateTool(browser=self.browser_manager),
            ]
        elif agent_cls is ExploiterAgent:
            return [
                ExploitTool(sandbox=self.docker_sandbox),
                BrowserNavigateTool(browser=self.browser_manager),
            ]
        else:
            return []

    def _should_continue(self, state: ScanState) -> bool:
        """判断是否继续执行下一阶段"""
        critical_count = sum(
            1 for f in state.context.findings if f.severity == "critical"
        )
        if critical_count >= self.config.max_critical_findings:
            logger.info(
                f"Stopping early: found {critical_count} critical findings"
            )
            return False

        if state.config.max_findings and len(state.context.findings) >= state.config.max_findings:
            return False

        return True

    def get_scan_status(self, scan_id: str) -> Optional[ScanState]:
        """查询扫描状态"""
        return self.active_scans.get(scan_id)
`;

export const strixProjectData: LargeProjectData = {
  projectId: 'strix',
  architecture: {
    summary: 'strix 是一个 AI 驱动的自动化渗透测试工具，采用多 Agent 编排架构。系统将渗透测试流程分解为侦察（Recon）、漏洞扫描（Vulnerability Scanning）、漏洞利用（Exploitation）、报告生成（Reporting）四个阶段，每个阶段由专门的安全 Agent 负责执行。Agent 基于大语言模型（LLM）驱动，使用 ReAct（思考-行动）模式动态决策调用哪些安全工具。所有危险操作在 Docker 沙箱中隔离执行，Web交互测试通过 Playwright 自动化浏览器完成。工具通过统一接口抽象，新的扫描工具或漏洞检测插件可以轻松添加。',
    techStack: ['Python', 'Docker', 'LangChain/LlamaIndex', 'Playwright', 'Multi-Agent', 'OWASP'],
    modules: [
      {
        name: 'Agent Orchestrator',
        description: '多Agent编排引擎，管理扫描生命周期',
        responsibilities: '扫描阶段管理（侦察→扫描→利用→报告）、Agent调度（并行/串行执行）、上下文状态共享、早期停止策略（发现足够多漏洞后停止）、错误处理与重试、扫描进度跟踪。整个系统的"指挥官"。'
      },
      {
        name: 'Security Agents',
        description: '各阶段专用的安全Agent集合',
        responsibilities: 'ReconAgent负责端口扫描、技术栈识别、目录爆破；VulnerabilityScannerAgent负责OWASP Top 10漏洞扫描（SQL注入、XSS、CSRF等）；ExploiterAgent负责漏洞验证与利用；ReporterAgent负责生成结构化渗透测试报告。每个Agent基于LLM决策，使用ReAct模式动态选择工具。'
      },
      {
        name: 'Tool Abstraction Layer',
        description: '安全工具抽象与实现层',
        responsibilities: '定义BaseTool统一接口，封装nmap、sqlmap、nuclei等常用安全工具，提供HTTP探测、目录爆破、Fuzz测试、浏览器自动化等能力。所有工具实现为LangChain Tool，可被Agent自主调用。'
      },
      {
        name: 'Docker Sandbox',
        description: 'Docker容器化隔离执行环境',
        responsibilities: '危险工具（漏洞利用、payload执行）在隔离容器中运行，限制网络访问（只允许访问目标），资源限制（CPU/内存/超时），容器自动清理，防止扫描工具影响宿主机安全。'
      },
      {
        name: 'Browser Automation',
        description: 'Playwright浏览器自动化模块',
        responsibilities: '无头浏览器管理、页面导航、表单自动填写、XSS漏洞DOM验证、截图取证、JS渲染页面扫描、认证会话维持。支持多浏览器上下文隔离。'
      }
    ],
    diagramDescription: '用户接口层：CLI命令行和REST API两种入口，支持启动扫描、查询状态、获取报告。编排层：ScanOrchestrator是核心调度器，维护扫描状态机，按阶段顺序执行：Reconnaissance → Scanning → Exploitation → Reporting。每个阶段可以有多个Agent并行工作。Agent层：每个Agent继承BaseSecurityAgent基类，拥有独立的LLM实例、工具集、消息历史。Agent使用ReAct循环：LLM思考→决定调用工具→执行工具→观察结果→继续思考，直到得出结论或达到最大迭代次数。工具层：工具通过统一接口注册到Agent，分为几类：网络扫描类（nmap端口扫描、whois查询、DNS枚举）、Web探测类（HTTP请求、目录爆破、技术栈识别）、漏洞扫描类（SQL注入测试、XSS测试、SSRF测试）、利用类（Exploit验证、Payload执行）、浏览器类（Playwright页面交互）。基础设施层：Docker Sandbox为危险操作提供隔离容器，所有出站网络仅允许访问扫描目标；Playwright Browser Manager管理无头浏览器池；SQLite/PostgreSQL存储扫描结果、发现的漏洞、执行日志。',
    designHighlights: [
      'Agent编排模式：清晰的阶段划分+每个Agent职责单一，Orchestrator负责工作流控制，Agent专注于决策和执行，类似项目经理和专家的关系',
      '安全工具抽象层：所有工具实现统一的BaseTool接口（LangChain Tool），新安全工具只需要实现接口即可被所有Agent使用，符合开放-封闭原则',
      'Docker沙箱隔离：所有扫描和利用操作在临时容器中执行，限制网络和资源，扫描完成自动销毁容器，防止安全工具本身成为攻击入口',
      'ReAct思考模式：Agent不按预设脚本执行，而是像真实渗透测试工程师一样"思考-行动-观察-再思考"，可以处理意外情况，灵活性远超传统扫描器',
      '早期停止策略：发现足够多的严重漏洞后自动停止扫描，避免不必要的流量和时间消耗，可配置阈值'
    ]
  },
  snippets: [
    {
      id: 'agent-base',
      title: '安全Agent基类：ReAct模式实现',
      whyThisFile: '这是strix所有Agent的基类，定义了Agent的完整生命周期和核心执行循环。代码展示了如何用LangChain构建一个基于ReAct（Reasoning + Acting）模式的AI Agent：LLM思考→调用工具→观察结果→继续思考，直到任务完成。这种模式让Agent不是死板地按脚本执行，而是能根据工具返回的结果动态调整策略，是当前AI Agent最主流的设计范式。基类还实现了完善的状态管理、错误处理、日志记录和钩子机制。',
      language: 'python',
      code: agentBaseCode,
      explanation: 'BaseSecurityAgent是一个抽象基类（ABC），使用了Python的dataclass、Pydantic、抽象方法、模板方法模式等设计。核心要点：1) AgentStatus枚举管理Agent生命周期状态（idle/running/waiting/completed/failed）；2) AgentContext在Agent间传递共享状态（目标、共享字典、发现列表、产物列表），是多Agent协作的数据总线；3) Finding和Artifact数据类标准化漏洞发现和执行产物的格式；4) 模板方法模式：run()方法定义了固定的执行流程（初始化→循环执行step→返回结果），子类通过实现system_prompt、_build_initial_prompt、_parse_result等抽象方法定制行为；5) _step()方法实现ReAct循环：调用LLM→检查是否需要调用工具→调用工具→将结果反馈给LLM→或者解析最终结果；6) 工具调用兼容两种格式：LangChain原生tool_calls和JSON-in-Markdown降级方案，适配不同能力的LLM。',
      lineExplanations: [
        {
          lineNumbers: [1, 70],
          title: '数据模型与类结构',
          content: '首先定义了AgentStatus状态枚举、AgentContext执行上下文、Finding漏洞发现、Artifact执行产物、AgentResult执行结果等核心数据结构。这些是Agent之间通信的"语言"。BaseSecurityAgent继承ABC成为抽象基类，使用@abstractmethod标记子类必须实现的方法。构造函数接收LLM实例、工具列表、迭代次数限制等配置，每个Agent有唯一ID、独立的消息历史，这种设计让多个Agent实例可以并行运行互不干扰。',
          knowledgePoints: ['agent-orchestration']
        },
        {
          lineNumbers: [88, 134],
          title: 'Agent主循环：迭代执行框架',
          content: 'run()方法是模板方法模式的体现：它定义了固定的执行骨架——initialize()初始化→循环max_iterations次_step()→每步检查是否should_stop→异常捕获返回失败结果。这种设计让子类只需要关心单步逻辑，不需要重复编写状态管理、异常处理、迭代控制等通用代码。max_iterations是防止Agent陷入死循环的安全阀——LLM可能会不断调用工具而不给出最终答案，必须有迭代上限。',
          knowledgePoints: ['agent-orchestration']
        },
        {
          lineNumbers: [136, 178],
          title: 'ReAct单步执行：思考-行动-观察',
          content: '_step()方法实现了经典的ReAct模式：1) 将消息历史发给LLM获取响应；2) 从响应中提取工具调用（支持LangChain原生tool_calls和手动解析JSON块两种格式，兼容不同LLM）；3) 如果有工具调用，执行工具并将结果作为HumanMessage追加到消息历史，这一步让LLM"看到"工具执行结果；4) 如果没有工具调用，说明LLM认为任务已完成，调用_parse_result解析最终答案。这就是AI Agent"自主决策"的核心循环。',
          knowledgePoints: ['agent-orchestration']
        }
      ],
      walkthroughSteps: [
        {
          id: 1,
          title: '数据模型与状态枚举',
          description: '代码开头导入 LangChain 核心类型和 Pydantic 模型，定义 AgentStatus 枚举管理 Agent 生命周期状态（idle/running/waiting/completed/failed）。这些基础数据结构是 Agent 之间通信的"语言"，状态机式的管理让 Agent 行为可追踪、可调试。',
          filePath: 'agent-base',
          highlightLines: [1, 25],
          keyInsight: '状态枚举让 Agent 生命周期清晰可追踪，是编排器调度的基础。'
        },
        {
          id: 2,
          title: '执行上下文与数据类',
          description: 'AgentContext 在 Agent 间传递共享状态（扫描 ID、目标、共享字典、发现列表、产物列表），是多 Agent 协作的数据总线。Finding 标准化漏洞发现格式（severity/CWE/CVSS），Artifact 记录执行产物，AgentResult 统一执行结果。这些数据类构成了 Agent 通信的完整契约。',
          filePath: 'agent-base',
          highlightLines: [26, 65],
          keyInsight: '标准化的数据类是多 Agent 协作的契约，让结果可汇总可追溯。'
        },
        {
          id: 3,
          title: 'BaseSecurityAgent 抽象基类与构造',
          description: 'BaseSecurityAgent 继承 ABC 成为抽象基类，构造函数接收 LLM 实例、工具列表、迭代上限等配置。每个 Agent 有唯一 ID（uuid4 生成）、独立的消息历史 _messages、专属的 logger。system_prompt 是抽象属性，子类必须实现。这种设计让多个 Agent 实例可并行运行互不干扰。',
          filePath: 'agent-base',
          highlightLines: [68, 97],
          keyInsight: '抽象基类 + 模板方法模式：通用逻辑在基类，定制逻辑由子类实现。'
        },
        {
          id: 4,
          title: 'Agent 初始化与主循环',
          description: 'initialize 方法构建初始消息列表（SystemMessage + HumanMessage），run 方法是模板方法模式的体现：固定执行骨架——初始化→循环 max_iterations 次 _step()→每步检查 should_stop→异常捕获返回失败。max_iterations 是防止 Agent 陷入死循环的安全阀，LLM 可能不断调用工具而不给出最终答案。',
          filePath: 'agent-base',
          highlightLines: [99, 155],
          keyInsight: '模板方法模式让子类只需关心单步逻辑，迭代上限是防死循环安全阀。'
        },
        {
          id: 5,
          title: 'ReAct 单步执行：思考-行动-观察',
          description: '_step 方法实现经典 ReAct 循环：将消息历史发给 LLM→从响应提取工具调用（兼容 LangChain 原生 tool_calls 和手动解析 JSON 块两种格式）→执行工具并将结果作为 HumanMessage 追加到消息历史→若无工具调用则调用 _parse_result 解析最终答案。add_finding 记录安全发现。这就是 AI Agent 自主决策的核心循环。',
          filePath: 'agent-base',
          highlightLines: [157, 208],
          keyInsight: 'ReAct 模式让 Agent 像人类工程师一样思考-行动-观察-再思考。'
        }
      ]
    },
    {
      id: 'orchestrator',
      title: '扫描编排器：多阶段多Agent调度',
      whyThisFile: 'ScanOrchestrator是strix的"大脑"，展示了如何编排多个AI Agent协同完成复杂的多阶段任务。代码实现了一个状态机驱动的工作流：侦察→扫描→利用→报告，每个阶段可以并行运行多个Agent。还包括工具注入（不同Agent获得不同工具集）、早期停止策略、错误隔离、异步执行等企业级特性。学习这段代码可以理解多Agent系统的核心设计模式。',
      language: 'python',
      code: orchestratorCode,
      explanation: 'ScanOrchestrator编排器核心设计：1) ScanPhase枚举定义扫描阶段的状态机，流程是单向的：侦察→扫描→利用→报告→完成；2) PHASE_AGENTS字典定义每个阶段应该运行哪些Agent类，这是"配置而非编码"的设计，新增阶段或Agent只需要修改这个映射；3) start_scan()创建ScanState和AgentContext，用asyncio.create_task异步启动扫描（不阻塞调用者），返回scan_id供后续查询；4) _run_scan()按顺序遍历阶段，每个阶段调用_run_phase_agents()；5) _run_phase_agents()实例化Agent、注入工具、用asyncio.gather并行执行，return_exceptions=True确保单个Agent失败不影响其他Agent；6) _get_tools_for_agent()是依赖注入的体现——不同Agent获得不同的工具集，侦察Agent获得扫描工具但不会获得漏洞利用工具，这符合最小权限原则；7) _should_continue()实现早期停止策略——发现足够多严重漏洞后提前终止。',
      lineExplanations: [
        {
          lineNumbers: [1, 42],
          title: '状态管理与阶段定义',
          content: 'ScanPhase枚举定义扫描的四个阶段+完成状态，这是一个典型的有限状态机。ScanState数据类持有整个扫描过程的所有状态：扫描ID、目标、配置、当前阶段、Agent上下文、各Agent结果、错误列表。ScanOrchestrator用active_scans字典管理所有运行中的扫描，支持并发扫描多个目标。PHASE_AGENTS类变量定义了每个阶段对应的Agent类列表——这种"数据驱动"的设计让调整流程非常简单，不需要修改执行逻辑。',
          knowledgePoints: ['agent-orchestration']
        },
        {
          lineNumbers: [65, 110],
          title: '异步扫描执行与阶段流转',
          content: 'start_scan()创建必要的上下文对象后，用asyncio.create_task()异步启动扫描——这让API调用立即返回scan_id，扫描在后台执行，符合"长任务异步化"的最佳实践。_run_scan()按顺序遍历每个阶段：调用_run_phase_agents执行该阶段所有Agent，然后检查_should_continue()决定是否继续。支持dry_run模式跳过漏洞利用阶段（用于只扫描不利用的安全评估场景）。所有异常被捕获并记录，不会因为一个阶段失败导致整个进程崩溃。',
          knowledgePoints: ['agent-orchestration']
        },
        {
          lineNumbers: [112, 160],
          title: '并行Agent执行与工具注入',
          content: '_run_phase_agents()展示了如何并行执行多个Agent：实例化每个Agent→收集所有run()协程→asyncio.gather并行执行。return_exceptions=True是关键配置——没有它，一个Agent抛出异常会导致gather立即取消其他所有Agent；设置为True后异常会作为结果返回，编排器可以单独记录失败而不影响其他Agent。_get_tools_for_agent()实现工具的依赖注入：根据Agent类型提供对应的工具集，比如侦察阶段不提供ExploitTool，符合最小权限原则。新增工具或Agent时只需要扩展这个方法，符合开放-封闭原则。',
          knowledgePoints: ['agent-orchestration']
        }
      ],
      walkthroughSteps: [
        {
          id: 1,
          title: '扫描阶段枚举与状态定义',
          description: 'ScanPhase 枚举定义扫描的四个阶段（侦察→扫描→利用→报告→完成），是典型的有限状态机。ScanState 数据类持有整个扫描过程的状态：扫描 ID、目标、配置、当前阶段、Agent 上下文、各 Agent 结果、错误列表。这种集中式状态管理让扫描过程可追踪、可恢复。',
          filePath: 'orchestrator',
          highlightLines: [22, 38],
          keyInsight: '状态机驱动的阶段流转，让复杂的多阶段任务清晰可控。'
        },
        {
          id: 2,
          title: 'ScanOrchestrator 类与阶段映射',
          description: 'PHASE_AGENTS 类变量定义每个阶段对应的 Agent 类列表——这是"配置而非编码"的设计，新增阶段或 Agent 只需修改这个映射。__init__ 接收 LLM、配置、Docker 沙箱、浏览器管理器等依赖，active_scans 字典支持并发管理多个扫描任务。这种设计让流程调整无需改动执行逻辑。',
          filePath: 'orchestrator',
          highlightLines: [41, 62],
          keyInsight: '数据驱动的阶段-Agent 映射，新增流程只需改配置不改代码。'
        },
        {
          id: 3,
          title: '启动扫描：异步任务创建',
          description: 'start_scan 创建 AgentContext（含共享状态字典）和 ScanState，用 asyncio.create_task 异步启动扫描并立即返回 scan_id。这种"长任务异步化"模式让 API 调用不阻塞，调用者可后续通过 get_scan_status 查询进度。共享状态字典是 Agent 间数据传递的通道。',
          filePath: 'orchestrator',
          highlightLines: [64, 92],
          keyInsight: 'asyncio.create_task 实现扫描异步化，API 立即返回不阻塞调用者。'
        },
        {
          id: 4,
          title: '阶段流转与扫描执行',
          description: '_run_scan 按顺序遍历每个阶段：调用 _run_phase_agents 执行该阶段所有 Agent，然后检查 _should_continue 决定是否继续。支持 dry_run 模式跳过漏洞利用阶段。所有异常被捕获并记录到 state.errors，不会因为一个阶段失败导致整个进程崩溃。阶段完成后更新状态为 COMPLETED。',
          filePath: 'orchestrator',
          highlightLines: [94, 125],
          keyInsight: '逐阶段推进 + 早期停止策略，平衡扫描深度与资源消耗。'
        },
        {
          id: 5,
          title: '并行 Agent 执行与工具注入',
          description: '_run_phase_agents 用 asyncio.gather 并行执行同阶段所有 Agent，return_exceptions=True 确保单个失败不影响其他。_get_tools_for_agent 实现依赖注入：侦察 Agent 获得扫描工具但不获得利用工具，符合最小权限原则。_should_continue 检查严重漏洞数量实现早期停止。get_scan_status 提供状态查询接口。',
          filePath: 'orchestrator',
          highlightLines: [127, 205],
          keyInsight: '并行执行提升效率，工具按角色注入遵循最小权限原则。'
        }
      ]
    }
  ]
};
