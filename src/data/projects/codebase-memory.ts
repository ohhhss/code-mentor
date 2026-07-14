import type { LargeProjectData } from '@/types';

const parserInitCode = `#include "parser.h"
#include "tree_sitter/api.h"
#include <string.h>
#include <stdio.h>

#define MAX_LANGUAGES 64

typedef struct {
    const char *name;
    const char **extensions;
    const TSLanguage *(*create)(void);
} LanguageEntry;

static LanguageEntry languages[MAX_LANGUAGES];
static int language_count = 0;

void parser_init(void) {
    language_count = 0;

    /* 注册支持的语言，按字母排序 */
    parser_register_language("c", (const char*[]){".c", ".h", NULL}, tree_sitter_c);
    parser_register_language("cpp", (const char*[]){".cpp", ".hpp", ".cc", ".cxx", NULL}, tree_sitter_cpp);
    parser_register_language("python", (const char*[]){".py", ".pyi", NULL}, tree_sitter_python);
    parser_register_language("typescript", (const char*[]){".ts", ".tsx", NULL}, tree_sitter_typescript);
    parser_register_language("javascript", (const char*[]){".js", ".jsx", ".mjs", NULL}, tree_sitter_javascript);
    parser_register_language("rust", (const char*[]){".rs", NULL}, tree_sitter_rust);
    parser_register_language("go", (const char*[]){".go", NULL}, tree_sitter_go);
    parser_register_language("java", (const char*[]){".java", NULL}, tree_sitter_java);
    /* ... 158种语言 ... */
}

void parser_register_language(const char *name, const char **extensions,
                               const TSLanguage *(*create)(void)) {
    if (language_count >= MAX_LANGUAGES) {
        fprintf(stderr, "Warning: too many languages registered\\n");
        return;
    }
    languages[language_count].name = name;
    languages[language_count].extensions = extensions;
    languages[language_count].create = create;
    language_count++;
}

const TSLanguage *parser_detect_language(const char *filename) {
    const char *ext = strrchr(filename, '.');
    if (!ext) return NULL;

    for (int i = 0; i < language_count; i++) {
        for (const char **p = languages[i].extensions; *p; p++) {
            if (strcmp(ext, *p) == 0) {
                return languages[i].create();
            }
        }
    }
    return NULL;
}

ParseResult *parser_parse_file(const char *filepath, const char *source_code, size_t length) {
    const TSLanguage *lang = parser_detect_language(filepath);
    if (!lang) {
        return NULL;
    }

    TSParser *parser = ts_parser_new();
    if (!ts_parser_set_language(parser, lang)) {
        fprintf(stderr, "Failed to set language for %s\\n", filepath);
        ts_parser_delete(parser);
        return NULL;
    }

    TSTree *tree = ts_parser_parse_string(parser, NULL, source_code, length);

    ParseResult *result = malloc(sizeof(ParseResult));
    result->language = lang;
    result->parser = parser;
    result->tree = tree;
    result->root_node = ts_tree_root_node(tree);
    result->source = source_code;
    result->length = length;

    return result;
}

/* 增量解析：文件修改后只重新解析变化部分 */
TSTree *parser_reparse(ParseResult *result, const char *new_source,
                        size_t new_length, const TSInputEdit *edit) {
    ts_tree_edit(result->tree, edit);
    TSTree *new_tree = ts_parser_parse_string(result->parser, result->tree,
                                               new_source, new_length);
    ts_tree_delete(result->tree);
    result->tree = new_tree;
    result->root_node = ts_tree_root_node(new_tree);
    result->source = new_source;
    result->length = new_length;
    return new_tree;
}

void parser_free_result(ParseResult *result) {
    if (result) {
        ts_tree_delete(result->tree);
        ts_parser_delete(result->parser);
        free(result);
    }
}
`;

