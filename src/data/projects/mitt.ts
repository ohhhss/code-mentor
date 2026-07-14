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

const testIndexTestTs = `import mitt, { Emitter, EventHandlerMap } from '..';
import chai, { expect } from 'chai';
import { spy } from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

describe('mitt', () => {
	it('should default export be a function', () => {
		expect(mitt).to.be.a('function');
	});

	it('should accept an optional event handler map', () => {
		expect(() => mitt(new Map())).not.to.throw;
		const map = new Map();
		const a = spy();
		const b = spy();
		map.set('foo', [a, b]);
		const events = mitt<{ foo: undefined }>(map);
		events.emit('foo');
		expect(a).to.have.been.calledOnce;
		expect(b).to.have.been.calledOnce;
	});
});

describe('mitt#', () => {
	const eventType = Symbol('eventType');
	type Events = {
		foo: unknown;
		constructor: unknown;
		FOO: unknown;
		bar: unknown;
		Bar: unknown;
		'baz:bat!': unknown;
		'baz:baT!': unknown;
		Foo: unknown;
		[eventType]: unknown;
	};
	let events: EventHandlerMap<Events>, inst: Emitter<Events>;

	beforeEach(() => {
		events = new Map();
		inst = mitt(events);
	});

	describe('properties', () => {
		it('should expose the event handler map', () => {
			expect(inst).to.have.property('all').that.is.a('map');
		});
	});

	describe('on()', () => {
		it('should be a function', () => {
			expect(inst).to.have.property('on').that.is.a('function');
		});

		it('should register handler for new type', () => {
			const foo = () => {};
			inst.on('foo', foo);

			expect(events.get('foo')).to.deep.equal([foo]);
		});

		it('should register handlers for any type strings', () => {
			const foo = () => {};
			inst.on('constructor', foo);

			expect(events.get('constructor')).to.deep.equal([foo]);
		});

		it('should append handler for existing type', () => {
			const foo = () => {};
			const bar = () => {};
			inst.on('foo', foo);
			inst.on('foo', bar);

			expect(events.get('foo')).to.deep.equal([foo, bar]);
		});

		it('should NOT normalize case', () => {
			const foo = () => {};
			inst.on('FOO', foo);
			inst.on('Bar', foo);
			inst.on('baz:baT!', foo);

			expect(events.get('FOO')).to.deep.equal([foo]);
			expect(events.has('foo')).to.equal(false);
			expect(events.get('Bar')).to.deep.equal([foo]);
			expect(events.has('bar')).to.equal(false);
			expect(events.get('baz:baT!')).to.deep.equal([foo]);
		});

		it('can take symbols for event types', () => {
			const foo = () => {};
			inst.on(eventType, foo);
			expect(events.get(eventType)).to.deep.equal([foo]);
		});

		// Adding the same listener multiple times should register it multiple times.
		// See https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
		it('should add duplicate listeners', () => {
			const foo = () => {};
			inst.on('foo', foo);
			inst.on('foo', foo);
			expect(events.get('foo')).to.deep.equal([foo, foo]);
		});
	});

	describe('off()', () => {
		it('should be a function', () => {
			expect(inst).to.have.property('off').that.is.a('function');
		});

		it('should remove handler for type', () => {
			const foo = () => {};
			inst.on('foo', foo);
			inst.off('foo', foo);

			expect(events.get('foo')).to.be.empty;
		});

		it('should NOT normalize case', () => {
			const foo = () => {};
			inst.on('FOO', foo);
			inst.on('Bar', foo);
			inst.on('baz:bat!', foo);

			inst.off('FOO', foo);
			inst.off('Bar', foo);
			inst.off('baz:baT!', foo);

			expect(events.get('FOO')).to.be.empty;
			expect(events.has('foo')).to.equal(false);
			expect(events.get('Bar')).to.be.empty;
			expect(events.has('bar')).to.equal(false);
			expect(events.get('baz:bat!')).to.have.lengthOf(1);
		});

		it('should remove only the first matching listener', () => {
			const foo = () => {};
			inst.on('foo', foo);
			inst.on('foo', foo);
			inst.off('foo', foo);
			expect(events.get('foo')).to.deep.equal([foo]);
			inst.off('foo', foo);
			expect(events.get('foo')).to.deep.equal([]);
		});

		it('off("type") should remove all handlers of the given type', () => {
			inst.on('foo', () => {});
			inst.on('foo', () => {});
			inst.on('bar', () => {});
			inst.off('foo');
			expect(events.get('foo')).to.deep.equal([]);
			expect(events.get('bar')).to.have.length(1);
			inst.off('bar');
			expect(events.get('bar')).to.deep.equal([]);
		});
	});

	describe('emit()', () => {
		it('should be a function', () => {
			expect(inst).to.have.property('emit').that.is.a('function');
		});

		it('should invoke handler for type', () => {
			const event = { a: 'b' };

			inst.on('foo', (one, two?: unknown) => {
				expect(one).to.deep.equal(event);
				expect(two).to.be.an('undefined');
			});

			inst.emit('foo', event);
		});

		it('should NOT ignore case', () => {
			const onFoo = spy(),
				onFOO = spy();
			events.set('Foo', [onFoo]);
			events.set('FOO', [onFOO]);

			inst.emit('Foo', 'Foo arg');
			inst.emit('FOO', 'FOO arg');

			expect(onFoo).to.have.been.calledOnce.and.calledWith('Foo arg');
			expect(onFOO).to.have.been.calledOnce.and.calledWith('FOO arg');
		});

		it('should invoke * handlers', () => {
			const star = spy(),
				ea = { a: 'a' },
				eb = { b: 'b' };

			events.set('*', [star]);

			inst.emit('foo', ea);
			expect(star).to.have.been.calledOnce.and.calledWith('foo', ea);
			star.resetHistory();

			inst.emit('bar', eb);
			expect(star).to.have.been.calledOnce.and.calledWith('bar', eb);
		});
	});
});
`;

