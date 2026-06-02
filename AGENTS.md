# AGENTS.md - LangGraph 项目开发规范

你是一名精通 LangGraph 框架和 Python 开发的资深工程师。在为本项目生成代码、修改逻辑或审查代码时，请严格遵守以下规范。

## 1. 环境与依赖管理 (uv)

- **包管理器**：统一使用 `uv` 进行 Python 环境管理、依赖安装和脚本运行。严禁使用 `pip` 或 `conda`。
- **依赖定义**：所有项目依赖必须记录在 `pyproject.toml` 中。
- **安装命令**：同步依赖使用 `uv sync`。安装本地开发包使用 `uv pip install -e .`。
- **启动开发环境**：本地调试统一使用 `langgraph dev` 命令启动 LangGraph Studio。

## 2. 项目结构与配置

- **目录规范**：核心代码必须放在 `src/` 目录下。LangGraph 的配置文件 `langgraph.json` 必须位于项目根目录。
- **环境变量**：敏感信息（如 API Key）必须放在 `.env` 文件中，严禁硬编码在代码里。`.env` 文件严禁提交到 Git。
- **配置校验**：在修改 `langgraph.json` 时，确保 `graphs` 字段准确指向编译好的 StateGraph 实例（例如 `"./src/agent/graph.py:graph"`）。

## 3. LangGraph 核心开发准则

- **State 定义**：
  - 必须使用 `TypedDict` 定义 State。
  - 聊天记录等需要累加的字段，必须使用 `Annotated[list, add_messages]` 注解，确保多轮对话上下文不丢失。
- **Node 开发**：
  - 节点函数接收 `State` 并返回更新后的 `State`（字典）。
  - 保持节点逻辑单一，复杂业务逻辑应抽离为独立的工具（Tools）或服务类。
- **条件路由 (Conditional Edges)**：
  - 使用 `add_conditional_edges` 实现条件判断。
  - **强制要求**：路由函数（Router Function）必须包含 `else` 兜底逻辑，防止未知状态导致程序崩溃。
- **持久化 (Checkpointer)**：
  - 编译图时必须传入 `checkpointer=MemorySaver()`（或数据库持久化）。
  - 调用图时必须通过 `config={"configurable": {"thread_id": "xxx"}}` 传递线程 ID，以支持多会话记忆隔离。

## 4. 中文开发者本地化适配

- **编码规范**：
  - 代码注释和文档字符串使用中文。
  - `.env` 文件中**严禁出现中文注释**，防止环境变量加载时引发编码报错。
- **网络适配**：在使用 `uv` 安装依赖时，如遇网络问题，优先考虑配置国内 PyPI 镜像源。

## 5. 代码质量与安全

- **代码修改**：杜绝任何形式的直接修改代码文件，所有的代码修改必须通过inline diff形式询问我是否接受。
- **代码格式**：所有新生成的代码使用black formatter插件进行代码格式化。
- **类型安全**：所有函数必须包含类型注解（Type Hints），使用 `TypedDict` 确保状态结构安全。
- **错误处理**：在节点和路由函数中必须使用 `try-except` 捕获异常，并记录详细日志，防止单点故障导致整个 Agent 崩溃。
- **禁止事项**：
  - 禁止在代码中硬编码 API 密钥。
  - 禁止提交 `.env`、`__pycache__` 或 `.langgraph_api` 等自动生成/敏感文件到 Git。