const knowledgeGraphCode = `#include "graph.h"
#include "sqlite3.h"
#include <stdlib.h>
#include <string.h>

/* 节点类型 */
typedef enum {
    NODE_FILE,
    NODE_FUNCTION,
    NODE_CLASS,
    NODE_VARIABLE,
    NODE_INTERFACE,
    NODE_TYPE,
    NODE_MODULE,
    NODE_IMPORT
} NodeKind;

/* 关系类型 */
typedef enum {
    EDGE_DEFINES,      /* 文件定义了符号 */
    EDGE_CALLS,        /* 函数调用 */
    EDGE_REFERENCES,   /* 引用变量/类型 */
    EDGE_INHERITS,     /* 类继承 */
    EDGE_IMPORTS,      /* 导入模块 */
    EDGE_CONTAINS,     /* 包含（类包含方法） */
    EDGE_IMPLEMENTS    /* 实现接口 */
} EdgeKind;

typedef struct {
    sqlite3 *db;
    sqlite3_stmt *insert_node_stmt;
    sqlite3_stmt *insert_edge_stmt;
    sqlite3_stmt *find_refs_stmt;
    sqlite3_stmt *find_calls_stmt;
} KnowledgeGraph;

KnowledgeGraph *graph_open(const char *db_path) {
    KnowledgeGraph *graph = malloc(sizeof(KnowledgeGraph));
    if (sqlite3_open(db_path, &graph->db) != SQLITE_OK) {
        free(graph);
        return NULL;
    }

    /* 初始化Schema */
    sqlite3_exec(graph->db,
        "CREATE TABLE IF NOT EXISTS nodes ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  kind INTEGER NOT NULL,"
        "  name TEXT NOT NULL,"
        "  file_path TEXT NOT NULL,"
        "  start_line INTEGER,"
        "  end_line INTEGER,"
        "  start_col INTEGER,"
        "  end_col INTEGER,"
        "  signature TEXT,"
        "  docstring TEXT,"
        "  UNIQUE(file_path, name, kind)"
        ");"
        "CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);"
        "CREATE INDEX IF NOT EXISTS idx_nodes_file ON nodes(file_path);"
        ""
        "CREATE TABLE IF NOT EXISTS edges ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  kind INTEGER NOT NULL,"
        "  source_id INTEGER NOT NULL REFERENCES nodes(id),"
        "  target_id INTEGER NOT NULL REFERENCES nodes(id),"
        "  location TEXT,"
        "  UNIQUE(source_id, target_id, kind)"
        ");"
        "CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);"
        "CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);",
        NULL, NULL, NULL);

    /* 预编译语句 */
    sqlite3_prepare_v2(graph->db,
        "INSERT OR IGNORE INTO nodes(kind, name, file_path, start_line, end_line, "
        "start_col, end_col, signature, docstring) VALUES(?,?,?,?,?,?,?,?,?)",
        -1, &graph->insert_node_stmt, NULL);

    sqlite3_prepare_v2(graph->db,
        "INSERT OR IGNORE INTO edges(kind, source_id, target_id, location) VALUES(?,?,?,?)",
        -1, &graph->insert_edge_stmt, NULL);

    sqlite3_prepare_v2(graph->db,
        "SELECT n.* FROM edges e JOIN nodes n ON e.source_id = n.id "
        "WHERE e.target_id = ? AND e.kind = ?",
        -1, &graph->find_refs_stmt, NULL);

    return graph;
}

int64_t graph_add_node(KnowledgeGraph *graph, NodeKind kind, const char *name,
                         const char *file_path, int start_line, int end_line,
                         int start_col, int end_col, const char *signature,
                         const char *docstring) {
    sqlite3_stmt *stmt = graph->insert_node_stmt;
    sqlite3_bind_int(stmt, 1, kind);
    sqlite3_bind_text(stmt, 2, name, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, file_path, -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 4, start_line);
    sqlite3_bind_int(stmt, 5, end_line);
    sqlite3_bind_int(stmt, 6, start_col);
    sqlite3_bind_int(stmt, 7, end_col);
    sqlite3_bind_text(stmt, 8, signature ? signature : "", -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, docstring ? docstring : "", -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_reset(stmt);
        return -1;
    }

    int64_t id = sqlite3_last_insert_rowid(graph->db);
    sqlite3_reset(stmt);
    return id;
}

void graph_add_edge(KnowledgeGraph *graph, EdgeKind kind,
                     int64_t source_id, int64_t target_id, const char *location) {
    sqlite3_stmt *stmt = graph->insert_edge_stmt;
    sqlite3_bind_int(stmt, 1, kind);
    sqlite3_bind_int64(stmt, 2, source_id);
    sqlite3_bind_int64(stmt, 3, target_id);
    sqlite3_bind_text(stmt, 4, location ? location : "", -1, SQLITE_TRANSIENT);
    sqlite3_step(stmt);
    sqlite3_reset(stmt);
}

void graph_begin_transaction(KnowledgeGraph *graph) {
    sqlite3_exec(graph->db, "BEGIN TRANSACTION", NULL, NULL, NULL);
}

void graph_commit(KnowledgeGraph *graph) {
    sqlite3_exec(graph->db, "COMMIT", NULL, NULL, NULL);
}

void graph_close(KnowledgeGraph *graph) {
    if (graph) {
        sqlite3_finalize(graph->insert_node_stmt);
        sqlite3_finalize(graph->insert_edge_stmt);
        sqlite3_finalize(graph->find_refs_stmt);
        sqlite3_finalize(graph->find_calls_stmt);
        sqlite3_close(graph->db);
        free(graph);
    }
}
`;

