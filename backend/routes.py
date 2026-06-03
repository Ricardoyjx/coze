import json
import uuid
import asyncio
import os
import logging
from datetime import datetime

from fastapi import UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, Response

logger = logging.getLogger(__name__)

from config import (
    app,
    COZE_SPACES,
    COZE_API_TOKEN,
    JD_WORKFLOW_ID,
    SCREEN_WORKFLOW_ID,
    OFFER_WORKFLOW_ID,
    uploaded_resumes,
    screening_tasks,
    jd_history,
    ResumeData,
)
from models import (
    InterviewQuestionsRequest,
    JDGenerateRequest,
    ScreeningRequest,
    OfferEmailRequest,
    SalaryAnalysisRequest,
    BatchScreenRequest,
)
from services import (
    get_coze_client,
    jd_stream_generator,
    offer_stream_generator,
    interview_questions_generator,
    resume_screening_generator,
    salary_analysis_generator,
    batch_screening_generator,
)

# ===================== JD =====================


@app.post("/api/jd/generate")
async def generate_jd(req: JDGenerateRequest):
    return StreamingResponse(
        jd_stream_generator(req.message),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff"},
    )


@app.get("/api/jd/list")
async def list_jds():
    return jd_history


# ===================== 简历 =====================


@app.post("/api/resume/upload")
async def upload_resumes_endpoint(files: list[UploadFile] = File(...)):
    results = []
    for f in files:
        raw_bytes = await f.read()
        resume_id = str(uuid.uuid4())[:8]
        raw_text = ""
        if f.filename and f.filename.lower().endswith(".pdf"):
            try:
                from io import BytesIO
                from pypdf import PdfReader

                reader = PdfReader(BytesIO(raw_bytes))
                for page in reader.pages:
                    raw_text += page.extract_text() or ""
            except Exception:
                raw_text = ""
        elif f.filename and f.filename.lower().endswith((".doc", ".docx")):
            try:
                from io import BytesIO
                from docx import Document

                doc = Document(BytesIO(raw_bytes))
                for para in doc.paragraphs:
                    raw_text += para.text + "\n"
            except Exception:
                raw_text = ""
        else:
            raw_text = raw_bytes.decode("utf-8", errors="replace")

        resume = ResumeData(
            id=resume_id,
            filename=f.filename or "unknown",
            raw_text=raw_text,
            file_bytes=raw_bytes,
            uploadedAt=datetime.now().isoformat(),
        )
        uploaded_resumes[resume_id] = resume
        results.append(
            {"id": resume_id, "filename": f.filename, "size": len(raw_bytes)}
        )
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


# ===================== Offer =====================


@app.post("/api/offer-email/generate")
async def generate_offer_email(req: OfferEmailRequest):
    return StreamingResponse(
        offer_stream_generator(
            req.candidate_name,
            req.position,
            req.salary,
            req.start_date,
            req.location,
            req.notes or "",
            req.company_name or "",
        ),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff"},
    )


# ===================== 薪资分析 =====================


@app.post("/api/salary/analyze")
async def analyze_salary(req: SalaryAnalysisRequest):
    """调用 Coze Bot 进行真实薪资分析，Bot 未配置时使用本地兜底数据。"""
    import json as _json

    async def _stream():
        result_text = ""
        async for chunk in salary_analysis_generator(
            position=req.position,
            city=req.city,
            experience=req.experience,
            education=req.education,
        ):
            result_text = chunk  # generator yields one full JSON string
        yield result_text

    # Non-streaming: collect full result and return as JSON
    async for result_text in _stream():
        try:
            return _json.loads(result_text)
        except Exception:
            return {"error": "解析薪资分析结果失败", "detail": result_text}


# ===================== 简历审查 =====================
# ===================== 简历审查 =====================