const testTypesCompilationTs = `/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */

import mitt from '..';

interface SomeEventData {
	name: string;
}

const emitter = mitt<{
	foo: string;
	someEvent: SomeEventData;
	bar?: number;
}>();

const barHandler = (x?: number) => {};
const fooHandler = (x: string) => {};
const wildcardHandler = (
	_type: 'foo' | 'bar' | 'someEvent',
	_event: string | SomeEventData | number | undefined
) => {};

/*
 * Check that 'on' args are inferred correctly
 */
{
	// @ts-expect-error
	emitter.on('foo', barHandler);
	emitter.on('foo', fooHandler);

	emitter.on('bar', barHandler);
	// @ts-expect-error
	emitter.on('bar', fooHandler);

	emitter.on('*', wildcardHandler);
	// fooHandler is ok, because ('foo' | 'bar' | 'someEvent') extends string
	emitter.on('*', fooHandler);
	// @ts-expect-error
	emitter.on('*', barHandler);
}

/*
 * Check that 'off' args are inferred correctly
 */
{
	// @ts-expect-error
	emitter.off('foo', barHandler);
	emitter.off('foo', fooHandler);

	emitter.off('bar', barHandler);
	// @ts-expect-error
	emitter.off('bar', fooHandler);

	emitter.off('*', wildcardHandler);
	// fooHandler is ok, because ('foo' | 'bar' | 'someEvent') extends string
	emitter.off('*', fooHandler);
	// @ts-expect-error
	emitter.off('*', barHandler);
}

/*
 * Check that 'emit' args are inferred correctly
 */
{
	// @ts-expect-error
	emitter.emit('someEvent', 'NOT VALID');
	emitter.emit('someEvent', { name: 'jack' });

	// @ts-expect-error
	emitter.emit('foo');
	// @ts-expect-error
	emitter.emit('foo', 1);
	emitter.emit('foo', 'string');

	emitter.emit('bar');
	emitter.emit('bar', 1);
	// @ts-expect-error
	emitter.emit('bar', 'string');
}
`;

const eslintrc = `{
  "ignorePatterns": [
    "node_modules",
    "dist",
    "index.d.ts"
  ],
  "extends": [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "developit"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "sourceType": "module"
  },
  "env": {
    "browser": true,
    "mocha": true,
    "jest": false,
    "es6": true
  },
  "globals": {
    "expect": true
  },
  "rules": {
    "semi": [
      2,
      "always"
    ],
    "brace-style": [
      2,
      "1tbs"
    ],
    "quotes": [
      2,
      "single"
    ],
    "lines-around-comment": [
      2,
      {
        "allowBlockStart": true,
        "allowObjectStart": true
      }
    ],
    "jest/valid-expect": 0,
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/explicit-function-return-type": 0,
    "@typescript-eslint/explicit-module-boundary-types": 0,
    "@typescript-eslint/no-empty-function": 0,
    "@typescript-eslint/no-non-null-assertion": 0
  }
}
`;

const editorconfig = `root = true

[*]
indent_style = tab
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[{package.json,.*rc,*.yml}]
indent_style = space
indent_size = 2
insert_final_newline = false

[*.md]
trim_trailing_whitespace = false
indent_style = space
indent_size = 2
`;