export const codebaseMemoryData: LargeProjectData = {
  projectId: 'codebase-memory',
  architecture: {
    summary: 'codebase-memory-mcp 是一个高性能的代码智能分析引擎，核心用 C 语言实现以追求极致性能。它通过 Tree-sitter 增量解析器支持 158 种编程语言，将代码解析为具体语法树（CST）后提取符号、关系，构建成知识图谱存储在 SQLite 中。引擎实现了 Language Server Protocol (LSP)，可以直接接入 VS Code 等编辑器提供代码导航能力；同时编译为 WebAssembly 在浏览器中运行，配套 3D 代码可视化 UI 将代码结构以三维图谱形式呈现。与传统基于正则或简单AST的工具不同，它理解代码的语义关系，能够回答"这个函数被哪些地方调用"、"追踪这个变量的定义到使用"、"这个接口有哪些实现"等深度问题。',
    techStack: ['C', 'tree-sitter', 'SQLite', 'LSP', 'WebAssembly', 'Graph Visualization'],
    modules: [
      {
        name: 'Multi-language Parser',
        description: '基于Tree-sitter的多语言增量解析器',
        responsibilities: '语言自动检测（通过文件扩展名）、Tree-sitter解析器初始化、具体语法树(CST)生成、增量解析（编辑后只重解析变化部分）、错误容忍解析。目前支持158种编程语言。'
      },
      {
        name: 'Symbol Extractor',
        description: '从CST中提取语义符号',
        responsibilities: '遍历语法树提取函数/类/变量/接口/模块定义，提取函数签名、文档字符串、参数列表，识别导入/导出语句，区分定义与引用。每种语言有对应的查询文件(.scm)定义提取规则。'
      },
      {
        name: 'Knowledge Graph Store',
        description: '基于SQLite的知识图谱存储引擎',
        responsibilities: '节点（符号）和边（关系）的持久化存储、事务批量写入、复合索引优化查询、邻接查询（查找引用/调用者/被调用者）、增量更新（文件修改后只更新相关节点边）。'
      },
      {
        name: 'LSP Server',
        description: 'Language Server Protocol实现',
        responsibilities: '实现LSP标准接口：textDocument/definition跳转到定义、textDocument/references查找引用、textDocument/hover悬停提示、textDocument/documentSymbol文档符号、workspace/symbol工作区符号搜索。让任何支持LSP的编辑器都能使用其能力。'
      },
      {
        name: 'WASM Runtime & 3D Visualization',
        description: 'WebAssembly编译目标与3D可视化前端',
        responsibilities: 'C核心编译为WASM在浏览器中运行、Web Worker中后台解析不阻塞UI、Three.js/WebGL实现3D力导向图可视化、节点聚类减少视觉复杂度、点击节点跳转到对应代码位置。'
      }
    ],
    diagramDescription: '最底层是C语言核心引擎：Multi-language Parser模块链接所有Tree-sitter语言动态库（或编译进静态库），Parser从文件系统读取源码生成CST；Symbol Extractor使用Tree-sitter查询(.scm)遍历CST提取符号和关系；Knowledge Graph Store将节点和边写入SQLite数据库，使用预编译语句和事务保证写入性能。核心引擎有两个对外接口：1) LSP Server通过stdio/JSON-RPC与编辑器通信，处理LSP协议请求；2) WASM编译层将C代码编译为WebAssembly，在浏览器Web Worker中运行，通过Typed Array与主线程通信。上层是3D Visualization UI：Three.js渲染力导向图，d3-force计算布局，节点按模块聚类着色，边表示调用/引用/继承关系，提供缩放、搜索、过滤、点击跳转等交互。',
    designHighlights: [
      '多语言解析架构：语言注册机制让新增语言只需要注册扩展名和tree-sitter语言函数，无需修改核心逻辑；使用Tree-sitter查询(.scm)声明式定义符号提取规则',
      '增量解析性能优化：Tree-sitter原生支持增量解析，文件编辑后只重新解析受影响的语法节点；知识图谱增量更新只删除并重算修改文件的节点和边',
      '知识图谱存储设计：SQLite作为嵌入式图数据库，通过邻接表模型（nodes表+edges表）存储图结构；预编译语句复用查询计划，事务批量写入速度达每秒数万节点',
      'LSP协议实现：不重复造轮子，直接实现LSP标准，天然支持VS Code/Neovim/IntelliJ等所有现代编辑器',
      'WASM一次编写多处运行：C核心代码同时编译为本地共享库（用于LSP服务）和WebAssembly（用于浏览器3D可视化），核心逻辑不重复'
    ]
  },
  snippets: [
    {
      id: 'parser-init',
      title: 'Tree-sitter多语言解析器初始化',
      whyThisFile: '这段代码展示了如何设计一个可扩展的多语言解析架构。核心是"语言注册表"模式：通过parser_register_language函数注册每种语言的名称、文件扩展名列表、Tree-sitter语言工厂函数。parser_parse_file函数根据文件扩展名自动选择正确的解析器，调用者无需关心具体语言。还包含了Tree-sitter增量解析API的使用示例（parser_reparse），这是Tree-sitter相比其他解析器最核心的优势——编辑代码时不需要重新解析整个文件。',
      language: 'c',
      code: parserInitCode,
      explanation: 'C语言实现的多语言解析器核心。设计要点：1) 静态数组+计数器实现简单的语言注册表，避免动态数据结构的复杂性；2) 每种语言提供名称、扩展名列表、Tree-sitter语言创建函数指针，新增语言只需一行注册调用；3) parser_detect_language通过文件扩展名线性扫描匹配（语言数量有限，O(n)完全可接受）；4) parser_parse_file创建TSParser、设置语言、解析源码，封装成ParseResult统一返回；5) parser_reparse展示Tree-sitter增量解析的核心API——ts_tree_edit告知树如何修改，然后重新解析时Tree-sitter会复用未变化部分的语法树，大文件中性能提升可达两个数量级；6) 完善的资源管理：parser_free_result释放所有分配的资源，避免内存泄漏。',
      lineExplanations: [
        {
          lineNumbers: [1, 21],
          title: '语言注册表数据结构',
          content: 'LanguageEntry结构体描述一种可解析的语言：名称、扩展名列表（NULL结尾的字符串数组）、Tree-sitter语言工厂函数指针。MAX_LANGUAGES设置为64预留足够空间。parser_init函数中注册所有支持的语言——这是"注册表模式"在C中的典型实现，扩展性好，新增语言不需要修改核心逻辑。',
          knowledgePoints: ['tree-sitter']
        },
        {
          lineNumbers: [42, 68],
          title: '语言检测与文件解析',
          content: 'parser_detect_language从文件名提取扩展名，遍历注册表匹配。parser_parse_file是解析入口：1) 检测语言获取TSLanguage；2) 创建TSParser；3) 设置语言（ts_parser_set_language可能失败，比如ABI版本不兼容）；4) ts_parser_parse_string执行解析生成TSTree；5) 封装结果到ParseResult结构体返回。注意所有资源都需要调用者通过parser_free_result释放。',
          knowledgePoints: ['tree-sitter']
        },
        {
          lineNumbers: [70, 84],
          title: '增量解析与资源管理',
          content: 'parser_reparse展示Tree-sitter最强大的特性：增量解析。当代码被编辑时，不需要重新解析整个文件——ts_tree_edit告知旧树编辑发生的位置和内容，ts_parser_parse_string传入旧树，Tree-sitter内部只重新解析受影响的节点，复用其余部分。对于几万行的大文件，增量解析比全量解析快10-100倍。parser_free_result正确释放TSTree、TSParser和ParseResult本身，C语言中手动内存管理必须严谨。',
          knowledgePoints: ['tree-sitter']
        }
      ],
      walkthroughSteps: [
        {
          id: 1,
          title: '语言注册表数据结构',
          description: '代码开头导入 Tree-sitter 头文件和标准库，定义 LanguageEntry 结构体描述一种可解析的语言：名称、扩展名列表（NULL 结尾的字符串数组）、Tree-sitter 语言工厂函数指针。MAX_LANGUAGES 设为 64 预留空间，静态数组和计数器实现简单的注册表，避免动态数据结构的复杂性。',
          filePath: 'parser-init',
          highlightLines: [1, 15],
          keyInsight: '静态数组 + 函数指针实现的语言注册表，简单且高效。'
        },
        {
          id: 2,
          title: '语言注册：parser_init',
          description: 'parser_init 函数重置计数器后逐个注册支持的语言：C、C++、Python、TypeScript、JavaScript、Rust、Go、Java 等。每行调用 parser_register_language 传入语言名、扩展名数组和 Tree-sitter 工厂函数。这种"注册表模式"让新增语言只需一行注册调用，无需修改核心解析逻辑。',
          filePath: 'parser-init',
          highlightLines: [17, 28],
          keyInsight: '注册表模式：新增语言只需一行注册调用，对扩展开放对修改封闭。'
        },
        {
          id: 3,
          title: '注册函数与边界检查',
          description: 'parser_register_language 函数检查是否超过 MAX_LANGUAGES 上限，然后将语言信息写入数组并递增计数器。边界检查防止数组越界，fprintf 输出警告信息。这种简单的注册函数封装了注册表写入逻辑，调用者无需关心内部存储细节。',
          filePath: 'parser-init',
          highlightLines: [30, 40],
          keyInsight: '边界检查防止越界，注册逻辑封装让调用者无需关心存储细节。'
        },
        {
          id: 4,
          title: '语言检测与文件解析',
          description: 'parser_detect_language 从文件名提取扩展名，遍历注册表线性匹配（语言数量有限 O(n) 完全可接受）。parser_parse_file 是解析入口：检测语言→创建 TSParser→设置语言→解析源码生成 TSTree→封装为 ParseResult 返回。ts_parser_set_language 可能因 ABI 不兼容失败，需检查返回值。',
          filePath: 'parser-init',
          highlightLines: [44, 82],
          keyInsight: '文件扩展名驱动语言选择，封装统一接口让调用者无需关心具体语言。'
        },
        {
          id: 5,
          title: '增量解析与资源释放',
          description: 'parser_reparse 展示 Tree-sitter 最强大的特性：增量解析。ts_tree_edit 告知旧树编辑位置，ts_parser_parse_string 传入旧树后只重解析受影响节点，复用未变化部分。大文件中性能提升可达 10-100 倍。parser_free_result 正确释放 TSTree、TSParser 和 ParseResult，C 语言手动内存管理必须严谨。',
          filePath: 'parser-init',
          highlightLines: [84, 104],
          keyInsight: '增量解析只重算变化部分，大文件性能提升两个数量级。'
        }
      ]
    },
    {
      id: 'knowledge-graph',
      title: '知识图谱存储：SQLite图数据库设计',
      whyThisFile: '这段代码展示了如何用SQLite实现一个嵌入式知识图谱（图数据库）。很多人提到图数据库就想到Neo4j等专用数据库，但对于本地代码分析这种场景，嵌入式的SQLite是更好的选择——零配置、单文件、性能足够。代码使用邻接表模型（nodes表+edges表）存储图结构，通过预编译语句(sqlite3_stmt)优化重复查询性能，使用事务批量写入提升插入速度。这种"SQLite作为图数据库"的设计思路在很多工具中都能见到。',
      language: 'c',
      code: knowledgeGraphCode,
      explanation: '基于SQLite的知识图谱实现。核心设计：1) NodeKind和EdgeKind枚举定义节点和关系类型，覆盖代码分析中的核心语义关系（定义、调用、引用、继承、导入、包含、实现）；2) 图结构用邻接表存储：nodes表存节点（符号），edges表存边（关系），通过source_id/target_id外键关联；3) 为常用查询字段建立索引（name、file_path、source_id、target_id）；4) 使用sqlite3_prepare_v2预编译重复执行的SQL语句，避免每次执行都解析SQL规划查询，性能提升显著；5) INSERT OR IGNORE处理重复插入，简化上层逻辑；6) graph_begin_transaction/graph_commit提供事务边界，批量插入时必须用事务——SQLite默认每条语句是一个事务，批量插入不用事务速度会慢1000倍。',
      lineExplanations: [
        {
          lineNumbers: [1, 40],
          title: '数据模型与Schema初始化',
          content: 'NodeKind枚举了代码中常见的符号类型（文件、函数、类、变量、接口、类型、模块、导入），EdgeKind枚举了符号间的语义关系类型。KnowledgeGraph结构体持有sqlite3连接和所有预编译语句。graph_open函数打开数据库连接，执行CREATE TABLE IF NOT EXISTS初始化Schema，nodes表包含符号的位置信息（行列号）和元数据（签名、文档字符串），edges表通过外键关联两个节点，UNIQUE约束防止重复边。',
          knowledgePoints: ['knowledge-graph']
        },
        {
          lineNumbers: [42, 80],
          title: '预编译语句与节点插入',
          content: 'sqlite3_prepare_v2将SQL语句编译为字节码，复用sqlite3_stmt避免重复解析SQL——这是SQLite性能优化的核心技巧之一。graph_add_node函数绑定参数后执行插入，使用SQLITE_TRANSIENT让SQLite拷贝字符串（因为传入的字符串可能在语句执行后被释放）。sqlite3_last_insert_rowid获取刚插入的自增ID。所有绑定后必须sqlite3_reset重置语句状态以便下次使用。',
          knowledgePoints: ['knowledge-graph']
        },
        {
          lineNumbers: [82, 103],
          title: '边创建与事务控制',
          content: 'graph_add_edge添加节点间的关系，同样使用预编译语句。graph_begin_transaction和graph_commit暴露事务边界——批量索引整个代码库时，先BEGIN TRANSACTION，插入所有节点边后再COMMIT，性能提升显著（SQLite事务提交时才刷盘，单条插入一次事务意味着每次插入都刷盘）。graph_close正确finalize所有预编译语句、关闭数据库连接、释放内存，C语言中资源清理顺序很重要。',
          knowledgePoints: ['knowledge-graph']
        }
      ],
      walkthroughSteps: [
        {
          id: 1,
          title: '节点与关系类型枚举',
          description: 'NodeKind 枚举定义代码中常见的符号类型（文件、函数、类、变量、接口、类型、模块、导入），EdgeKind 枚举定义符号间的语义关系（定义、调用、引用、继承、导入、包含、实现）。这两个枚举覆盖了代码分析中的核心语义关系，是知识图谱的"词汇表"，决定了引擎能回答哪些问题。',
          filePath: 'knowledge-graph',
          highlightLines: [6, 27],
          keyInsight: '丰富的节点和边类型决定了图谱的表达能力，覆盖代码核心语义。'
        },
        {
          id: 2,
          title: 'KnowledgeGraph 结构体定义',
          description: 'KnowledgeGraph 结构体持有 sqlite3 数据库连接和四个预编译语句（insert_node_stmt、insert_edge_stmt、find_refs_stmt、find_calls_stmt）。预编译语句复用查询计划避免重复解析 SQL，是 SQLite 性能优化的核心技巧。结构体设计将数据库操作所需的所有资源集中管理，便于生命周期控制。',
          filePath: 'knowledge-graph',
          highlightLines: [29, 35],
          keyInsight: '预编译语句是 SQLite 性能优化核心，复用查询计划避免重复解析。'
        },
        {
          id: 3,
          title: 'graph_open：Schema 初始化与预编译',
          description: 'graph_open 打开数据库连接后执行 CREATE TABLE IF NOT EXISTS 初始化 Schema：nodes 表存储符号位置和元数据，edges 表通过外键关联两个节点。UNIQUE 约束防止重复边。随后用 sqlite3_prepare_v2 预编译常用 SQL 语句（插入节点、插入边、查找引用）。索引（name、file_path、source_id、target_id）加速常用查询。',
          filePath: 'knowledge-graph',
          highlightLines: [37, 90],
          keyInsight: 'UNIQUE 约束防重复，索引加速查询，预编译语句优化性能。'
        },
        {
          id: 4,
          title: '节点与边的插入操作',
          description: 'graph_add_node 绑定参数后执行插入，使用 SQLITE_TRANSIENT 让 SQLite 拷贝字符串（因传入字符串可能在执行后被释放）。sqlite3_last_insert_rowid 获取自增 ID。所有绑定后必须 sqlite3_reset 重置语句状态以便下次使用。graph_add_edge 添加节点间关系，同样使用预编译语句和参数绑定。',
          filePath: 'knowledge-graph',
          highlightLines: [92, 126],
          keyInsight: 'SQLITE_TRANSIENT 确保字符串安全，reset 复用语句提升性能。'
        },
        {
          id: 5,
          title: '事务控制与资源清理',
          description: 'graph_begin_transaction 和 graph_commit 暴露事务边界——批量索引整个代码库时必须用事务，SQLite 默认每条语句一个事务，批量插入不用事务速度会慢 1000 倍。graph_close 正确 finalize 所有预编译语句、关闭数据库连接、释放内存。C 语言中资源清理顺序很重要，必须先 finalize 语句再关闭连接。',
          filePath: 'knowledge-graph',
          highlightLines: [128, 146],
          keyInsight: '事务批量写入性能提升千倍，资源清理顺序必须严谨。'
        }
      ]
    }
  ]
};