@app.post("/api/batch-screen")
async def batch_screen(req: BatchScreenRequest):
    """调用 Coze Bot 对上传的简历进行批量审查评分，SSE 流式返回。"""
    resume_items = []
    for rid in req.resumeIds:
        rd = uploaded_resumes.get(rid)
        if rd:
            resume_items.append(rd.model_dump())
        else:
            resume_items.append({"id": rid, "filename": "unknown", "raw_text": ""})

    return StreamingResponse(
        batch_screening_generator(
            jd_content=req.jdContent,
            resume_items=resume_items,
            threshold=req.threshold,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


# ===================== 简历初筛 =====================


@app.post("/api/resume/screening/run")
async def run_screening(req: ScreeningRequest):
    """使用 Coze Bot 对上传的简历进行真实 AI 初筛评分。"""
    resume_items = []
    for rid in req.resumeIds:
        rd = uploaded_resumes.get(rid)
        if rd:
            resume_items.append(rd.model_dump())
        else:
            resume_items.append({"id": rid, "filename": "unknown", "raw_text": ""})

    return StreamingResponse(
        resume_screening_generator(req.jdContent, resume_items),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


# ===================== 简历文件 =====================


@app.get("/api/resume/{resume_id}/file")
async def get_resume_file(resume_id: str):
    """返回上传的简历原始文件供预览/下载。"""
    try:
        rd = uploaded_resumes.get(resume_id)
        if not rd:
            logger.warning("简历不存在: %s", resume_id)
            raise HTTPException(status_code=404, detail="简历不存在")
        if not rd.file_bytes:
            logger.warning("简历文件内容已过期: %s", resume_id)
            raise HTTPException(status_code=404, detail="文件内容已过期")
        filename = rd.filename or "resume.pdf"
        media_type = "application/octet-stream"
        if filename.lower().endswith(".pdf"):
            media_type = "application/pdf"
        elif filename.lower().endswith((".doc", ".docx")):
            media_type = "application/msword"

        # RFC 5987: non-ASCII filenames use percent-encoding + UTF-8
        ascii_name = filename.encode("ascii", "ignore").decode("ascii")
        if not ascii_name.strip():
            ext = os.path.splitext(filename)[1] or ".pdf"
            ascii_name = "resume" + ext
        elif ascii_name.strip() == (
            "." + filename.rsplit(".", 1)[-1] if "." in filename else ""
        ):
            ext = os.path.splitext(filename)[1] or ".pdf"
            ascii_name = "resume" + ext
        from urllib.parse import quote

        utf8_name = quote(filename.encode("utf-8"))

        logger.info(
            "返回简历文件: %s, size=%d bytes, type=%s",
            filename,
            len(rd.file_bytes),
            media_type,
        )
        return Response(
            content=rd.file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": "attachment; filename="
                " + ascii_name + "
                "; filename*=UTF-8''" + utf8_name,
                "Content-Length": str(len(rd.file_bytes)),
                "Accept-Ranges": "bytes",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("获取简历文件失败: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="获取文件失败: " + str(e))


@app.post("/api/interview-questions/generate")
async def generate_interview_questions(req: InterviewQuestionsRequest):
    return StreamingResponse(
        interview_questions_generator(
            position=req.position,
            jd_content=req.jdContent,
            count=req.count,
            difficulty=req.difficulty,
            types=req.types,
        ),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff"},
    )


# ===================== Coze 配置 =====================


@app.get("/api/coze/status")
async def coze_status():
    """
    返回多 Space 配置状态。
    先通过 Coze API 获取真实的工作空间列表，再查每个工作空间下的 Bot。
    """
    spaces = []
    errors = []

    for env_id, cfg in COZE_SPACES.items():
        space = {
            "space_id": env_id,
            "name": cfg.get("name", ""),
            "api_key_configured": bool(cfg.get("api_key")),
            "bot_id": cfg.get("bot_id", ""),
            "workspaces": [],
            "bots": [],
        }

        client = get_coze_client(env_id)
        if not client:
            space["error"] = (
                "API Key 未配置" if not cfg.get("api_key") else "客户端初始化失败"
            )
            spaces.append(space)
            continue

        try:
            ws_list_raw = client.workspaces.list()
            ws_list: list = []
            for ws in ws_list_raw:
                ws_list.append(ws)

            if not ws_list:
                space["workspaces"].append(
                    {"id": env_id, "name": cfg.get("name", env_id)}
                )
                try:
                    bots = list(client.bots.list(space_id=env_id))
                    for bot in bots:
                        space["bots"].append(
                            {
                                "bot_id": bot.bot_id if hasattr(bot, "bot_id") else "",
                                "name": bot.name if hasattr(bot, "name") else "",
                                "description": (
                                    bot.description
                                    if hasattr(bot, "description")
                                    else ""
                                ),
                                "status": bot.status if hasattr(bot, "status") else "",
                            }
                        )
                except Exception as bot_e:
                    errors.append(f"Space {env_id} Bot列表获取失败: {bot_e}")
            else:
                for ws in ws_list:
                    ws_id = ws.id if hasattr(ws, "id") else ""
                    ws_name = ws.name if hasattr(ws, "name") else ""
                    space["workspaces"].append({"id": ws_id, "name": ws_name})
                    if not ws_id:
                        continue
                    try:
                        bots = list(client.bots.list(space_id=ws_id))
                        for bot in bots:
                            space["bots"].append(
                                {
                                    "bot_id": (
                                        bot.bot_id if hasattr(bot, "bot_id") else ""
                                    ),
                                    "name": bot.name if hasattr(bot, "name") else "",
                                    "description": (
                                        bot.description
                                        if hasattr(bot, "description")
                                        else ""
                                    ),
                                    "status": (
                                        bot.status if hasattr(bot, "status") else ""
                                    ),
                                }
                            )
                    except Exception as bot_e:
                        errors.append(f"工作空间 {ws_id} Bot列表获取失败: {bot_e}")

            if not space["bot_id"] and space["bots"]:
                space["bot_id"] = space["bots"][0]["bot_id"]
                COZE_SPACES[env_id]["bot_id"] = space["bot_id"]

        except Exception as e:
            space["error"] = f"获取工作空间列表失败: {str(e)}"
            errors.append(str(e))

        spaces.append(space)

    return {
        "spaces_configured": len(COZE_SPACES),
        "spaces": spaces,
        "workflows": {
            "jd_generate": {"id": JD_WORKFLOW_ID, "configured": bool(JD_WORKFLOW_ID)},
            "screening": {
                "id": SCREEN_WORKFLOW_ID,
                "configured": bool(SCREEN_WORKFLOW_ID),
            },
            "offer_email": {
                "id": OFFER_WORKFLOW_ID,
                "configured": bool(OFFER_WORKFLOW_ID),
            },
        },
        "error": errors[0] if errors else None,
    }


@app.post("/api/coze/bot/select")
async def select_bot(body: dict):
    space_id = body.get("space_id", "")
    bot_id = body.get("bot_id", "")
    if not space_id or not bot_id:
        return {"error": "space_id 和 bot_id 必填"}
    if space_id not in COZE_SPACES:
        return {"error": f"空间 {space_id} 不存在"}
    COZE_SPACES[space_id]["bot_id"] = bot_id
    return {"ok": True, "space_id": space_id, "bot_id": bot_id}