const fileTree: FileNode = {
  name: 'mitt',
  path: '/',
  type: 'directory',
  children: [
    { name: 'src', path: '/src', type: 'directory', children: [
      { name: 'index.ts', path: '/src/index.ts', type: 'file', language: 'typescript', isEntry: true }
    ]},
    { name: 'test', path: '/test', type: 'directory', children: [
      { name: 'index_test.ts', path: '/test/index_test.ts', type: 'file', language: 'typescript' },
      { name: 'test-types-compilation.ts', path: '/test/test-types-compilation.ts', type: 'file', language: 'typescript' }
    ]},
    { name: 'package.json', path: '/package.json', type: 'file', language: 'json' },
    { name: 'tsconfig.json', path: '/tsconfig.json', type: 'file', language: 'json' },
    { name: 'README.md', path: '/README.md', type: 'file', language: 'markdown' },
    { name: '.eslintrc', path: '/.eslintrc', type: 'file', language: 'json' },
    { name: '.editorconfig', path: '/.editorconfig', type: 'file', language: 'ini' }
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
        overview: '这是 mitt 的唯一核心源码文件，整个库的所有逻辑都在这 70 行 TypeScript 代码中实现。你可以把 mitt 想象成一个"广播站"——on() 是听众调到某个频道订阅节目，emit() 是广播站向某个频道播报内容，off() 是听众关掉订阅。所有订阅关系都记在一本"电话簿"里（就是 Map 数据结构），广播站随时可以翻阅电话簿找到某个频道的所有听众。文件首先定义了一套完整的 TypeScript 类型系统来描述事件处理器和发射器接口，然后实现了 mitt 工厂函数。代码遵循函数式编程理念，没有类、没有 this、没有原型链，仅用闭包和普通对象实现了一个类型安全的发布订阅系统。',
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
            content: 'EventType 将事件类型约束为 string 或 symbol，也就是"广播站频道"的命名方式。支持 Symbol 类型是一个重要设计——使用 Symbol 可以创建唯一的事件名，避免不同模块之间事件名冲突（两个模块都叫 "click" 会撞频道，但 Symbol("click") 各自独一无二不会撞）。这也是 mitt 选择 [[map-data-structure]] 而非 Object 存储"电话簿"的原因之一：Object 的键只能是 string/symbol，而 Map 支持任意类型的键，扩展性更强。',
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
            content: 'WildcardHandler 是通配符事件的处理器签名，它接收两个参数：第一个是事件类型 type，第二个是事件数据 event。当使用 \'*\' 监听所有事件时，处理器需要知道当前触发的是什么事件，因此多了一个 type 参数。这就像广播站的"全网监听"——无论哪个频道播报，监听器都能收到，并且知道是哪个频道在播。这里 T 的约束是 Record<string, unknown>，表示事件映射对象类型，keyof T 就是所有可能的事件类型联合。通配符是调试、日志埋点、全局监控等场景的实用特性，体现了 [[wildcard-event]] 的设计。',
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
            content: 'EventHandlerMap 是整个事件系统的核心存储类型：使用 [[map-data-structure]] 将事件名（keyof Events 或 \'*\'）映射到对应的处理器数组。你可以把它想象成广播站的"电话簿"——每个频道名对应一排听众的电话号码，广播站要播报时翻到对应频道那页，挨个打电话通知。Map 的值类型是联合类型——要么是 EventHandlerList（普通事件处理器数组），要么是 WildCardEventHandlerList（通配符处理器数组）。这意味着同一个事件名只能对应一种处理器类型，\'*\' 只能对应通配符处理器数组，类型上保证了逻辑正确性。',
            knowledgePoints: ['map-data-structure', 'generics']
          },
          {
            lineNumbers: [17, 26],
            title: 'Emitter 接口定义',
            content: 'Emitter 接口定义了事件发射器的完整公共 API，也就是"广播站"对外的操作手册：订阅（on）、退订（off）、播报（emit）。这里使用了 TypeScript [[generics]] 的函数重载特性：on/off 方法分别为普通事件和通配符事件提供了不同的类型签名。当你调用 on(\'click\', handler) 时，TypeScript 会匹配第一个重载，handler 的参数类型被推导为 Events[\'click\']；当你调用 on(\'*\', handler) 时，匹配第二个重载，handler 必须是 WildcardHandler 类型。emit 同样有两个重载：第二个重载处理可选事件的情况——当 Events[Key] 是 undefined 时，调用 emit 不需要传第二个参数。这套类型设计让 mitt 在保持 API 简洁的同时实现了完美的类型安全，[[type-inference]] 让使用者几乎不需要写显式类型标注。',
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
            content: 'all = all || new Map() 这行代码体现了 [[zero-config]] 设计哲学：最简单的场景下用户只需要调用 mitt() 不需要任何参数，此时会自动创建一个新的 Map 实例（广播站自带一本空白电话簿）；但同时也支持高级用法——用户可以传入自己的 Map 实例（自带一本预先登记好联系人的电话簿）。传入外部 Map 的场景包括：测试时预置事件处理器、跨多个 emitter 共享处理器、使用 Map 子类添加额外功能等。这行代码用最短的方式同时支持了"零配置开箱即用"和"可自定义扩展"两种需求。all 变量通过 [[closure]] 被返回的对象方法捕获，成为"私有"状态——电话簿被锁在广播站内部，只能通过 on/off/emit 方法间接操作。',
            knowledgePoints: ['zero-config', 'closure', 'map-data-structure']
          },
          {
            lineNumbers: [38, 45],
            title: 'on 方法：事件订阅实现',
            content: 'on 方法实现了 [[pubsub-pattern]] 中的"订阅"操作，就像"报纸订阅"——你告诉报亭"我要订这份报纸"，报亭就把你加到订阅名单上。逻辑非常直接：先从 Map（"电话簿"）中获取该事件类型已有的处理器数组。如果数组存在，就将新 handler push 进去（同一份报纸可以有多个订户）；如果不存在，就创建一个只包含当前 handler 的新数组存入 Map（第一个订户，新建订阅名单）。这里有一个类型断言 as EventHandlerList<Events[keyof Events]>——因为内部 GenericEventHandler 是联合类型，TypeScript 无法确定存入的是普通处理器数组还是通配符数组，但从逻辑上我们知道 key 不是 \'*\' 时存入的是普通处理器数组。非空断言 all!. 告诉 TypeScript：all 在这里一定有值（因为前面已经初始化过了）。',
            knowledgePoints: ['pubsub-pattern', 'closure', 'functional-programming']
          },
          {
            lineNumbers: [47, 57],
            title: 'off 方法：取消订阅与位运算技巧',
            content: 'off 方法实现了"取消订阅"，就像"报纸退订"——你告诉报亭"我不订了"，报亭就把你从订阅名单上划掉。这里有一个非常精妙的 JavaScript 技巧：handlers.indexOf(handler) >>> 0。indexOf 找不到元素时返回 -1，如果直接 splice(-1, 1) 会删除数组最后一个元素——这是个严重 bug（误删了最后一个订户）。通常的写法是 if (index !== -1) handlers.splice(index, 1)，但 mitt 用了更精简的位运算：-1 >>> 0 === 4294967295（32位无符号整数的最大值），splice 一个远超数组长度的索引不会做任何事，也不会报错（订户不在名单上，什么都不会发生）。这样就省去了 if 判断，省了几个字节。如果没传 handler 参数，off 会清空该事件类型的所有处理器（设置为空数组）——相当于一次性把整个频道的所有订户都清空。非空断言同样用于 all!.get。这就是"微型库"的编程哲学——在保证正确性的前提下，用最精简的代码。',
            knowledgePoints: ['pubsub-pattern', 'closure']
          },
          {
            lineNumbers: [59, 77],
            title: 'emit 方法：事件触发与防御性拷贝',
            content: 'emit 方法实现了"发布"操作，就像"广播站开始播报"——翻到电话簿对应频道那页，挨个通知所有订户。分为两部分：首先触发对应事件类型的普通处理器，然后触发通配符 \'*\' 处理器。这里有一个关键设计：(handlers as ...).slice().map(...)——先调用 .slice() 创建数组的浅拷贝（先复印一份订户名单），再遍历拷贝调用处理器。为什么？因为在处理器函数内部，完全有可能调用 on 注册新处理器或调用 off 注销处理器（播报过程中有人新订阅或退订）。如果直接遍历原数组，遍历过程中数组被修改会导致跳过元素或重复遍历等异常行为——这是事件系统中经典的"遍历中修改"问题（漏通知或重复通知订户）。slice() 防御性拷贝完美解决了这个问题——按名单复印件通知，原名单怎么改都不影响。注意普通处理器调用时只传 evt，通配符处理器调用时传 type 和 evt 两个参数，与类型定义一致。通配符处理器在普通处理器之后执行，确保它们能监听到所有事件的最终触发（全网监听器最后收到通知，确保不漏报）。evt! 非空断言是因为 TypeScript 无法确定 emit 一定传了 evt 参数，但在实际运行时处理器应该自己处理 undefined 的情况。',
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
    },
    '/test/index_test.ts': {
      content: testIndexTestTs,
      lesson: {
        filePath: '/test/index_test.ts',
        overview: '这是 mitt 的单元测试文件，就像一位"质量检查员"，负责验证 mitt 库的每个功能是否正常工作。你可以把 mitt 想象成一个"广播站"——on() 是听众调到某个频道订阅节目，emit() 是广播站向某个频道播报内容，off() 是听众关掉订阅。测试文件用 Mocha 测试框架（describe/it 语法）和 Chai 断言库（expect 语法）编写，覆盖了 mitt 所有核心功能：on 订阅、off 取消订阅、emit 触发事件、通配符 "*" 监听，以及各种边界情况如大小写敏感、Symbol 事件名、重复订阅等。每个 it 块就像一个"质检项目"，专门验证一个具体功能点。',
        keyConcepts: ['单元测试', 'Mocha 测试框架', 'Chai 断言库', 'Sinon Spy 间谍函数', '测试驱动开发'],
        coreIdeas: ['每个测试用例验证一个具体功能点，就像质检员逐项检查产品', '使用 spy 间谍函数伪装成事件处理器，记录被调用情况', 'beforeEach 钩子确保每个测试用例独立运行互不干扰', '测试覆盖了正常流程和边界情况（大小写、Symbol、重复订阅）'],
        lineExplanations: [
          {
            lineNumbers: [1, 5],
            title: '测试工具导入与初始化',
            content: '前 5 行导入测试所需的工具，就像广播站开播前要准备好设备。从 mitt 库导入 mitt 函数和类型（Emitter、EventHandlerMap）；从 chai 导入 expect 断言函数（用来检查"实际值"是否等于"期望值"）；从 sinon 导入 spy 间谍函数（用来伪装成事件处理器，记录被调用的情况）；从 sinon-chai 导入插件让 chai 能识别 spy。第 5 行 chai.use(sinonChai) 注册插件，相当于给质检员配发了新工具。',
            knowledgePoints: []
          },
          {
            lineNumbers: [7, 23],
            title: '基础功能测试：mitt 是函数且可接收 Map',
            content: '第一个 describe 块测试 mitt 的最基本特性。"should default export be a function" 验证 mitt 默认导出确实是一个函数（就像验证广播站确实能开机）。第二个测试 "should accept an optional event handler map" 更有意思：它先创建一个 Map（相当于提前在"电话簿"里登记了两个订阅者 a 和 b），然后用这个 Map 创建 emitter 并触发 foo 事件，最后验证 a 和 b 各被调用了一次。这证明了 mitt 支持外部传入 Map 来预设事件处理器——就像你可以预先在电话簿里登记好联系人，广播站一开播就能联系到他们。',
            knowledgePoints: ['pubsub-pattern', 'map-data-structure']
          },
          {
            lineNumbers: [25, 43],
            title: '测试环境准备：Symbol 事件类型与 beforeEach',
            content: '第二个 describe 块测试 mitt 实例的方法。第 26 行用 Symbol("eventType") 创建了一个唯一的事件类型——Symbol 就像广播站里的一个加密频道，每个 Symbol 都是独一无二的，绝不会和其他事件名冲突。第 27-37 行定义了 Events 类型，故意包含了大小写不同的名字（foo/FOO/Foo、bar/Bar）和带特殊字符的名字（baz:bat!），用来测试 mitt 是否会"自作聪明"地标准化大小写。第 40-43 行的 beforeEach 是一个"重置按钮"：每个测试用例运行前都会重新创建一个新的 Map 和 emitter，确保测试之间互不干扰——这就像质检员每检查完一件产品都要把工作台清理干净。',
            knowledgePoints: ['wildcard-event', 'map-data-structure']
          },
          {
            lineNumbers: [45, 49],
            title: '属性测试：all 属性是 Map',
            content: '这个测试验证 mitt 实例的 all 属性确实是一个 Map。all 就是 mitt 的"电话簿"——存储所有事件名到处理器数组的映射。把它暴露出来让用户可以直接操作（比如 all.clear() 清空所有订阅），这是 mitt 灵活性的体现。就像电话簿你可以随时翻阅、添加、删除联系人。',
            knowledgePoints: ['map-data-structure']
          },
          {
            lineNumbers: [51, 106],
            title: 'on() 方法测试：订阅功能的全面验证',
            content: '这一组测试验证 on() 方法的各种行为，就像"报纸订阅"的各种场景。"should register handler for new type" 测试第一次订阅某事件时处理器被正确存入 Map（新订户第一次订阅报纸）。"should register handlers for any type strings" 故意用 "constructor" 作为事件名——这是 Object 的原型属性名，测试 mitt 不会因为用了 Map 而产生原型链冲突。"should append handler for existing type" 验证同一事件可以有多个订阅者（一份报纸可以有多个订户）。"should NOT normalize case" 确认 mitt 不会自动转换大小写（FOO 和 foo 是不同的频道）。"can take symbols for event types" 验证 Symbol 也能作为事件名。"should add duplicate listeners" 测试同一个处理器被注册多次时会被存多次（和 Node.js EventEmitter 行为一致）。',
            knowledgePoints: ['pubsub-pattern', 'wildcard-event']
          },
          {
            lineNumbers: [108, 158],
            title: 'off() 方法测试：取消订阅的边界情况',
            content: '这一组测试验证 off() 方法，就像"报纸退订"的各种场景。"should remove handler for type" 测试基本的取消订阅功能。"should NOT normalize case" 再次确认大小写敏感——baz:bat! 和 baz:baT! 是不同的事件，所以取消 baz:baT! 不会影响 baz:bat!。"should remove only the first matching listener" 验证如果同一个处理器被注册多次，off 只移除第一个匹配的（就像取消报纸订阅时只取消一份，不会把所有订阅都取消）。"off(\"type\") should remove all handlers" 测试不传 handler 参数时，off 会清空该事件的全部处理器——但只清这一个事件，不影响其他事件。',
            knowledgePoints: ['pubsub-pattern']
          },
          {
            lineNumbers: [160, 203],
            title: 'emit() 方法测试：事件触发的验证',
            content: '最后一组测试验证 emit() 方法，就像"广播站开播"的验证。"should invoke handler for type" 测试触发事件时处理器能收到正确的数据，还验证了处理器只收到一个参数（第二个参数是 undefined）。"should NOT ignore case" 再次验证 Foo 和 FOO 是独立的事件，各自触发各自的处理器。"should invoke * handlers" 是最有趣的测试：它验证通配符 "*" 处理器在每次任何事件触发时都会被调用，并且能收到事件类型和事件数据两个参数。这就像广播站的"全网监听"功能——无论哪个频道播报，监听器都能收到。star.resetHistory() 在两次触发之间重置 spy 的调用记录，确保第二次断言准确。',
            knowledgePoints: ['pubsub-pattern', 'wildcard-event']
          }
        ]
      }
    },
    '/test/test-types-compilation.ts': {
      content: testTypesCompilationTs,
      lesson: {
        filePath: '/test/test-types-compilation.ts',
        overview: '这是一个 TypeScript "类型测试" 文件，就像一道"类型安检门"——它不运行任何实际代码，而是利用 TypeScript 编译器来验证 mitt 的类型系统是否正确工作。文件中使用了 @ts-expect-error 注释：这行注释告诉 TypeScript "下一行代码应该报类型错误"，如果下一行真的报错了，测试通过；如果没报错，测试失败。这种"反向测试"巧妙地验证了类型系统能正确地拒绝错误的用法，就像安检门应该拦住携带违禁品的人——如果违禁品通过了安检门，说明安检门坏了。',
        keyConcepts: ['TypeScript 类型测试', '@ts-expect-error 指令', '类型推断', '编译时类型检查'],
        coreIdeas: ['通过 @ts-expect-error 验证类型错误被正确捕获，就像安检门拦住违禁品', '测试 on/off/emit 三个方法的类型推断', '验证可选事件类型（bar?）的特殊处理——可省略数据', '不产生运行时副作用，纯编译时检查'],
        lineExplanations: [
          {
            lineNumbers: [1, 1],
            title: '关闭 ESLint 规则',
            content: '第一行用 eslint-disable 注释临时关闭了两个 ESLint 规则：ban-ts-comment（禁止使用 @ts 注释）和 no-unused-vars（禁止未使用变量）。因为这个文件会大量使用 @ts-expect-error 注释，并且定义的变量看起来"没用"（实际上是被 TypeScript 编译器"使用"的），所以需要临时关闭这些规则。这就像质检员进入特殊检测区域时需要暂时关闭一些常规警报——因为他们要故意制造"错误"来检验安检门是否工作。',
            knowledgePoints: []
          },
          {
            lineNumbers: [3, 13],
            title: '创建带类型的 emitter 实例',
            content: '这里创建了一个具体的 emitter 实例，并明确指定了事件类型映射：foo 事件的数据是 string 类型，someEvent 事件的数据是 SomeEventData（一个有 name 字段的对象），bar 事件的数据是可选的 number 类型（bar? 表示这个事件可能没有数据）。这相当于给广播站登记了一份"频道节目单"——每个频道对应一种内容格式。TypeScript 会根据这份节目单，在编译时检查所有 on/off/emit 调用是否传了正确类型的数据，就像节目主持人必须按节目单的格式播报。',
            knowledgePoints: ['generics', 'type-inference']
          },
          {
            lineNumbers: [15, 20],
            title: '定义测试用的处理器函数',
            content: '这里定义了三个处理器函数，每个都有不同的参数类型签名。barHandler 接收可选的 number，fooHandler 接收 string，wildcardHandler 接收事件类型联合和数据联合。这些处理器会被用来测试 mitt 的类型推断：TypeScript 应该能根据事件名自动推导出处理器应该接收什么类型的参数。就像广播站给每个频道的主持人配了不同的话筒——新闻频道的主持人拿新闻稿话筒，音乐频道的拿乐谱话筒，配错了就报警。',
            knowledgePoints: ['type-inference', 'generics']
          },
          {
            lineNumbers: [22, 39],
            title: 'on() 方法的类型推断测试',
            content: '这个代码块测试 on() 方法的类型安全。// @ts-expect-error 标记的行是"应该报错"的：例如 emitter.on(\'foo\', barHandler) 会报错，因为 foo 事件需要 string 类型的处理器，而 barHandler 期望的是 number——就像给新闻频道主持人配了乐谱话筒，类型不匹配。没有标记的行是"应该通过"的：例如 emitter.on(\'foo\', fooHandler) 类型匹配。特别有趣的是 emitter.on(\'*\', fooHandler) 能通过——因为通配符处理器的第一个参数是事件类型联合，而 string 类型可以被赋值给联合类型。这就是"类型安检门"的工作方式：正确的搭配放行，错误的搭配拦截。',
            knowledgePoints: ['generics', 'type-inference']
          },
          {
            lineNumbers: [41, 58],
            title: 'off() 方法的类型推断测试',
            content: '这个代码块测试 off() 方法，逻辑和 on() 测试完全对称。off 的类型签名和 on 一致，所以同样的类型匹配规则也适用。这里再次验证了：传错类型的处理器会被 TypeScript 拦截（@ts-expect-error 行），传对类型的能通过。重复测试 off 是因为 off 是独立的公共方法，类型契约需要单独保证——就像每个安检门都要单独检验，不能因为入口检查了就跳过出口检查。',
            knowledgePoints: ['generics', 'type-inference']
          },
          {
            lineNumbers: [60, 78],
            title: 'emit() 方法的类型推断测试',
            content: '最后一个代码块测试 emit() 方法，这里有几个关键点。emitter.emit(\'someEvent\', \'NOT VALID\') 会报错——因为 someEvent 需要 SomeEventData 对象，不能传字符串。emitter.emit(\'foo\') 会报错——因为 foo 事件必须有 string 数据，不能省略。但 emitter.emit(\'bar\') 不会报错——因为 bar 是可选的（bar?），可以不传数据，就像可选频道可以"空播"。emitter.emit(\'bar\', 1) 也合法——传了 number 数据。emitter.emit(\'bar\', \'string\') 报错——bar 需要 number 不能是 string。这精准地验证了 mitt 对可选事件类型的特殊处理：当事件数据是 undefined 时，emit 可以省略第二个参数。',
            knowledgePoints: ['generics', 'type-inference', 'pubsub-pattern']
          }
        ]
      }
    },
    '/.eslintrc': {
      content: eslintrc,
      lesson: {
        filePath: '/.eslintrc',
        overview: '这是 ESLint 的配置文件，ESLint 就像一位"语法警察"，负责检查代码风格是否统一、是否有潜在问题。这个文件配置了 mitt 项目的代码规范：使用 TypeScript 专用规则集、强制单引号、强制分号、特定的大括号风格等。当开发者写了不符合规范的代码时，ESLint 会发出警告或错误，帮助团队保持代码风格一致。语法警察不能让你的代码跑得更快，但能让团队协作更顺畅——所有人写同样的风格，代码 review 时就不用争论空格还是 Tab。',
        keyConcepts: ['ESLint 代码规范', '静态代码分析', 'TypeScript ESLint 插件', '代码风格统一'],
        coreIdeas: ['继承 TypeScript 推荐规则集和 developit 风格', '配置了浏览器和 mocha 测试环境', '关闭了一些过于严格的 TypeScript 规则', '强制使用单引号、分号、1tbs 大括号风格'],
        lineExplanations: [
          {
            lineNumbers: [1, 6],
            title: '忽略模式：哪些文件不需要检查',
            content: 'ignorePatterns 列出了 ESLint 不需要检查的目录和文件。node_modules 是第三方依赖（不是我们写的代码），dist 是编译输出（自动生成），index.d.ts 是类型声明文件（自动生成）。这就像语法警察巡逻时会跳过一些区域——别人的地盘（node_modules）和自动生成的文件都不归他管。忽略这些文件可以大大加快检查速度，也避免对自动生成的代码报无意义的错误。',
            knowledgePoints: []
          },
          {
            lineNumbers: [7, 15],
            title: '继承规则集与解析器配置',
            content: 'extends 字段继承了两套规则集：plugin:@typescript-eslint/eslint-recommended 和 recommended 是 TypeScript 官方推荐的规则集，developit 是 mitt 作者 Jason Miller（github: developit）的个人风格规则集。这种"继承"机制就像新员工入职时继承公司的着装规范——不需要从零制定，直接套用现成的标准。parser 指定用 @typescript-eslint/parser 来解析 TypeScript 语法（ESLint 默认只懂 JavaScript，需要专门的解析器才能读懂 TypeScript），parserOptions.sourceType: module 表示代码使用 ESM 模块系统。',
            knowledgePoints: []
          },
          {
            lineNumbers: [16, 24],
            title: '运行环境与全局变量',
            content: 'env 字段告诉 ESLint 代码会运行在什么环境，这样它就知道哪些全局变量是合法的。browser: true 表示代码可能运行在浏览器（有 window、document 等），mocha: true 表示测试代码使用 Mocha（有 describe、it 等），es6: true 启用 ES6 全局变量（如 Promise）。jest: false 明确关闭 Jest 环境。globals.expect: true 声明 expect 是合法的全局变量（因为测试文件里直接用了 expect 而没导入）。这就像语法警察需要知道"这门语言里有哪些合法词汇"，避免把合法的全局变量误判为未定义变量——不然 describe、it 这些测试函数都会被标红报错。',
            knowledgePoints: []
          },
          {
            lineNumbers: [25, 51],
            title: '自定义规则：强制代码风格',
            content: 'rules 字段是项目自定义的规则。每条规则的格式是 [级别, 选项]，级别 2 表示错误（违反会报错），1 表示警告，0 表示关闭。这里强制了：semi: always（必须加分号）、brace-style: 1tbs（一种大括号风格，开括号不换行）、quotes: single（必须用单引号）、lines-around-comment（注释周围要空行）。同时关闭了一些过于严格的 TypeScript 规则：no-explicit-any 允许使用 any（微型库为了简洁偶尔需要）、explicit-function-return-type 不强制函数返回类型标注、no-empty-function 允许空函数（mitt 测试里常用 () => {}）、no-non-null-assertion 允许非空断言 all!（mitt 源码里大量使用）。这些规则的开关体现了"严格但不死板"的工程哲学——该严格的地方严格，该灵活的地方灵活。',
            knowledgePoints: []
          }
        ]
      }
    },
    '/.editorconfig': {
      content: editorconfig,
      lesson: {
        filePath: '/.editorconfig',
        overview: '这是 EditorConfig 文件，就像一份"统一着装规范"——无论团队成员用什么编辑器（VS Code、Sublime、Vim、WebStorm），只要装了 EditorConfig 插件，就会自动应用这套统一的格式设置。这个文件配置了缩进风格、换行符、字符编码等基础格式，确保所有人编辑同一份代码时不会因为编辑器设置不同而产生无意义的格式差异。没有 EditorConfig 的话，A 用 Tab 缩进、B 用空格缩进，每次提交 git 都会出现满屏的格式改动，掩盖了真正的代码逻辑修改。',
        keyConcepts: ['EditorConfig 编辑器配置', '跨编辑器格式统一', '缩进风格', '换行符规范'],
        coreIdeas: ['不同文件类型可以有不同的格式设置', '使用 tab 缩进（TypeScript 源码）和 space 缩进（JSON/YAML/Markdown）', '统一使用 LF 换行符避免跨平台问题', '统一 UTF-8 编码'],
        lineExplanations: [
          {
            lineNumbers: [1, 1],
            title: '根标记',
            content: 'root = true 告诉编辑器：这是最顶层的 EditorConfig 文件，不要再往上级目录查找更多的配置文件。这就像着装规范里写明"这是公司最高规定"，不需要再去参考部门或团队的额外规定。这样能加快配置加载速度，也避免意外继承父目录的配置。',
            knowledgePoints: []
          },
          {
            lineNumbers: [3, 8],
            title: '全局通用设置',
            content: '[*] 是通配符，表示下面的设置适用于所有文件。indent_style = tab 表示用 Tab 键缩进（mitt 源码用 Tab，看起来更紧凑）；end_of_line = lf 统一使用 Unix 风格换行符（LF），避免 Windows 的 CRLF 和 Mac 的 LF 混用导致 git diff 满屏红叉；charset = utf-8 统一使用 UTF-8 编码（支持中文等非 ASCII 字符）；trim_trailing_whitespace = true 自动删除每行末尾的多余空格（这些空格看不见但会污染 git 历史）；insert_final_newline = true 文件末尾自动加一个空行（Unix 传统，有些工具需要）。这就像着装规范的"通用条款"：所有人都要遵守的基本要求。',
            knowledgePoints: []
          },
          {
            lineNumbers: [10, 13],
            title: 'JSON/YAML/配置文件的专用设置',
            content: '[{package.json,.*rc,*.yml}] 匹配 package.json、所有 .rc 结尾的文件（如 .eslintrc、.babelrc）和所有 .yml 文件。这些文件用 space 空格缩进（indent_size = 2，即 2 个空格），因为 JSON 和 YAML 社区约定用空格缩进。insert_final_newline = false 表示这些文件末尾不加空行——因为很多 JSON 工具解析时对末尾空行敏感。这就像着装规范里"特殊场合例外"：正式场合穿正装，但运动时换运动服，不同文件类型有不同的格式需求。',
            knowledgePoints: []
          },
          {
            lineNumbers: [15, 18],
            title: 'Markdown 文件的专用设置',
            content: '[*.md] 匹配所有 Markdown 文件。trim_trailing_whitespace = false 不删除行尾空格——因为 Markdown 里两个行尾空格表示"换行但不分段"，删除会破坏格式。indent_style = space 和 indent_size = 2 用 2 个空格缩进。这又是一个"特殊场合例外"：Markdown 的语法特性决定了它需要保留行尾空格，就像着装规范里"特殊工种特殊对待"。',
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
      description: '在深入代码之前，我们先理解 mitt 是什么。mitt 是一个只有 200 字节（gzip 后）的函数式事件发射器，是 npm 上最流行的 EventEmitter 实现之一。你可以把 mitt 想象成一个微型"广播站"——它只有三个核心操作：on（订阅频道）、off（取消订阅）、emit（向频道播报内容），外加通配符 "*" 监听所有频道。所有订阅关系都记在一本"电话簿"（Map 数据结构）里。整个库只有一个源文件 src/index.ts，共 70 行代码，没有任何外部依赖。它的核心价值不是功能多，而是极致精简——只保留发布订阅模式最核心的三个 API。学习 mitt 是理解"微型库"设计哲学的绝佳案例：如何在最小的代码量内实现完整的类型安全和功能。',
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
      description: 'EventHandlerMap 的定义使用了 Map<...> 而非 Record<...> 或 { [key: string]: ... }。为什么？Map 就是 mitt 的"电话簿"，相比 Object 它有四大优势。第一，Map 的键可以是任意类型，包括 symbol——mitt 支持 symbol 作为事件名（加密频道），而 Object 的 symbol 键虽然也能用但操作不如 Map 方便；第二，Map 在频繁增删键值对的场景下性能更优（订户频繁订阅/退订时电话簿查询更快）；第三，Map 有内置的 size 属性、clear() 方法、迭代器 API，使用起来更方便；第四，Map 没有原型链，不会有 __proto__ 之类的特殊键名冲突问题（不会出现叫 "constructor" 的频道和 Object 原型撞名）。mitt 返回对象上的 all 属性直接暴露了内部 Map，用户可以调用 all.clear() 清空所有事件、all.get() 查看处理器、all.set() 直接操作——这是灵活性的体现，就像电话簿你可以随时翻阅、添加、删除联系人。',
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
      description: 'on 方法的逻辑非常简单，就像"报纸订阅"——你告诉报亭"我要订这份报纸"，报亭就把你加到订阅名单上。all.get(type) 从电话簿里取出该频道的处理器数组。如果有（已经有人订阅过这个事件），就 push 新的 handler 进去（同一份报纸可以有多个订户）；如果没有（第一个订阅者），就创建一个新数组 [handler] 存入 Map（新建订阅名单）。这就是发布订阅模式中"订阅"的本质：维护一个"事件名→处理器列表"的映射。注意这里用了非空断言 all!——因为前面第33行已经保证了 all 一定有值（要么是用户传入的，要么是 new Map() 创建的），TypeScript 在闭包中无法追踪到这个赋值，所以需要手动告诉编译器"这里不会是 undefined"。内部使用了更宽泛的 GenericEventHandler 类型来简化实现，类型断言保证对外类型安全。',
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
      description: 'emit 方法就像"广播站开始播报"——翻到电话簿对应频道那页，挨个通知所有订户。分两步：先调用普通事件的处理器，再调用通配符 \'*\' 的处理器。这里有一个极其重要的细节：.slice().map(...)——先用 slice() 创建数组的浅拷贝（先复印一份订户名单），再遍历拷贝执行处理器。为什么要拷贝？假设不拷贝，直接遍历 handlers 数组：某个 handler 在执行时调用了 off() 移除了自己或后面的处理器（播报过程中有人退订），或者调用 on() 添加了新处理器（播报过程中有人新订阅），都会导致正在遍历的数组被修改，引发跳过元素、重复执行、数组越界等各种 bug——这是事件系统中经典的"遍历中修改集合"问题（漏通知或重复通知订户）。slice() 创建副本后，遍历的是快照（按名单复印件通知），无论 handler 里怎么 on/off 都不会影响当前正在执行的遍历。通配符处理器在普通处理器之后调用，确保它们监听到的是真正发生了的事件（全网监听器最后收到通知，确保不漏报）。整个 emit 逻辑清晰、防御性强，在 10 几行代码内处理了各种边界情况。',
      filePath: '/src/index.ts',
      highlightLines: [59, 77],
      keyInsight: '防御性编程不是过度设计——slice() 拷贝数组看似"多余"，但能避免难以复现的遍历期间修改导致的 bug。优秀的库会替用户处理这些边界情况。'
    },
    {
      id: 8,
      title: '单元测试：mitt 的"质量检查员"',
      description: 'test/index_test.ts 是 mitt 的单元测试文件。单元测试就像质量检查员——每个 it 块是一个质检项目，专门验证某个功能点。文件用 Mocha 框架的 describe/it 语法组织测试，用 Chai 的 expect 断言，用 Sinon 的 spy 间谍函数记录函数调用。测试覆盖了 mitt 所有核心功能：on 订阅、off 取消、emit 触发、通配符监听，以及边界情况如大小写敏感、Symbol 事件名、重复订阅等。你可以把 mitt 想象成"广播站"，测试就是在验证广播站能正常开机、订阅、播报、退订。',
      filePath: '/test/index_test.ts',
      highlightLines: [1, 5],
      keyInsight: '单元测试不是"多余的代码"，而是项目的"安全网"——每次修改代码后跑一遍测试，就能立刻知道有没有改坏东西。'
    },
    {
      id: 9,
      title: 'on() 测试：订阅功能的全面验证',
      description: '这一组测试验证 on() 方法。包括：注册新处理器、注册到已存在的事件（追加而非覆盖）、大小写敏感（FOO 和 foo 是不同事件，就像广播站不同频道）、Symbol 作为事件名（加密频道）、重复注册同一处理器。特别值得注意的是 "constructor" 事件名测试——这是 Object 原型的属性名，mitt 因为用 Map 而非 Object 存储，所以没有原型链冲突问题。这正是 mitt 选择 Map 作为"电话簿"的好处之一。',
      filePath: '/test/index_test.ts',
      highlightLines: [51, 106],
      keyInsight: '好的测试不只测"正常用法"，还要测"边界情况"——大小写、特殊字符、Symbol、重复注册，这些容易出 bug 的地方都要覆盖。'
    },
    {
      id: 10,
      title: 'off() 测试：取消订阅的边界处理',
      description: 'off() 的测试有两个重点：一是"只移除第一个匹配的处理器"——如果同一函数被注册多次，off 只移除一个（就像取消报纸订阅只取消一份，不会把所有订阅都取消）；二是 off("type") 不传 handler 时清空该事件的全部处理器，但只清这一个事件不影响其他事件。还再次验证了大小写敏感——baz:bat! 和 baz:baT! 是不同事件，取消一个不影响另一个。',
      filePath: '/test/index_test.ts',
      highlightLines: [108, 158],
      keyInsight: 'off 的"只移除一个"行为和 Node.js EventEmitter 一致——这种"遵循约定"的设计让用户更容易上手。'
    },
    {
      id: 11,
      title: 'emit() 测试：事件触发与通配符',
      description: 'emit() 测试验证事件触发时处理器能收到正确数据，且大小写敏感。最有趣的是通配符 "*" 测试：注册一个 star 处理器监听所有事件，然后触发 foo 和 bar 两个不同事件，验证 star 都被调用且收到了正确的事件类型和数据。这就像广播站的"全网监听"——无论哪个频道播报，监听器都能收到。star.resetHistory() 在两次触发之间重置 spy 的调用记录，确保第二次断言准确。',
      filePath: '/test/index_test.ts',
      highlightLines: [160, 203],
      keyInsight: '通配符是 mitt 的特色功能，测试里专门验证它——好的测试要覆盖所有"特色功能"，因为这是最容易出 bug 的地方。'
    },
    {
      id: 12,
      title: '类型测试：mitt 的"类型安检门"',
      description: 'test/test-types-compilation.ts 是一个特殊的测试文件——它不运行任何代码，而是利用 TypeScript 编译器来验证类型系统。核心技巧是 @ts-expect-error 注释：它告诉编译器"下一行应该报错"，如果下一行真的报错了测试通过，没报错测试失败。这就像安检门应该拦住携带违禁品的人——如果违禁品通过了安检门，说明安检门坏了。文件测试了 on/off/emit 三个方法的类型推断，以及可选事件类型（bar?）的特殊处理。',
      filePath: '/test/test-types-compilation.ts',
      highlightLines: [1, 13],
      keyInsight: '类型测试不是为了运行代码，而是为了"证明编译器在工作"——确保类型系统能拦截错误的用法。'
    },
    {
      id: 13,
      title: 'on/off 类型推断：参数类型的精准匹配',
      description: '这两个代码块测试 on() 和 off() 的类型推断。例如 emitter.on(\'foo\', barHandler) 会报错——因为 foo 需要 string 处理器，barHandler 期望 number，就像给新闻频道主持人配了乐谱话筒，类型不匹配。而 emitter.on(\'foo\', fooHandler) 类型匹配能通过。特别有趣的是 emitter.on(\'*\', fooHandler) 能通过——因为通配符处理器的第一个参数是事件类型联合，string 可以赋值给联合类型。on 和 off 类型规则一致，所以测试也对称——每个安检门都要单独检验。',
      filePath: '/test/test-types-compilation.ts',
      highlightLines: [22, 58],
      keyInsight: '@ts-expect-error 是"反向断言"——它不是说"这行代码对"，而是说"这行代码应该被编译器拒绝"。这种测试能确保类型安全不会被意外破坏。'
    },
    {
      id: 14,
      title: 'emit 类型推断：可选事件的特殊处理',
      description: 'emit() 测试最精妙——它验证了 mitt 对可选事件类型的特殊处理。foo 事件必须有 string 数据，所以 emitter.emit(\'foo\') 报错（缺少数据）。但 bar 是可选的（bar?），所以 emitter.emit(\'bar\') 不报错（可以不传数据，就像可选频道可以"空播"）。emitter.emit(\'bar\', 1) 也合法（传了 number）。emitter.emit(\'bar\', \'string\') 报错（类型不对）。这精准验证了 mitt 类型系统对"可选事件"的支持。',
      filePath: '/test/test-types-compilation.ts',
      highlightLines: [60, 78],
      keyInsight: '可选事件类型（bar?）是 mitt 类型系统的精妙设计——emit 可以省略数据，但 on 必须处理 undefined。类型测试确保这套设计正确工作。'
    },
    {
      id: 15,
      title: 'ESLint 配置：mitt 的"语法警察"',
      description: '.eslintrc 是 ESLint 配置文件，ESLint 就像语法警察——检查代码风格是否统一、是否有潜在问题。文件配置了 mitt 项目的代码规范：继承 TypeScript 推荐规则集和 developit 个人风格、强制单引号和分号、配置浏览器和 mocha 测试环境。同时关闭了一些过于严格的规则（如禁止 any、强制返回类型），体现"严格但不死板"的工程哲学——该严格的地方严格，该灵活的地方灵活。',
      filePath: '/.eslintrc',
      highlightLines: [1, 15],
      keyInsight: '代码规范不是"限制自由"，而是"团队协作的基础"——所有人写同样的风格，代码 review 时就不用争论空格还是 Tab。'
    },
    {
      id: 16,
      title: 'ESLint 运行环境配置',
      description: 'env 字段告诉 ESLint 代码运行在什么环境——browser（浏览器有 window）、mocha（测试有 describe/it）、es6（有 Promise）。globals 声明 expect 是合法全局变量。这就像语法警察需要知道"这门语言有哪些合法词汇"，避免把合法的全局变量误判为未定义——不然 describe、it 这些测试函数都会被标红报错。',
      filePath: '/.eslintrc',
      highlightLines: [16, 24],
      keyInsight: '配置运行环境很重要——不配置的话，ESLint 会把 describe、it 这些测试函数误判为"未定义变量"。'
    },
    {
      id: 17,
      title: 'ESLint 自定义规则：强制风格与豁免',
      description: 'rules 字段定义了项目特定的规则。强制项：semi: always（必须分号）、quotes: single（单引号）、brace-style: 1tbs（大括号风格）。豁免项：允许 any、允许空函数、允许非空断言。这些豁免都是为了 mitt 这个微型库的简洁性——微型库需要用一些"不严格"的写法来节省字节，但又不能让代码质量失控。这就是"严格但不死板"的工程哲学。',
      filePath: '/.eslintrc',
      highlightLines: [25, 51],
      keyInsight: '好的规则配置是"该严格的严格，该灵活的灵活"——强制风格统一，但允许微型库必需的简洁写法。'
    },
    {
      id: 18,
      title: 'EditorConfig：mitt 的"统一着装规范"',
      description: '.editorconfig 是编辑器配置文件，就像统一着装规范——无论团队用什么编辑器，只要装了插件就自动应用这套格式。配置了 Tab 缩进（TypeScript 源码）、LF 换行符、UTF-8 编码等。这样所有人编辑代码时不会因为编辑器设置不同而产生无意义的格式 diff。没有 EditorConfig 的话，A 用 Tab、B 用空格，每次提交 git 都会出现满屏的格式改动，掩盖真正的代码逻辑修改。',
      filePath: '/.editorconfig',
      highlightLines: [1, 8],
      keyInsight: 'EditorConfig 解决了一个经典痛点——Tab vs Space 之争。配置好之后，编辑器自动帮你转换，团队再也不会因为格式争吵。'
    },
    {
      id: 19,
      title: 'EditorConfig 配置文件的专用设置',
      description: '[{package.json,.*rc,*.yml}] 为 JSON、YAML、.rc 文件配置了 2 空格缩进（社区约定），且末尾不加空行（JSON 工具对此敏感）。这就像着装规范的"特殊场合例外"——正式场合穿正装，运动时换运动服，不同文件类型有不同的格式需求。TypeScript 源码用 Tab，但配置文件用空格，这是因为不同社区有不同的约定。',
      filePath: '/.editorconfig',
      highlightLines: [10, 13],
      keyInsight: '不同文件类型有不同规范——JSON 社区习惯 2 空格，TypeScript 社区习惯 Tab。EditorConfig 能按文件类型分别配置。'
    },
    {
      id: 20,
      title: 'EditorConfig Markdown 文件的特殊处理',
      description: '[*.md] 为 Markdown 配置了不删除行尾空格——因为 Markdown 里两个行尾空格表示"换行但不分段"，删除会破坏格式。这是"特殊场合例外"的又一例：Markdown 的语法特性决定了它需要保留行尾空格，就像着装规范里"特殊工种特殊对待"。这也提醒我们：配置工具时要注意"语法例外"，不能一刀切。',
      filePath: '/.editorconfig',
      highlightLines: [15, 18],
      keyInsight: '配置工具时要注意"语法例外"——Markdown 的行尾空格有语法意义，不能一刀切删除。'
    }
  ]
};
