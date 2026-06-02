# 招聘JD自动生成与简历初筛Agent

基于 **Coze工作流 + React + FastAPI** 的智能招聘系统，实现JD自动生成与简历AI初筛。

## 🏗️ 项目架构

```
├── frontend/          # React前端（Vite + TypeScript + Ant Design）
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   │   ├── JDGeneratorPage.tsx      # JD智能生成（对话式）
│   │   │   ├── ResumeScreeningPage.tsx   # 简历初筛（上传+评分）
│   │   │   └── HistoryPage.tsx          # 历史记录
│   │   ├── services/  # API服务层
│   │   ├── types/     # TypeScript类型定义
│   │   └── App.tsx    # 主应用布局
│   └── package.json
├── backend/           # FastAPI后端
│   ├── main.py        # API路由 + Coze工作流集成
│   └── requirements.txt
├── doc/JD.md          # 项目JD文档
├── run.sh             # 一键启动脚本
└── .env               # 环境变量配置
```

## 🚀 快速开始

### 1. 配置环境变量

编辑 `.env` 文件，填入你的Coze API配置：

```bash
COZE_API_TOKEN=你的Coze Token
COZE_JD_WORKFLOW_ID=JD生成工作流ID
COZE_SCREEN_WORKFLOW_ID=简历初筛工作流ID
```

> 💡 工作流ID在Coze平台创建工作流后获取。未配置时系统使用模拟数据运行。

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
# 后端运行在 http://localhost:8000
# API文档：http://localhost:8000/docs
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3000
```

### 一键启动（可选）

```bash
./run.sh
```

## 📄 功能说明

### 页面1：JD智能生成
- **对话式交互**：HR输入岗位需求（如"高级Java开发，5年经验"），AI实时流式生成JD
- **快捷模板**：预设常用岗位快速开始
- **实时预览**：右侧同步预览生成的Markdown格式JD
- **复制/保存**：一键复制或保存到历史记录

### 页面2：简历初筛
- **批量上传**：支持PDF/Word格式简历拖拽上传
- **AI评分**：基于JD自动匹配评分（技能40%+年限30%+学历20%+行业10%）
- **排序推荐**：分数从高到低排序，标注强烈推荐/建议考虑/不推荐
- **匹配高亮**：展示匹配点和缺失项，便于HR快速判断

### 页面3：历史记录
- **JD历史**：查看所有生成过的JD，支持搜索和重新生成
- **初筛任务**：查看所有初筛任务的统计和结果
- **数据统计**：已生成JD数、初筛任务数、推荐候选人数

## 🔧 Coze工作流集成

系统通过 `cozepy` SDK 与Coze平台工作流集成：

```python
# 流式调用Coze工作流
for event in coze.workflows.runs.stream(
    workflow_id=JD_WORKFLOW_ID,
    parameters={"input": "高级Java开发工程师"},
):
    yield event.data
```

未配置Coze工作流ID时，系统自动降级为本地模拟数据，方便开发调试。

## 📊 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Ant Design 5 |
| 后端 | FastAPI + Python 3.11 |
| AI引擎 | Coze工作流（cozepy SDK） |
| 流式输出 | SSE (Server-Sent Events) |
