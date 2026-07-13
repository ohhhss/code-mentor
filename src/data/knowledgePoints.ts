import type { KnowledgePoint } from '@/types';

export const knowledgePoints: Record<string, KnowledgePoint> = {
  'generics': {
    id: 'generics',
    name: 'TypeScript 泛型',
    category: 'typescript',
    explanation: '泛型是 TypeScript 中创建可复用组件的核心机制，允许在定义时不指定具体类型，而是在使用时传入。它提供了编译时类型安全，避免了 any 类型带来的类型丢失问题。通过泛型约束，可以精确描述参数与返回值之间的类型关系，让 IDE 提供准确的类型提示。在 mitt 中，泛型 Events 让 on/emit 之间的事件类型完全对应，是类型安全事件系统的基础。',
    codeExample: `function identity<T>(arg: T): T {
  return arg;
}
const str = identity<string>('hello');
const num = identity(42);`
  },
  'map-data-structure': {
    id: 'map-data-structure',
    name: 'Map 数据结构',
    category: 'javascript',
    explanation: 'Map 是 ES6 引入的键值对集合，相比普通 Object 有多个优势：键可以是任意类型（包括对象、Symbol）、有内置的 size 属性、性能在频繁增删场景下更优、提供 entries/keys/values 迭代器、不会继承原型链上的属性。mitt 选择 Map 存储事件处理器而非 Object，正是因为事件名可能是 Symbol，且需要频繁的 get/set/delete 操作。Map 的 get/set 操作时间复杂度为 O(1)，是存储事件映射的理想选择。',
    codeExample: `const map = new Map();
map.set('event', [handler1, handler2]);
map.set(Symbol('unique'), [handler3]);
console.log(map.get('event'));`
  },
  'pubsub-pattern': {
    id: 'pubsub-pattern',
    name: '发布订阅模式',
    category: 'design-pattern',
    explanation: '发布订阅模式是一种行为设计模式，定义了对象间一对多的依赖关系。发布者（emit）发送消息时不需要知道谁是订阅者，订阅者（on）监听事件也不需要知道发布者是谁，两者通过事件通道解耦。这种模式广泛应用于前端事件系统、消息队列、微服务通信等场景。mitt 是发布订阅模式的极简实现，核心只有 on/off/emit 三个方法，完整实现了该模式的核心思想。',
    codeExample: `const bus = mitt();
bus.on('user:login', (user) => console.log('登录:', user));
bus.emit('user:login', { id: 1, name: 'Alice' });`
  },
  'functional-programming': {
    id: 'functional-programming',
    name: '函数式设计',
    category: 'javascript',
    explanation: '函数式编程强调使用纯函数、避免共享状态、不依赖 this 上下文。mitt 的设计完全遵循函数式理念：mitt() 是一个工厂函数，返回的是普通对象字面量而非类实例；所有方法不依赖 this，可以安全解构使用；没有原型链继承，没有类的概念。这种设计让代码更简洁、更易于测试，函数可以自由传递而不需要绑定 this。200 字节的体积正是得益于这种极简的函数式设计。',
    codeExample: `const { on, emit } = mitt();
on('event', () => {});
emit('event');`
  },
  'wildcard-event': {
    id: 'wildcard-event',
    name: '通配符事件监听',
    category: 'javascript',
    explanation: '通配符监听使用特殊事件名 "*" 监听所有事件触发，这是事件系统中常见的高级特性。当调用 emit 触发任何事件时，通配符处理器都会收到事件类型和事件数据两个参数。这个功能在调试日志、事件埋点、全局错误监控等场景非常有用。mitt 对通配符的实现非常简洁，在处理完普通事件后单独处理 "*" 类型的处理器数组，保持了核心逻辑的清晰度。',
    codeExample: `bus.on('*', (type, data) => {
  console.log(\`事件触发: \${type}\`, data);
});`
  },
  'closure': {
    id: 'closure',
    name: '闭包',
    category: 'javascript',
    explanation: '闭包是 JavaScript 的核心概念之一，指函数能够记住并访问其词法作用域，即使函数在该作用域之外执行。mitt 中所有 on/off/emit 方法都能访问工厂函数内部的 all 变量，这就是闭包的典型应用。all 变量是"私有"的，外部只能通过返回的对象方法操作它，实现了封装。这种基于闭包的封装比 ES6 类的私有字段（#）兼容性更好，也是函数式编程中封装状态的常用手段。',
    codeExample: `function createCounter() {
  let count = 0;
  return {
    increment: () => count++,
    get: () => count
  };
}`
  },
  'type-inference': {
    id: 'type-inference',
    name: '类型推导',
    category: 'typescript',
    explanation: '类型推导是 TypeScript 编译器自动推导表达式类型的能力，开发者不需要在每个地方显式标注类型。当你调用 mitt<Events>() 传入 Events 类型后，TypeScript 会自动推导 on 方法的 type 参数只能是 Events 的 key，handler 参数类型会根据 type 自动推导。好的泛型设计应该充分利用类型推导，让使用者在享受类型安全的同时不需要写冗余的类型标注。mitt 的类型设计充分利用了这一点。',
    codeExample: `type Events = { click: MouseEvent };
const em = mitt<Events>();
em.on('click', (e) => {
  // e 被自动推导为 MouseEvent 类型
});`
  },
  'duck-typing': {
    id: 'duck-typing',
    name: '鸭子类型',
    category: 'general',
    explanation: '鸭子类型是动态类型语言中的一种类型判断方式："如果它走起来像鸭子、叫起来像鸭子，那它就是鸭子"。TypeScript 的结构类型系统本质上就是鸭子类型的静态实现——只检查对象是否有需要的结构，而不要求通过继承或实现接口来声明类型关系。mitt 的类型设计也体现了这一点：GenericEventHandler 不需要显式声明为 Handler 或 WildcardHandler 的联合，只要兼容即可。这种设计让类型系统更灵活，减少了不必要的样板代码。',
    codeExample: `interface Point { x: number; y: number }
function printPoint(p: Point) {}
printPoint({ x: 1, y: 2 });`
  },
  'websocket': {
    id: 'websocket',
    name: 'WebSocket',
    category: 'architecture',
    explanation: 'WebSocket 是一种全双工通信协议，在单个 TCP 连接上提供客户端与服务器之间的实时双向数据传输。与 HTTP 的请求-响应模式不同，WebSocket 建立连接后服务器可以主动向客户端推送消息，非常适合实时协作、聊天、实时数据展示等场景。在 TREK 这样的多人协作平台中，WebSocket 是实现行程实时同步、多人光标位置同步、预算变更实时通知的核心技术。NestJS 提供了 @WebSocketGateway 装饰器简化 WebSocket 开发。',
    codeExample: `@WebSocketGateway()
class CollabGateway {
  @SubscribeMessage('trip:update')
  handleUpdate(client: Client, data: TripUpdate) {
    client.broadcast.to(data.tripId).emit('trip:updated', data);
  }
}`
  },
  'plugin-sdk': {
    id: 'plugin-sdk',
    name: '插件 SDK',
    category: 'architecture',
    explanation: '插件 SDK 是一套接口规范，允许第三方开发者在不修改宿主程序核心代码的情况下扩展其功能。设计良好的插件系统应该定义清晰的生命周期钩子、上下文注入机制、能力隔离和沙箱环境。TREK 的插件 SDK 允许开发者添加新的地图图层、导出格式、预算计算规则等扩展功能，而不需要修改核心代码。这种开放-封闭原则（对扩展开放，对修改封闭）的应用让系统在保持核心稳定的同时具备无限扩展性。',
    codeExample: `interface TrekPlugin {
  name: string;
  onInit?: (context: PluginContext) => void;
  registerMapLayer?: () => MapLayer;
  registerExporter?: () => Exporter;
}`
  },
  'tree-sitter': {
    id: 'tree-sitter',
    name: 'Tree-sitter',
    category: 'architecture',
    explanation: 'Tree-sitter 是一个增量解析器生成器和解析库，能够快速为源代码构建具体语法树（CST）。它支持 150+ 种编程语言，最显著的特性是增量解析——当代码编辑时只重新解析变化的部分，性能可以满足实时编辑器的需求。codebase-memory-mcp 使用 Tree-sitter 作为代码分析的底层引擎，为所有支持的语言生成统一的语法树结构，在此基础上构建符号提取、引用查找、代码导航等高级功能。Tree-sitter 的错误容忍特性即使在代码语法不完整时也能生成可用的语法树。',
    codeExample: `TSParser *parser = ts_parser_new();
ts_parser_set_language(parser, tree_sitter_typescript());
TSTree *tree = ts_parser_parse_string(parser, NULL, code, strlen(code));`
  },
  'knowledge-graph': {
    id: 'knowledge-graph',
    name: '知识图谱',
    category: 'architecture',
    explanation: '知识图谱是以图结构存储实体及其关系的数据模型，节点表示实体（函数、类、变量、文件等），边表示实体之间的关系（定义、引用、调用、继承等）。codebase-memory-mcp 将代码库解析后构建成知识图谱，存储在 SQLite 中，支持复杂的图查询：查找某个函数的所有调用者、追踪变量的数据流、发现模块之间的依赖关系。相比传统的基于正则或 AST 的搜索，知识图谱能够理解代码的语义关系，提供更智能的代码导航和上下文理解能力。',
    codeExample: `// 节点: function(name="createUser", file="user.ts")
// 边: calls -> function(name="hashPassword")
// 边: defined_in -> file(name="user.ts")`
  },
  'agent-orchestration': {
    id: 'agent-orchestration',
    name: 'Agent 编排',
    category: 'architecture',
    explanation: 'Agent 编排是协调多个 AI Agent 协同工作的架构模式，负责任务分解、任务分配、状态管理、结果汇总和错误处理。在 strix 这样的自动化渗透测试工具中，编排器需要调度侦察 Agent、扫描 Agent、漏洞利用 Agent 等按顺序或并行工作，管理每个 Agent 的执行状态，传递中间结果，并在发现高危漏洞时立即调整策略。优秀的 Agent 编排系统应该具备可视化工作流、条件分支、重试机制、人工介入点等特性。LangGraph 等框架专门用于构建这类复杂的多 Agent 工作流。',
    codeExample: `class Orchestrator {
  async runScan(target: string) {
    const recon = await this.reconAgent.run(target);
    const vulns = await this.scanAgent.run(recon.openPorts);
    return this.exploitAgent.run(vulns);
  }
}`
  },
  'event-driven': {
    id: 'event-driven',
    name: '事件驱动架构',
    category: 'architecture',
    explanation: '事件驱动架构是一种软件架构模式，系统组件通过事件进行异步通信，组件之间不直接调用而是通过发布/订阅事件来交互。这种架构的核心优势是松耦合——发布者不需要知道订阅者的存在，新增订阅者不需要修改发布者代码。TREK 的实时协作系统本质上是事件驱动的：用户操作产生事件，事件通过 WebSocket 广播，其他客户端接收事件更新本地状态。事件溯源（Event Sourcing）进一步将所有状态变更都存储为事件序列，可以重放事件重建任意时刻的状态。',
    codeExample: `// 用户移动地图 -> 广播 'map:move' 事件
// 其他客户端接收 -> 更新本地地图视图
// 事件持久化 -> 支持重放和离线同步`
  },
  'zero-config': {
    id: 'zero-config',
    name: '零配置设计',
    category: 'general',
    explanation: '零配置（Zero Config）是一种库/工具的设计哲学：提供经过深思熟虑的智能默认值，用户在最简单的场景下不需要任何配置即可使用，同时在需要时又提供充分的自定义能力。mitt 就是零配置设计的典范——最简单的用法只需要 import mitt from \'mitt\' 然后调用 mitt() 即可使用，不需要传任何参数，但同时也支持传入自定义的 Map 实例供高级场景使用。这种设计降低了入门门槛，同时不牺牲灵活性，是优秀开源库的共同特征。',
    codeExample: `// 零配置使用
const emitter = mitt();
emitter.on('event', handler);

// 高级场景：传入自定义 Map
const myMap = new Map();
const emitter2 = mitt(myMap);`
  }
};
