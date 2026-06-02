import json
import uuid
import asyncio
import os
from datetime import datetime

from fastapi import UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, Response

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
    position = req.position
    city = req.city or "全国"

    mock_data = {
        "position": position,
        "city": city,
        "experience": req.experience or "3-5年",
        "education": req.education or "本科",
        "salaryRange": {"min": 15, "max": 45, "median": 25},
        "percentiles": {"p10": 12, "p25": 18, "p50": 25, "p75": 32, "p90": 40},
        "industryAvg": 26,
        "cityAvg": 24,
        "experienceLevels": [
            {"level": "1年以下", "salary": 10},
            {"level": "1-3年", "salary": 16},
            {"level": "3-5年", "salary": 22},
            {"level": "5-10年", "salary": 30},
            {"level": "10年以上", "salary": 40},
        ],
        "educationImpact": [
            {"level": "大专", "salary": 18},
            {"level": "本科", "salary": 25},
            {"level": "硕士", "salary": 32},
            {"level": "博士", "salary": 40},
        ],
        "recommendedRange": "22K - 32K",
        "confidence": "高",
    }

    pl = position.lower()
    if any(kw in pl for kw in ["java", "后端", "go", "python", "c++", "c#", "rust"]):
        mock_data["salaryRange"] = {"min": 18, "max": 50, "median": 28}
        mock_data["percentiles"] = {
            "p10": 15,
            "p25": 20,
            "p50": 28,
            "p75": 35,
            "p90": 45,
        }
        mock_data["industryAvg"] = 28
        mock_data["recommendedRange"] = "25K - 38K"
    elif any(kw in pl for kw in ["前端", "web", "react", "vue", "angular"]):
        mock_data["salaryRange"] = {"min": 15, "max": 42, "median": 24}
        mock_data["percentiles"] = {
            "p10": 12,
            "p25": 18,
            "p50": 24,
            "p75": 32,
            "p90": 38,
        }
        mock_data["industryAvg"] = 24
        mock_data["recommendedRange"] = "20K - 32K"
    elif any(kw in pl for kw in ["产品", "产品经理"]):
        mock_data["salaryRange"] = {"min": 15, "max": 45, "median": 25}
        mock_data["percentiles"] = {
            "p10": 12,
            "p25": 18,
            "p50": 25,
            "p75": 33,
            "p90": 40,
        }
        mock_data["industryAvg"] = 25
        mock_data["recommendedRange"] = "22K - 35K"
    elif any(
        kw in pl for kw in ["数据分析", "数据", "算法", "ai", "人工智能", "机器学习"]
    ):
        mock_data["salaryRange"] = {"min": 20, "max": 55, "median": 30}
        mock_data["percentiles"] = {
            "p10": 16,
            "p25": 22,
            "p50": 30,
            "p75": 40,
            "p90": 50,
        }
        mock_data["industryAvg"] = 30
        mock_data["recommendedRange"] = "28K - 42K"

    city_map = {
        "北京": 1.15,
        "上海": 1.12,
        "深圳": 1.12,
        "广州": 1.05,
        "杭州": 1.08,
        "成都": 0.92,
        "南京": 0.95,
        "武汉": 0.90,
        "西安": 0.88,
        "长沙": 0.85,
        "重庆": 0.85,
        "苏州": 0.95,
    }
    ratio = city_map.get(city, 1.0)
    if ratio != 1.0:
        for key in ["salaryRange", "percentiles"]:
            for k in mock_data[key]:
                mock_data[key][k] = round(mock_data[key][k] * ratio)
        mock_data["industryAvg"] = round(mock_data["industryAvg"] * ratio)
        mock_data["cityAvg"] = round(25 * ratio)
        for arr_key in ["experienceLevels", "educationImpact"]:
            for item in mock_data[arr_key]:
                item["salary"] = round(item["salary"] * ratio)
        lo, hi = mock_data["recommendedRange"].replace("K", "").split(" - ")
        mock_data["recommendedRange"] = (
            f"{round(int(lo) * ratio)}K - {round(int(hi) * ratio)}K"
        )

    return mock_data


# ===================== 批量筛选 =====================


@app.post("/api/batch-screen")
async def batch_screen(req: BatchScreenRequest):
    await asyncio.sleep(2)
    names_pool = [
        ("张三", "Java", "Spring Boot, MySQL, Redis", 92, "strong"),
        ("李四", "Java", "Spring Cloud, Kafka, Docker", 85, "strong"),
        ("王五", "Python", "Django, PostgreSQL, Flask", 65, "moderate"),
        ("赵六", "Java", "Spring, MyBatis, RabbitMQ", 78, "moderate"),
        ("钱七", "Go", "Gin, gRPC, K8s, Docker", 88, "strong"),
        ("孙八", "Java", "Spring Boot, MongoDB, ES", 72, "moderate"),
        ("周九", "C++", "Qt, Boost, STL, Linux", 55, "weak"),
        ("吴十", "Java", "Spring Cloud, Nacos, Sentinel", 82, "strong"),
        ("郑十一", "前端", "React, TypeScript, Webpack", 45, "weak"),
        ("冯十二", "Java", "Spring, Dubbo, Zookeeper", 90, "strong"),
        ("陈十三", "Python", "FastAPI, SQLAlchemy, Celery", 68, "moderate"),
        ("褚十四", "Java", "Spring Boot, JPA, Thymeleaf", 60, "moderate"),
        ("卫十五", "Go", "Beego, MySQL, Redis, MQ", 75, "moderate"),
        ("蒋十六", "Java", "Spring Cloud, Docker, K8s", 95, "strong"),
        ("沈十七", "前端", "Vue, Pinia, Vite, Uniapp", 58, "weak"),
        ("韩十八", "Java", "Spring, MyBatis-Plus, OSS", 70, "moderate"),
        ("杨十九", "大数据", "Hadoop, Spark, Flink, Hive", 80, "strong"),
        ("朱二十", "Java", "Spring Boot, Redis, MQ, ES", 76, "moderate"),
    ]
    count = min(req.resumeCount, len(names_pool))
    selected = names_pool[:count]
    results = []
    for i, (name, tech, skills_str, score, rec) in enumerate(selected, 1):
        passed = score >= req.threshold
        results.append(
            {
                "id": f"batch_{i}",
                "name": name,
                "filename": f"{name}_简历.pdf",
                "mainTech": tech,
                "skills": skills_str,
                "score": score,
                "recommendation": rec,
                "passed": passed,
                "education": "本科",
                "workYears": 3 + (i % 5),
            }
        )
    passed_count = sum(1 for r in results if r["passed"])
    return {
        "total": len(results),
        "threshold": req.threshold,
        "passedCount": passed_count,
        "failedCount": len(results) - passed_count,
        "avgScore": round(sum(r["score"] for r in results) / len(results)),
        "results": results,
    }


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
    rd = uploaded_resumes.get(resume_id)
    if not rd:
        raise HTTPException(status_code=404, detail="简历不存在")
    if not rd.file_bytes:
        raise HTTPException(status_code=404, detail="文件内容已过期")
    filename = rd.filename or "resume.pdf"
    media_type = "application/octet-stream"
    if filename.lower().endswith(".pdf"):
        media_type = "application/pdf"
    elif filename.lower().endswith((".doc", ".docx")):
        media_type = "application/msword"
    return Response(
        content=rd.file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ===================== 面试题 =====================


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
