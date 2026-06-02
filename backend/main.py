import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# 加载 .env（backend/.env 或项目根目录 .env）
load_dotenv(Path(__file__).parent / ".env")
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

app = FastAPI(title="招聘Agent后端API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== 数据模型 =====================


class JDGenerateRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ScreeningRequest(BaseModel):
    jdContent: str
    resumeIds: list[str]


class ResumeData(BaseModel):
    id: str
    filename: str
    name: str = ""
    phone: str = ""
    email: str = ""
    education: str = ""
    workYears: int = 0
    skills: list[str] = []
    experience: str = ""
    uploadedAt: str = ""


# ===================== 内存存储 =====================

uploaded_resumes: dict[str, ResumeData] = {}
screening_tasks: dict[str, dict] = {}
jd_history: list[dict] = []

# ===================== Coze 工作流集成 =====================

COZE_API_TOKEN = os.getenv("COZE_API_TOKEN", "")
JD_WORKFLOW_ID = os.getenv("COZE_JD_WORKFLOW_ID", "")
SCREEN_WORKFLOW_ID = os.getenv("COZE_SCREEN_WORKFLOW_ID", "")


def get_coze_client():
    """获取Coze客户端（延迟初始化）"""
    if not COZE_API_TOKEN:
        return None
    try:
        from cozepy import Coze, TokenAuth, COZE_CN_BASE_URL

        return Coze(auth=TokenAuth(token=COZE_API_TOKEN), base_url=COZE_CN_BASE_URL)
    except ImportError:
        return None


async def call_coze_jd_workflow_stream(message: str):
    """
    调用Coze工作流生成JD（流式输出）
    如果配置了COZE_JD_WORKFLOW_ID则调用真实API，否则使用模拟数据
    """
    coze = get_coze_client()

    if coze and JD_WORKFLOW_ID:
        try:
            for event in coze.workflows.runs.stream(
                workflow_id=JD_WORKFLOW_ID,
                parameters={"input": message},
            ):
                if hasattr(event, "data") and event.data:
                    yield event.data
                elif hasattr(event, "content"):
                    yield event.content
            return
        except Exception as e:
            yield f"\n\n> ⚠️ Coze工作流调用失败: {str(e)}，使用模拟数据\n\n"

    # 模拟流式输出
    mock_jd = f"""## {message.split('，')[0] if '，' in message else message}

### 岗位职责

1. 负责核心业务系统的需求分析、架构设计与开发实现
2. 参与技术方案评审，推动代码质量与工程规范建设
3. 与产品、测试团队紧密协作，按时高质量交付项目
4. 持续优化系统性能，提升系统稳定性与可扩展性
5. 指导初级开发人员，参与团队技术分享

### 任职要求

- 本科及以上学历，计算机科学、软件工程等相关专业
- 5年以上相关岗位工作经验
- 扎实的专业基础，熟悉主流技术框架与工具
- 具备良好的沟通能力和团队协作精神
- 有大型项目经验者优先

### 加分项

- 有开源项目贡献经验
- 具备跨团队协作与项目管理经验
- 持有相关技术认证

### 我们提供

- 具有竞争力的薪酬（15-25K × 14薪）
- 五险一金 + 补充商业保险
- 弹性工作制，扁平化管理
- 丰富的团建活动与学习成长机会

---
> 📝 *此JD由AI自动生成，可根据实际需求调整修改。*
"""
    for char in mock_jd:
        yield char
        await asyncio.sleep(0.02)


# ===================== API路由 =====================


@app.post("/api/jd/generate")
async def generate_jd(req: JDGenerateRequest):
    """JD生成 - SSE流式返回"""
    return StreamingResponse(
        call_coze_jd_workflow_stream(req.message),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.get("/api/jd/list")
async def list_jds():
    return jd_history


@app.post("/api/resume/upload")
async def upload_resumes_endpoint(files: list[UploadFile] = File(...)):
    results = []
    for f in files:
        content = await f.read()
        resume_id = str(uuid.uuid4())[:8]
        resume = ResumeData(
            id=resume_id,
            filename=f.filename or "unknown",
            uploadedAt=datetime.now().isoformat(),
        )
        uploaded_resumes[resume_id] = resume
        results.append({"id": resume_id, "filename": f.filename, "size": len(content)})
    return {"uploaded": len(results), "resumes": results}


@app.post("/api/resume/screen")
async def start_screening(req: ScreeningRequest):
    task_id = str(uuid.uuid4())[:8]
    task = {
        "id": task_id,
        "jdContent": req.jdContent,
        "resumeIds": req.resumeIds,
        "status": "processing",
        "totalResumes": len(req.resumeIds),
        "processedResumes": 0,
        "results": [],
        "createdAt": datetime.now().isoformat(),
    }
    screening_tasks[task_id] = task
    return task


@app.get("/api/resume/screen/{task_id}")
async def get_screening_task(task_id: str):
    task = screening_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.get("/api/resume/screen/{task_id}/stream")
async def stream_screening(task_id: str):
    task = screening_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    async def event_generator():
        for i in range(task["totalResumes"]):
            await asyncio.sleep(1)
            task["processedResumes"] = i + 1
            yield f"data: {json.dumps(task, ensure_ascii=False)}\n\n"
        task["status"] = "completed"
        yield f"data: {json.dumps(task, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/api/history")
async def get_history():
    return list(screening_tasks.values())


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "coze_configured": bool(COZE_API_TOKEN),
        "jd_workflow_configured": bool(JD_WORKFLOW_ID),
        "screen_workflow_configured": bool(SCREEN_WORKFLOW_ID),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
