import type { FullProjectData, FileNode } from '@/types';

const mittIndexTs = `export type EventType = string | symbol;

export type Handler<T = unknown> = (event: T) => void;
export type WildcardHandler<T = Record<string, unknown>> = (
	type: keyof T,
	event: T[keyof T]
) => void;

export type EventHandlerList<T = unknown> = Array<Handler<T>>;
export type WildCardEventHandlerList<T = Record<string, unknown>> = Array<WildcardHandler<T>>;

export type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
	keyof Events | '*',
	EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;

export interface Emitter<Events extends Record<EventType, unknown>> {
	all: EventHandlerMap<Events>;
	on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
	on(type: '*', handler: WildcardHandler<Events>): void;
	off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void;
	off(type: '*', handler: WildcardHandler<Events>): void;
	emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
	emit<Key extends keyof Events>(type: undefined extends Events[Key] ? Key : never): void;
}

export default function mitt<Events extends Record<EventType, unknown>>(
	all?: EventHandlerMap<Events>
): Emitter<Events> {
	type GenericEventHandler =
		| Handler<Events[keyof Events]>
		| WildcardHandler<Events>;

	all = all || new Map();

	return {
		all,

		on(type: keyof Events, handler: GenericEventHandler) {
			const handlers: Array<GenericEventHandler> | undefined = all!.get(type);
			if (handlers) {
				handlers.push(handler);
			} else {
				all!.set(type, [handler] as EventHandlerList<Events[keyof Events]>);
			}
		},

		off(type: keyof Events, handler?: GenericEventHandler) {
			const handlers: Array<GenericEventHandler> | undefined = all!.get(type);
			if (handlers) {
				if (handler) {
					handlers.splice(handlers.indexOf(handler) >>> 0, 1);
				} else {
					all!.set(type, []);
				}
			}
		},

		emit(type: keyof Events, evt?: Events[keyof Events]) {
			let handlers = all!.get(type);
			if (handlers) {
				(handlers as EventHandlerList<Events[keyof Events]>)
					.slice()
					.map((handler) => {
						handler(evt!);
					});
			}

			handlers = all!.get('*');
			if (handlers) {
				(handlers as WildCardEventHandlerList<Events>)
					.slice()
					.map((handler) => {
						handler(type, evt!);
					});
			}
		}
	};
}
`;

const packageJson = `{
  "name": "mitt",
  "version": "3.0.1",
  "description": "Tiny 200b functional Event Emitter / pubsub.",
  "main": "dist/mitt.js",
  "module": "dist/mitt.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/mitt.mjs",
      "require": "./dist/mitt.js"
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [
    "events",
    "eventemitter",
    "pubsub",
    "emitter"
  ],
  "author": "Jason Miller",
  "license": "MIT",
  "repository": "developit/mitt"
}
`;

const tsconfigJson = `{
  "compilerOptions": {
    "target": "ES2017",
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
`;

const readmeMd = `# mitt

> Tiny 200b functional event emitter / pubsub.

- **Microscopic:** weighs less than 200 bytes gzipped
- **Useful:** a wildcard "*" event type listens to all events
- **Familiar:** same names & ideas as [Node's EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter)
- **Functional:** methods don't rely on this
- **Great Name:** somehow [mitt](https://npm.im/mitt) wasn't taken

## Installation

\`\`\`sh
npm install mitt
\`\`\`

## Usage

\`\`\`js
import mitt from 'mitt'

const emitter = mitt()

// listen to an event
emitter.on('foo', e => console.log('foo', e) )

// listen to all events
emitter.on('*', (type, e) => console.log(type, e) )

// fire an event
emitter.emit('foo', { a: 'b' })

// clearing all events
emitter.all.clear()

// working with handler references:
function onFoo() {}
emitter.on('foo', onFoo)   // listen
emitter.off('foo', onFoo)  // unlisten
\`\`\`
`;

const fileTree: FileNode = {
  name: 'mitt',
  path: '/',
  type: 'directory',
  children: [
    { name: 'src', path: '/src', type: 'directory', children: [
      { name: 'index.ts', path: '/src/index.ts', type: 'file', language: 'typescript', isEntry: true }
    ]},
    { name: 'package.json', path: '/package.json', type: 'file', language: 'json' },
    { name: 'tsconfig.json', path: '/tsconfig.json', type: 'file', language: 'json' },
    { name: 'README.md', path: '/README.md', type: 'file', language: 'markdown' }
  ]
};

