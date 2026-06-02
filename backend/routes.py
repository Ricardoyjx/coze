import json
import uuid
import asyncio
import os
from datetime import datetime

from fastapi import UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

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
    JDGenerateRequest,
    ScreeningRequest,
    OfferEmailRequest,
    SalaryAnalysisRequest,
    BatchScreenRequest,
)
from services import get_coze_client, jd_stream_generator, offer_stream_generator

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
    task_id = str(uuid.uuid4())[:8]
    total = len(req.resumeIds)
    candidate_pool = [
        (
            "张三",
            "Java",
            ["Java", "Spring Boot", "微服务", "MySQL", "Redis", "Docker"],
            6,
            "本科·北京大学",
            92,
            "strong",
            ["6年Java开发经验", "精通Spring Boot微服务", "熟悉Docker容器化部署"],
            ["缺少大数据处理经验"],
            "候选人技术栈与岗位高度匹配，微服务经验丰富，强烈推荐面试。",
        ),
        (
            "李四",
            "Java",
            ["Java", "Spring Cloud", "MySQL", "Kafka"],
            4,
            "硕士·清华大学",
            78,
            "moderate",
            ["硕士学历背景优秀", "熟悉Spring Cloud体系"],
            ["工作年限略短", "缺少Docker/K8s经验"],
            "候选人学历优秀，技术基础扎实，但微服务部署经验偏弱，建议考虑。",
        ),
        (
            "王五",
            "Python",
            ["Python", "Django", "PostgreSQL"],
            3,
            "本科·武汉大学",
            35,
            "weak",
            ["有后端开发经验"],
            ["主要技术栈为Python非Java", "无微服务经验", "工作年限不足"],
            "候选人技术栈与岗位需求不匹配，主要使用Python而非Java，不推荐。",
        ),
        (
            "赵六",
            "Java",
            ["Java", "Spring", "MyBatis", "RabbitMQ"],
            5,
            "本科·华中科技",
            72,
            "moderate",
            ["5年Java开发经验", "熟悉消息队列"],
            ["缺少微服务实战经验", "云原生经验不足"],
            "候选人Java基础扎实，但微服务和云原生经验偏弱，建议进一步沟通。",
        ),
        (
            "钱七",
            "Go",
            ["Go", "Gin", "gRPC", "K8s", "Docker"],
            7,
            "本科·浙江大学",
            88,
            "strong",
            ["7年后端开发经验", "精通K8s和Docker", "微服务架构经验丰富"],
            ["主要技术栈为Go而非Java"],
            "候选人虽主用Go，但架构能力和云原生经验突出，值得考虑跨技术栈培养。",
        ),
        (
            "孙八",
            "Java",
            ["Java", "Spring Boot", "MongoDB", "ES"],
            3,
            "硕士·南京大学",
            65,
            "moderate",
            ["硕士学历", "熟悉Spring Boot"],
            ["工作年限较短", "缺少微服务架构经验"],
            "候选人基础和学历不错，但经验尚浅，建议作为后备人选。",
        ),
        (
            "周九",
            "C++",
            ["C++", "Qt", "STL", "Linux"],
            8,
            "本科·哈工大",
            45,
            "weak",
            ["8年C++开发经验", "Linux系统编程经验丰富"],
            ["主要技术栈为C++而非Java", "无微服务经验", "无Java生态经验"],
            "候选人技术栈与Java岗位严重不匹配，不推荐。",
        ),
        (
            "吴十",
            "Java",
            ["Java", "Spring Cloud", "Nacos", "Sentinel", "MySQL"],
            6,
            "本科·西安交大",
            82,
            "strong",
            ["6年Java开发经验", "精通Spring Cloud体系", "有高并发经验"],
            ["学历背景一般"],
            "候选人Java技术栈扎实，微服务和高并发经验匹配度高，推荐面试。",
        ),
        (
            "郑十一",
            "前端",
            ["React", "TypeScript", "Webpack", "Node.js"],
            4,
            "本科·电子科大",
            50,
            "weak",
            ["4年前端开发经验", "熟悉React生态"],
            ["技术栈为前端而非Java/后端", "缺少后端服务开发经验"],
            "候选人偏前端方向，与后端岗位JD不匹配，不推荐。",
        ),
        (
            "冯十二",
            "Java",
            ["Java", "Spring", "Dubbo", "Zookeeper", "MyBatis"],
            9,
            "本科·北京邮电",
            90,
            "strong",
            ["9年Java开发经验", "精通Dubbo和分布式架构", "大厂背景"],
            ["对新兴技术栈了解较少"],
            "候选人Java经验深厚，分布式架构能力强，强烈推荐。",
        ),
    ]

    async def event_generator():
        results = []
        for i in range(total):
            await asyncio.sleep(0.8)
            idx = i % len(candidate_pool)
            (
                name,
                tech,
                skills,
                work_years,
                edu,
                score,
                rec,
                matches,
                misses,
                summary,
            ) = candidate_pool[idx]
            resume_id = req.resumeIds[i] if i < len(req.resumeIds) else f"auto_{i}"
            result_item = {
                "id": resume_id,
                "resume": {
                    "id": resume_id,
                    "filename": f"{name}_简历.pdf",
                    "name": name,
                    "phone": f"138{str(i+1).zfill(8)}",
                    "email": f"{name}@email.com",
                    "education": edu,
                    "workYears": work_years,
                    "skills": skills,
                    "experience": f"{work_years}年{tech}开发经验",
                    "uploadedAt": datetime.now().isoformat(),
                },
                "score": score,
                "matchPoints": matches,
                "missingPoints": misses,
                "recommendation": rec,
                "summary": summary,
            }
            results.append(result_item)
            progress_data = {
                "id": task_id,
                "status": "processing" if i < total - 1 else "completed",
                "totalResumes": total,
                "processedResumes": i + 1,
                "results": results,
                "createdAt": datetime.now().isoformat(),
            }
            yield f"data: {json.dumps(progress_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
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
