import type { LargeProjectData } from '@/types';

const websocketGatewayCode = `import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsAuthGuard } from '../auth/ws-auth.guard';
import { CollabService } from './collab.service';
import { TripUpdateDto, CursorMoveDto } from './dto/collab.dto';

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL },
  namespace: '/collab',
})
@UseGuards(WsAuthGuard)
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollabGateway.name);
  private userSockets = new Map<string, Set<string>>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly collabService: CollabService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    const tripId = client.handshake.query.tripId as string;

    client.join(tripId);
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    const users = await this.collabService.getActiveUsers(tripId);
    this.server.to(tripId).emit('collab:users', users);
    this.logger.log(\`User \${userId} connected to trip \${tripId}\`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.auth.userId;
    const tripId = client.handshake.query.tripId as string;

    client.leave(tripId);
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        await this.collabService.removeUser(tripId, userId);
        const users = await this.collabService.getActiveUsers(tripId);
        this.server.to(tripId).emit('collab:users', users);
      }
    }
  }

  @SubscribeMessage('trip:update')
  async handleTripUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: TripUpdateDto,
  ) {
    const userId = client.handshake.auth.userId;
    const updated = await this.collabService.applyUpdate(dto.tripId, userId, dto);

    client.broadcast.to(dto.tripId).emit('trip:updated', {
      ...updated,
      userId,
      timestamp: Date.now(),
    });

    client.emit('trip:update:ack', {
      version: updated.version,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CursorMoveDto,
  ) {
    const userId = client.handshake.auth.userId;
    client.broadcast.to(dto.tripId).emit('cursor:moved', {
      userId,
      position: dto.position,
      selection: dto.selection,
    });
  }
}
`;

const pluginSdkCode = `export interface TrekPlugin<Config = unknown> {
  readonly name: string;
  readonly version: string;
  readonly description?: string;

  onInit?(context: PluginContext, config: Config): void | Promise<void>;
  onDestroy?(): void | Promise<void>;

  registerMapLayers?(): MapLayerDefinition[];
  registerExporters?(): ExporterDefinition[];
  registerBudgetCalculators?(): BudgetCalculator[];
  registerWidgets?(): WidgetDefinition[];

  handleEvent?(event: PluginEvent): void | Promise<void>;
}

export interface PluginContext {
  trip: TripStore;
  map: MapApi;
  budget: BudgetApi;
  ui: UiApi;
  http: HttpApi;
  logger: Logger;
}

export interface MapLayerDefinition {
  id: string;
  name: string;
  type: 'tile' | 'geojson' | 'marker' | 'route';
  source: string | GeoJSON.FeatureCollection;
  style?: LayerStyle;
  visible: boolean;
  onAdd?(map: mapboxgl.Map): void;
  onClick?(feature: GeoJSON.Feature, e: mapboxgl.MapMouseEvent): void;
}

export interface ExporterDefinition {
  id: string;
  name: string;
  icon: string;
  format: string;
  mimeType: string;
  export(trip: TripData, options: ExportOptions): Promise<Blob | string>;
}

export function definePlugin<Config = unknown>(
  plugin: TrekPlugin<Config>
): TrekPlugin<Config> {
  return Object.freeze(plugin);
}

// 示例插件：天气图层
export default definePlugin({
  name: 'weather-overlay',
  version: '1.0.0',
  description: '在地图上显示目的地天气预报',

  async onInit(context, config) {
    context.logger.info('Weather overlay plugin initialized');
  },

  registerMapLayers() {
    return [{
      id: 'weather-radar',
      name: '气象雷达',
      type: 'tile',
      source: 'https://tile.openweathermap.org/map/precipitation/{z}/{x}/{y}.png',
      visible: false,
    }];
  },
});
`;