export const mittProjectData: FullProjectData = {
  projectId: 'mitt',
  fileTree,
  files: {
    '/src/index.ts': {
      content: mittIndexTs,
      lesson: {
        filePath: '/src/index.ts',
        overview: '这是 mitt 的唯一核心源码文件，整个库的所有逻辑都在这 70 行 TypeScript 代码中实现。文件首先定义了一套完整的 TypeScript 类型系统来描述事件处理器和发射器接口，然后实现了 mitt 工厂函数。代码遵循函数式编程理念，没有类、没有 this、没有原型链，仅用闭包和普通对象实现了一个类型安全的发布订阅系统。',
        keyConcepts: [
          'TypeScript 泛型约束实现类型安全事件系统',
          'Map 数据结构存储事件处理器映射',
          '发布订阅模式极简实现',
          '通配符 "*" 事件监听机制',
          '防御性拷贝避免遍历中修改数组异常',
          '>>> 0 无符号右移的边界处理技巧',
          '基于闭包的状态封装'
        ],
        coreIdeas: [
          '极致精简：200字节实现完整事件发射器，只保留核心 on/off/emit',
          '类型安全：利用 TypeScript [[generics]] 让事件名和事件数据类型一一对应',
          '函数式设计：工厂函数返回普通对象，方法不依赖 this，便于解构使用',
          '灵活扩展：允许传入外部 Map 实例，支持 [[zero-config]] 开箱即用',
          '防御性编程：slice() 拷贝数组遍历，避免处理器中注册/注销导致的遍历异常'
        ],
        lineExplanations: [
          {
            lineNumbers: [1, 1],
            title: '事件类型定义',
            content: 'EventType 将事件类型约束为 string 或 symbol。支持 Symbol 类型是一个重要设计——使用 Symbol 可以创建唯一的事件名，避免不同模块之间事件名冲突。这也是 mitt 选择 [[map-data-structure]] 而非 Object 存储处理器的原因之一：Object 的键只能是 string/symbol，而 Map 支持任意类型的键，扩展性更强。',
            knowledgePoints: ['map-data-structure']
          },
          {
            lineNumbers: [3, 3],
            title: '普通事件处理器类型',
            content: 'Handler<T> 定义了普通事件处理器的函数签名：接收一个事件数据参数，无返回值。泛型参数 T 表示事件数据的类型，默认值为 unknown——这比 any 更安全，unknown 要求使用者必须进行类型检查或类型断言后才能操作，避免隐式 any 带来的类型问题。这是 TypeScript 中"严格类型"设计的体现。',
            knowledgePoints: ['generics', 'type-inference']
          },
          {
            lineNumbers: [4, 7],
            title: '通配符事件处理器类型',
            content: 'WildcardHandler 是通配符事件的处理器签名，它接收两个参数：第一个是事件类型 type，第二个是事件数据 event。当使用 \'*\' 监听所有事件时，处理器需要知道当前触发的是什么事件，因此多了一个 type 参数。这里 T 的约束是 Record<string, unknown>，表示事件映射对象类型，keyof T 就是所有可能的事件类型联合。通配符是调试、日志埋点、全局监控等场景的实用特性，体现了 [[wildcard-event]] 的设计。',
            knowledgePoints: ['wildcard-event', 'generics']
          },
          {
            lineNumbers: [9, 10],
            title: '处理器数组类型别名',
            content: 'EventHandlerList 和 WildCardEventHandlerList 分别是普通处理器数组和通配符处理器数组的类型别名。这里使用 Array<T> 而非 T[] 只是代码风格偏好，两者在 TypeScript 中完全等价。将这些常用的数组类型提取出来，可以让后续的类型定义更简洁，避免重复书写 Array<Handler<T>> 这样的长类型。',
            knowledgePoints: []
          },
          {
            lineNumbers: [12, 15],
            title: '事件映射存储类型',
            content: 'EventHandlerMap 是整个事件系统的核心存储类型：使用 [[map-data-structure]] 将事件名（keyof Events 或 \'*\'）映射到对应的处理器数组。Map 的值类型是联合类型——要么是 EventHandlerList（普通事件处理器数组），要么是 WildCardEventHandlerList（通配符处理器数组）。这意味着同一个事件名只能对应一种处理器类型，\'*\' 只能对应通配符处理器数组，类型上保证了逻辑正确性。',
            knowledgePoints: ['map-data-structure', 'generics']
          },
          {
            lineNumbers: [17, 26],
            title: 'Emitter 接口定义',
            content: 'Emitter 接口定义了事件发射器的完整公共 API。这里使用了 TypeScript [[generics]] 的函数重载特性：on/off 方法分别为普通事件和通配符事件提供了不同的类型签名。当你调用 on(\'click\', handler) 时，TypeScript 会匹配第一个重载，handler 的参数类型被推导为 Events[\'click\']；当你调用 on(\'*\', handler) 时，匹配第二个重载，handler 必须是 WildcardHandler 类型。emit 同样有两个重载：第二个重载处理可选事件的情况——当 Events[Key] 是 undefined 时，调用 emit 不需要传第二个参数。这套类型设计让 mitt 在保持 API 简洁的同时实现了完美的类型安全，[[type-inference]] 让使用者几乎不需要写显式类型标注。',
            knowledgePoints: ['generics', 'type-inference', 'pubsub-pattern']
          },
          {
            lineNumbers: [28, 31],
            title: 'mitt 函数签名与内部类型',
            content: 'mitt 是一个工厂函数，接收可选的 EventHandlerMap 参数，返回 Emitter 实例。这是 [[functional-programming]] 的典型设计——没有 class，没有 new 关键字，只是一个普通函数。函数内部定义了 GenericEventHandler 类型，它是普通 Handler 和 WildcardHandler 的联合类型。这个内部类型只在函数实现中使用，不对外暴露，简化了内部方法的类型注解——on/off 内部不需要区分是哪种 handler，统一用 GenericEventHandler 处理。',
            knowledgePoints: ['functional-programming', 'generics']
          },
          {
            lineNumbers: [33, 33],
            title: 'Map 初始化逻辑',
            content: 'all = all || new Map() 这行代码体现了 [[zero-config]] 设计哲学：最简单的场景下用户只需要调用 mitt() 不需要任何参数，此时会自动创建一个新的 Map 实例；但同时也支持高级用法——用户可以传入自己的 Map 实例。传入外部 Map 的场景包括：测试时预置事件处理器、跨多个 emitter 共享处理器、使用 Map 子类添加额外功能等。这行代码用最短的方式同时支持了"零配置开箱即用"和"可自定义扩展"两种需求。all 变量通过 [[closure]] 被返回的对象方法捕获，成为"私有"状态。',
            knowledgePoints: ['zero-config', 'closure', 'map-data-structure']
          },
          {
            lineNumbers: [38, 45],
            title: 'on 方法：事件订阅实现',
            content: 'on 方法实现了 [[pubsub-pattern]] 中的"订阅"操作。逻辑非常直接：先从 Map 中获取该事件类型已有的处理器数组。如果数组存在，就将新 handler push 进去（同一个事件可以有多个处理器）；如果不存在，就创建一个只包含当前 handler 的新数组存入 Map。这里有一个类型断言 as EventHandlerList<Events[keyof Events]>——因为内部 GenericEventHandler 是联合类型，TypeScript 无法确定存入的是普通处理器数组还是通配符数组，但从逻辑上我们知道 key 不是 \'*\' 时存入的是普通处理器数组。非空断言 all!. 告诉 TypeScript：all 在这里一定有值（因为前面已经初始化过了）。',
            knowledgePoints: ['pubsub-pattern', 'closure', 'functional-programming']
          },
          {
            lineNumbers: [47, 57],
            title: 'off 方法：取消订阅与位运算技巧',
            content: 'off 方法实现了"取消订阅"，这里有一个非常精妙的 JavaScript 技巧：handlers.indexOf(handler) >>> 0。indexOf 找不到元素时返回 -1，如果直接 splice(-1, 1) 会删除数组最后一个元素——这是个严重 bug。通常的写法是 if (index !== -1) handlers.splice(index, 1)，但 mitt 用了更精简的位运算：-1 >>> 0 === 4294967295（32位无符号整数的最大值），splice 一个远超数组长度的索引不会做任何事，也不会报错。这样就省去了 if 判断，省了几个字节。如果没传 handler 参数，off 会清空该事件类型的所有处理器（设置为空数组）。非空断言同样用于 all!.get。这就是"微型库"的编程哲学——在保证正确性的前提下，用最精简的代码。',
            knowledgePoints: ['pubsub-pattern', 'closure']
          },
          {
            lineNumbers: [59, 77],
            title: 'emit 方法：事件触发与防御性拷贝',
            content: 'emit 方法实现了"发布"操作，分为两部分：首先触发对应事件类型的普通处理器，然后触发通配符 \'*\' 处理器。这里有一个关键设计：(handlers as ...).slice().map(...)——先调用 .slice() 创建数组的浅拷贝，再遍历拷贝调用处理器。为什么？因为在处理器函数内部，完全有可能调用 on 注册新处理器或调用 off 注销处理器。如果直接遍历原数组，遍历过程中数组被修改会导致跳过元素或重复遍历等异常行为——这是事件系统中经典的"遍历中修改"问题。slice() 防御性拷贝完美解决了这个问题。注意普通处理器调用时只传 evt，通配符处理器调用时传 type 和 evt 两个参数，与类型定义一致。通配符处理器在普通处理器之后执行，确保它们能监听到所有事件的最终触发。evt! 非空断言是因为 TypeScript 无法确定 emit 一定传了 evt 参数，但在实际运行时处理器应该自己处理 undefined 的情况。',
            knowledgePoints: ['pubsub-pattern', 'wildcard-event', 'closure']
          }
        ]
      }
    },
    '/package.json': {
      content: packageJson,
      lesson: {
        filePath: '/package.json',
        overview: 'mitt 的 package.json 文件，声明了包的基本信息、入口文件和导出配置。特别注意 exports 字段同时提供了 ESM 和 CommonJS 两种入口，以及 TypeScript 类型声明文件入口。',
        keyConcepts: ['双模块格式支持', 'TypeScript 类型声明', 'npm 包配置'],
        coreIdeas: ['同时提供 ESM import 和 CJS require 支持', 'types 字段指向类型声明文件', 'files 字段只发布必要文件减少包体积'],
        lineExplanations: [
          {
            lineNumbers: [1, 20],
            title: 'npm 包配置文件',
            content: 'package.json 是 npm 包的清单文件。main 字段指定 CommonJS 入口，module 字段指定 ESM 入口（打包工具如 webpack/rollup 优先使用 module），types 字段指定 TypeScript 类型声明入口。exports 字段是 Node.js 现代包入口配置，更精确地控制不同导入方式下的入口文件。这种配置确保 mitt 在各种环境（Node.js、浏览器、各种打包工具）下都能正确加载。',
            knowledgePoints: []
          }
        ]
      }
    },
    '/tsconfig.json': {
      content: tsconfigJson,
      lesson: {
        filePath: '/tsconfig.json',
        overview: 'mitt 的 TypeScript 编译配置文件，配置了输出目录、模块系统、严格模式等选项。declaration: true 让 TypeScript 自动生成 .d.ts 类型声明文件。',
        keyConcepts: ['TypeScript 编译配置', '类型声明生成', '严格模式'],
        coreIdeas: ['target ES2017 确保现代浏览器兼容性', 'strict: true 开启所有严格类型检查', 'outDir 指定编译输出到 dist 目录'],
        lineExplanations: [
          {
            lineNumbers: [1, 12],
            title: 'TypeScript 编译配置',
            content: 'tsconfig.json 配置 TypeScript 编译器行为。target 设为 ES2017 兼容现代环境；module 设为 ESNext 支持 ESM 模块；declaration: true 自动生成 .d.ts 类型文件；strict: true 开启所有严格类型检查，这是高质量 TypeScript 库的标配。',
            knowledgePoints: []
          }
        ]
      }
    },
    '/README.md': {
      content: readmeMd,
      lesson: {
        filePath: '/README.md',
        overview: 'mitt 的 README 文档，简洁地介绍了库的特点、安装方式和使用示例。优秀的 README 应该在最短时间内让用户知道这个库是什么、为什么用、怎么用。',
        keyConcepts: ['开源项目文档', 'API 快速上手'],
        coreIdeas: ['突出核心卖点：200字节、通配符、函数式', '提供复制即用的代码示例', '清晰展示常用 API：on/emit/off'],
        lineExplanations: [
          {
            lineNumbers: [1, 40],
            title: '项目说明文档',
            content: 'README 是开源项目的门面。mitt 的 README 非常精炼：第一句话就说明是什么（Tiny 200b functional event emitter），然后列出核心特性（体积小、通配符、API 熟悉、函数式、名字好），接着是安装命令和最常用的使用示例。注意示例特意展示了所有主要用法：on 监听、on \'*\' 监听所有、emit 触发、all.clear() 清空、off 取消，让用户复制粘贴就能开始用。',
            knowledgePoints: []
          }
        ]
      }
    }
  },
  walkthroughSteps: [
    {
      id: 1,
      title: '整体概览：200字节的事件系统',
      description: '在深入代码之前，我们先理解 mitt 是什么。mitt 是一个只有 200 字节（gzip 后）的函数式事件发射器，是 npm 上最流行的 EventEmitter 实现之一。它的核心价值不是功能多，而是极致精简——只保留发布订阅模式最核心的三个 API：on（订阅）、off（取消订阅）、emit（触发事件），外加通配符监听。整个库只有一个源文件 src/index.ts，共 70 行代码，没有任何外部依赖。学习 mitt 是理解"微型库"设计哲学的绝佳案例：如何在最小的代码量内实现完整的类型安全和功能。',
      filePath: '/src/index.ts',
      highlightLines: [28, 33],
      keyInsight: '好的库不是功能越多越好，而是在满足需求的前提下尽可能精简——这才是真正的"高级"设计。'
    },
    {
      id: 2,
      title: '类型定义：用泛型描述事件',
      description: '代码前 26 行全是类型定义，这在 JS 库中不常见，但正是这些类型让 mitt 提供了完美的类型安全。核心思路是：用一个泛型参数 Events 来描述整个事件系统的"事件名→事件数据类型"映射。例如 type Events = { click: MouseEvent, keydown: KeyboardEvent } 定义了两个事件及其数据类型。EventHandlerMap 使用 Map 存储，支持 string 和 symbol 两种事件名类型。注意 Emitter 接口使用了函数重载，分别处理普通事件和通配符 \'*\' 事件。',
      filePath: '/src/index.ts',
      highlightLines: [1, 26],
      keyInsight: 'TypeScript 泛型不是为了炫技，而是让编译器帮你保证：on 注册的处理器参数类型，一定和 emit 时传入的参数类型一致。'
    },
    {
      id: 3,
      title: '存储结构：为什么用 Map 而不是 Object？',
      description: 'EventHandlerMap 的定义使用了 Map<...> 而非 Record<...> 或 { [key: string]: ... }。为什么？第一，Map 的键可以是任意类型，包括 symbol——mitt 支持 symbol 作为事件名，而 Object 的 symbol 键虽然也能用但操作不如 Map 方便；第二，Map 在频繁增删键值对的场景下性能更优；第三，Map 有内置的 size 属性、clear() 方法、迭代器 API，使用起来更方便；第四，Map 没有原型链，不会有 __proto__ 之类的特殊键名冲突问题。mitt 返回对象上的 all 属性直接暴露了内部 Map，用户可以调用 all.clear() 清空所有事件、all.get() 查看处理器、all.set() 直接操作——这是灵活性的体现。',
      filePath: '/src/index.ts',
      highlightLines: [12, 15],
      keyInsight: '选择数据结构时，不仅要看功能是否满足，还要考虑性能、API 便捷性、边界情况。Map 在事件存储这个场景下全面优于 Object。'
    },
    {
      id: 4,
      title: 'Emitter 接口：类型安全的 API 契约',
      description: 'Emitter 接口定义了 mitt 的公共 API 契约。all 属性暴露内部 Map 供高级操作；on/off/emit 三个核心方法。注意 on 和 off 都有两个重载：第一个重载处理普通事件（type 是具体事件名，handler 接收对应类型的事件数据），第二个重载处理通配符 \'*\'（handler 接收 type 和 event 两个参数）。emit 同样有两个重载：第二个重载处理可选事件——如果某个事件的数据类型是 undefined，调用 emit 时可以省略第二个参数。这套类型设计非常精妙，使用者写代码时 IDE 会自动提示可用的事件名、自动推导 handler 参数类型、传错类型会直接报错。',
      filePath: '/src/index.ts',
      highlightLines: [17, 26],
      keyInsight: '好的类型设计让正确的用法简单，让错误的用法无法通过编译。这就是类型安全的价值。'
    },
    {
      id: 5,
      title: 'on 方法：订阅事件的核心逻辑',
      description: 'on 方法的逻辑非常简单：all.get(type) 取出该事件现有的处理器数组。如果有（已经有人订阅过这个事件），就 push 新的 handler 进去；如果没有（第一个订阅者），就创建一个新数组 [handler] 存入 Map。这就是发布订阅模式中"订阅"的本质：维护一个"事件名→处理器列表"的映射。注意这里用了非空断言 all!——因为前面第33行已经保证了 all 一定有值（要么是用户传入的，要么是 new Map() 创建的），TypeScript 在闭包中无法追踪到这个赋值，所以需要手动告诉编译器"这里不会是 undefined"。内部使用了更宽泛的 GenericEventHandler 类型来简化实现，类型断言保证对外类型安全。',
      filePath: '/src/index.ts',
      highlightLines: [38, 45],
      keyInsight: '复杂的模式底层往往是最简单的数据结构——事件订阅本质上就是往 Map 的数组里塞函数。'
    },
    {
      id: 6,
      title: 'off 方法：取消订阅与 >>> 0 位运算技巧',
      description: 'off 方法有两个分支：如果传了 handler 参数，就只移除这一个处理器；如果没传 handler，就清空该事件的所有处理器（设置为空数组）。单个移除的代码是：handlers.splice(handlers.indexOf(handler) >>> 0, 1)。这里的 >>> 0 是整个库最"黑科技"的地方。正常写法应该是：const idx = handlers.indexOf(handler); if (idx !== -1) handlers.splice(idx, 1)。但 mitt 用了位运算技巧：indexOf 返回 -1 表示没找到，-1 的 32 位二进制全是 1，>>> 0 无符号右移 0 位会把它转成无符号整数 4294967295。Array.splice 传一个超出数组长度的索引，什么都不会做也不会报错——这样就省掉了 if 判断，节省了几个字节。这就是"微型库"的编程美学：在保证正确的前提下，用最精简的代码。',
      filePath: '/src/index.ts',
      highlightLines: [47, 57],
      keyInsight: '理解位运算可以写出更精简的代码，但要注意可读性——这种技巧在微型库或性能热点处值得使用，业务代码中建议写清楚判断逻辑。'
    },
    {
      id: 7,
      title: 'emit 方法：事件触发的防御性设计',
      description: 'emit 方法分两步：先调用普通事件的处理器，再调用通配符 \'*\' 的处理器。这里有一个极其重要的细节：.slice().map(...)——先用 slice() 创建数组的浅拷贝，再遍历拷贝执行处理器。为什么要拷贝？假设不拷贝，直接遍历 handlers 数组：某个 handler 在执行时调用了 off() 移除了自己或后面的处理器，或者调用 on() 添加了新处理器，都会导致正在遍历的数组被修改，引发跳过元素、重复执行、数组越界等各种 bug——这是事件系统中经典的"遍历中修改集合"问题。slice() 创建副本后，遍历的是快照，无论 handler 里怎么 on/off 都不会影响当前正在执行的遍历。通配符处理器在普通处理器之后调用，确保它们监听到的是真正发生了的事件。整个 emit 逻辑清晰、防御性强，在 10 几行代码内处理了各种边界情况。',
      filePath: '/src/index.ts',
      highlightLines: [59, 77],
      keyInsight: '防御性编程不是过度设计——slice() 拷贝数组看似"多余"，但能避免难以复现的遍历期间修改导致的 bug。优秀的库会替用户处理这些边界情况。'
    }
  ]
};