export const trekProjectData: LargeProjectData = {
  projectId: 'trek',
  architecture: {
    summary: 'TREK 是一个实时协作旅行规划平台，采用前后端分离架构。前端基于 React 18 + Mapbox GL 提供交互式地图体验，支持拖拽式行程安排、预算实时计算、PDF行程单导出。后端使用 NestJS 11 构建，通过 WebSocket 实现多人实时协作——多名用户可以同时编辑同一个行程，看到彼此的光标位置和修改操作。平台通过插件SDK提供扩展性，支持自定义地图图层、导出格式、预算规则等，核心功能保持稳定的同时允许第三方扩展。',
    techStack: ['NestJS 11', 'React 18', 'WebSocket', 'Mapbox GL', 'TypeScript', 'PostgreSQL', 'Docker', 'Kubernetes'],
    modules: [
      {
        name: 'API Gateway',
        description: 'NestJS 后端入口层，处理HTTP请求路由',
        responsibilities: 'REST API路由、认证鉴权、请求校验、限流、API文档生成。作为系统统一入口，将请求分发到各个业务服务。'
      },
      {
        name: 'Collaboration Engine',
        description: '基于WebSocket的实时协作引擎',
        responsibilities: '房间管理、用户 Presence（在线状态）、操作实时广播、冲突解决（OT算法）、光标位置同步。是多人协作的核心模块。'
      },
      {
        name: 'Trip Planner Service',
        description: '行程规划核心业务服务',
        responsibilities: '行程CRUD、日程安排、景点推荐、路线优化（基于地理位置计算最优路线）、POI搜索。处理行程相关的所有业务逻辑。'
      },
      {
        name: 'Budget Calculator',
        description: '预算管理与计算引擎',
        responsibilities: '费用分类、多货币支持、实时预算汇总、人均费用分摊、超支预警。支持插件扩展自定义预算项和计算规则。'
      },
      {
        name: 'Plugin Runtime',
        description: '插件SDK运行时环境',
        responsibilities: '插件加载、沙箱隔离、生命周期管理、API注入、权限控制。允许第三方开发者扩展地图图层、导出格式等功能而不修改核心代码。'
      }
    ],
    diagramDescription: '客户端层：React 18 SPA（桌面/移动端），集成 Mapbox GL JS 地图渲染，通过 Socket.io-client 维持WebSocket连接。入口层：NestJS API Gateway 统一接收 HTTP REST 请求和 WebSocket 连接，执行 JWT 认证。通信层：REST API 处理普通CRUD操作，WebSocket Gateway 处理实时协作事件（trip:update、cursor:move等），按tripId分房间广播。服务层：Trip Planner处理行程业务逻辑，Collaboration Engine管理在线状态和实时同步，Budget Calculator处理费用计算，Plugin Runtime管理扩展。数据层：PostgreSQL存储用户/行程/预算结构化数据，Redis缓存在线状态和会话，外部API调用Mapbox地理编码/OpenWeather天气/酒店预订接口。',
    designHighlights: [
      '插件SDK设计：通过definePlugin定义扩展点，支持地图图层、导出器、预算计算器、UI组件四种扩展类型，核心和扩展通过清晰的接口隔离',
      '实时协作引擎：WebSocket房间按tripId隔离，操作使用OT（Operational Transformation）算法解决冲突，支持离线编辑后同步',
      '模块化NestJS架构：每个业务领域是独立模块，通过依赖注入解耦，Guard/Interceptor/Pipe等横切关注点统一处理',
      '地理计算优化：使用Turf.js进行地理空间计算，路线优化采用启发式算法处理多目的地排序',
      '离线优先设计：客户端使用Service Worker缓存行程数据，弱网环境下可编辑，联网后自动同步冲突'
    ]
  },
  snippets: [
    {
      id: 'collab-gateway',
      title: 'WebSocket协作网关：实时房间管理',
      whyThisFile: '这是TREK实时协作功能的核心入口。NestJS的@WebSocketGateway装饰器展示了如何在Node.js中优雅地构建WebSocket服务。代码包含连接管理（handleConnection/handleDisconnect）、房间隔离（join/leave）、用户在线状态维护、操作广播（broadcast）和ack确认机制，是学习企业级WebSocket开发的优秀范例。其中"操作广播+ack确认"模式是实时协作系统的经典设计。',
      language: 'typescript',
      code: websocketGatewayCode,
      explanation: '这段代码展示了NestJS中WebSocket网关的典型实现模式。核心设计要点：1) 使用@WebSocketGateway装饰器声明网关，配置CORS和命名空间；2) 实现OnGatewayConnection/OnGatewayDisconnect接口处理连接生命周期；3) 使用Map维护用户ID到Socket ID集合的映射，支持同一用户多设备连接；4) 按tripId分房间（join/leave），实现行程级别的广播隔离；5) handleTripUpdate使用broadcast发送给房间内其他人，同时给发送者回ack确认版本号，这是分布式系统中"操作确认"模式；6) 光标移动等高频操作不需要ack，直接广播即可；7) @UseGuards(WsAuthGuard)在WebSocket层复用认证逻辑。',
      lineExplanations: [
        {
          lineNumbers: [1, 16],
          title: 'NestJS WebSocket装饰器与依赖注入',
          content: 'NestJS使用装饰器声明式地定义WebSocket网关，与Angular风格一致。@WebSocketGateway配置网关参数（CORS、命名空间），@WebSocketServer注入Socket.io的Server实例，@SubscribeMessage声明消息监听方法。这种装饰器模式让代码结构非常清晰，横切关注点（如认证@UseGuards）可以像HTTP接口一样复用。',
          knowledgePoints: ['websocket', 'event-driven']
        },
        {
          lineNumbers: [26, 40],
          title: '连接管理与房间机制',
          content: 'handleConnection在客户端连接时执行：1) 从握手数据中获取userId和tripId；2) client.join(tripId)加入Socket.io房间，后续可以按房间广播；3) 维护userSockets映射表支持多设备登录；4) 拉取当前在线用户列表广播给房间内所有人。房间机制是WebSocket实现"分组广播"的标准模式，避免消息发送给无关用户。',
          knowledgePoints: ['websocket', 'event-driven']
        },
        {
          lineNumbers: [57, 75],
          title: '事件处理：广播与确认',
          content: 'handleTripUpdate处理行程更新事件：1) 先通过collabService应用更新（包含冲突解决逻辑）；2) broadcast.to广播给同房间其他用户（排除自己）；3) 给发送者回发ack确认，带上服务端的版本号。这个"操作-广播-确认"模式是实时协作系统的经典设计，类似TCP的确认机制，保证客户端知道操作已被服务端接收。cursor:move是高频事件，不需要ack，直接广播即可。',
          knowledgePoints: ['websocket', 'event-driven']
        }
      ]
    },
    {
      id: 'plugin-sdk',
      title: '插件SDK接口定义：扩展性设计',
      whyThisFile: '这段代码展示了如何设计一个简洁而强大的插件系统。通过TypeScript接口定义清晰的扩展契约，definePlugin工具函数提供类型安全的插件定义方式。代码展示了四种扩展点（地图图层、导出器、预算计算器、UI组件），最后还附了一个天气图层插件示例。插件SDK是"开放-封闭原则"的典型应用——对扩展开放，对修改封闭。',
      language: 'typescript',
      code: pluginSdkCode,
      explanation: '插件SDK的设计核心是"最小可用接口"原则。TrekPlugin接口定义了插件的基本元信息（name/version/description）和生命周期钩子（onInit/onDestroy），然后通过register*方法声明各种扩展点。PluginContext向插件注入受控的API（trip/map/budget/ui/http/logger），插件只能通过这些API与宿主交互，实现沙箱隔离。definePlugin是一个简单的工具函数，用Object.freeze冻结插件对象防止意外修改，同时提供TypeScript类型推导，让插件作者享受完整的类型提示。示例插件展示了实现一个功能插件只需要几行代码，这就是优秀SDK的标志。',
      lineExplanations: [
        {
          lineNumbers: [1, 20],
          title: '插件主接口定义',
          content: 'TrekPlugin<Config>泛型接口定义插件的完整契约：元信息字段、生命周期钩子、四类扩展注册方法、通用事件处理器。所有钩子都是可选的（?标记），插件只需要实现自己关心的部分。Config泛型允许插件定义自己的配置类型，实现类型安全的配置传入。handleEvent提供了一个通用的事件总线入口，插件可以监听宿主系统的各种事件。',
          knowledgePoints: ['plugin-sdk', 'generics']
        },
        {
          lineNumbers: [22, 49],
          title: '上下文API与扩展点',
          content: 'PluginContext定义了宿主注入给插件的API集合——这是插件能做什么的"白名单"，只暴露必要的能力，避免插件获得过多权限导致安全和稳定性问题。MapLayerDefinition和ExporterDefinition是两种典型的扩展点定义，每个扩展点有自己的配置结构和回调。地图图层支持onClick等交互回调，导出器支持异步生成Blob/string结果。',
          knowledgePoints: ['plugin-sdk', 'duck-typing']
        },
        {
          lineNumbers: [51, 73],
          title: 'definePlugin助手与示例',
          content: 'definePlugin是一个identity函数——接收plugin对象原样返回，但通过TypeScript泛型提供类型推导，让插件作者在写代码时获得完整的IDE提示和类型检查。Object.freeze防止插件对象被运行时修改。最后的天气图层示例展示了实现一个插件有多简单：只需要name/version，然后实现registerMapLayers返回图层定义即可。这就是[[zero-config]]设计在插件系统中的体现——最简用法零配置，复杂场景也支持。',
          knowledgePoints: ['plugin-sdk', 'zero-config', 'type-inference']
        }
      ]
    }
  ]
};
