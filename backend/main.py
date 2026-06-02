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


class OfferEmailRequest(BaseModel):
    candidate_name: str
    position: str
    salary: str
    start_date: str
    location: str
    notes: Optional[str] = ""
    company_name: Optional[str] = ""


async def call_coze_offer_stream(req: OfferEmailRequest):
    """调用Coze工作流生成Offer邮件（流式输出），无配置时使用模拟数据"""
    coze = get_coze_client()
    OFFER_WORKFLOW_ID = os.getenv("COZE_OFFER_WORKFLOW_ID", "")

    if coze and OFFER_WORKFLOW_ID:
        try:
            for event in coze.workflows.runs.stream(
                workflow_id=OFFER_WORKFLOW_ID,
                parameters={"input": req.model_dump()},
            ):
                if hasattr(event, "data") and event.data:
                    yield event.data
                elif hasattr(event, "content"):
                    yield event.content
            return
        except Exception as e:
            yield f"\n\n> ⚠️ Coze工作流调用失败: {str(e)}，使用模拟数据\n\n"

    company = req.company_name or "XXXX科技有限公司"
    mock_email = f"""**录用通知书**

**致：{req.candidate_name} 先生/女士**

---

感谢您参加 {company} 的面试，经过综合评估，我们非常高兴地通知您，您已被正式录用为 **{req.position}**。

### 录用详情

| 项目 | 内容 |
|------|------|
| **录用岗位** | {req.position} |
| **薪酬待遇** | {req.salary} |
| **报到日期** | {req.start_date} |
| **工作地点** | {req.location} |
| **合同期限** | 首次签订三年（含试用期三个月） |

### 入职材料

请您在报到当日携带以下材料：

1. 身份证原件及复印件（2份）
2. 最高学历、学位证书原件及复印件
3. 离职证明原件
4. 近三个月内的体检报告
5. 一寸免冠照片（2张）
6. 银行卡复印件（用于工资发放）

### 薪酬福利说明

- **薪资结构**：基本工资 + 绩效奖金 + 年终奖
- **社会保险**：按国家规定缴纳五险一金
- **其他福利**：补充商业保险、带薪年假、节日福利、定期团建
- **试用期薪资**：按转正薪资的 80% 执行

### 确认方式

请您在收到本通知后 **3个工作日内** 通过邮件回复确认是否接受此录用邀请。如逾期未确认，本通知将自动失效。

如您对上述内容有任何疑问，欢迎随时与我们联系。

---
> 📝 *此Offer邮件由AI自动生成，请根据实际情况调整确认后发送。*
"""
    for char in mock_email:
        yield char
        await asyncio.sleep(0.02)


@app.post("/api/offer-email/generate")
async def generate_offer_email(req: OfferEmailRequest):
    """Offer邮件生成 - SSE流式返回"""
    return StreamingResponse(
        call_coze_offer_stream(req),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )


class SalaryAnalysisRequest(BaseModel):
    position: str
    city: str = ""
    experience: str = ""
    education: str = ""


@app.post("/api/salary/analyze")
async def analyze_salary(req: SalaryAnalysisRequest):
    """薪资分析 - 返回JSON数据"""
    position = req.position
    city = req.city or "全国"
    exp = req.experience or "3-5年"

    # 模拟薪资数据（按岗位关键词匹配）
    mock_data = {
        "position": position,
        "city": city,
        "experience": exp,
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

    # 根据岗位关键词调整数据
    pos_lower = position.lower()
    if any(kw in pos_lower for kw in ["java", "后端", "go", "python", "c++", "c#", "rust"]):
        mock_data["salaryRange"] = {"min": 18, "max": 50, "median": 28}
        mock_data["percentiles"] = {"p10": 15, "p25": 20, "p50": 28, "p75": 35, "p90": 45}
        mock_data["experienceLevels"] = [
            {"level": "1年以下", "salary": 12},
            {"level": "1-3年", "salary": 18},
            {"level": "3-5年", "salary": 25},
            {"level": "5-10年", "salary": 35},
            {"level": "10年以上", "salary": 45},
        ]
        mock_data["industryAvg"] = 28
        mock_data["recommendedRange"] = "25K - 38K"
    elif any(kw in pos_lower for kw in ["前端", "web", "react", "vue", "angular"]):
        mock_data["salaryRange"] = {"min": 15, "max": 42, "median": 24}
        mock_data["percentiles"] = {"p10": 12, "p25": 18, "p50": 24, "p75": 32, "p90": 38}
        mock_data["industryAvg"] = 24
        mock_data["recommendedRange"] = "20K - 32K"
    elif any(kw in pos_lower for kw in ["产品", "产品经理"]):
        mock_data["salaryRange"] = {"min": 15, "max": 45, "median": 25}
        mock_data["percentiles"] = {"p10": 12, "p25": 18, "p50": 25, "p75": 33, "p90": 40}
        mock_data["experienceLevels"] = [
            {"level": "1年以下", "salary": 10},
            {"level": "1-3年", "salary": 16},
            {"level": "3-5年", "salary": 22},
            {"level": "5-10年", "salary": 32},
            {"level": "10年以上", "salary": 42},
        ]
        mock_data["industryAvg"] = 25
        mock_data["recommendedRange"] = "22K - 35K"
    elif any(kw in pos_lower for kw in ["数据分析", "数据", "算法", "ai", "人工智能", "机器学习"]):
        mock_data["salaryRange"] = {"min": 20, "max": 55, "median": 30}
        mock_data["percentiles"] = {"p10": 16, "p25": 22, "p50": 30, "p75": 40, "p90": 50}
        mock_data["experienceLevels"] = [
            {"level": "1年以下", "salary": 14},
            {"level": "1-3年", "salary": 20},
            {"level": "3-5年", "salary": 28},
            {"level": "5-10年", "salary": 38},
            {"level": "10年以上", "salary": 50},
        ]
        mock_data["industryAvg"] = 30
        mock_data["recommendedRange"] = "28K - 42K"

    # 按城市调整
    city_map = {
        "北京": 1.15, "上海": 1.12, "深圳": 1.12, "广州": 1.05,
        "杭州": 1.08, "成都": 0.92, "南京": 0.95, "武汉": 0.90,
        "西安": 0.88, "长沙": 0.85, "重庆": 0.85, "苏州": 0.95,
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
        low, high = mock_data["recommendedRange"].replace("K", "").split(" - ")
        mock_data["recommendedRange"] = f"{round(int(low) * ratio)}K - {round(int(high) * ratio)}K"

    return mock_data


class BatchScreenRequest(BaseModel):
    jdContent: str
    resumeCount: int = 10
    threshold: int = 60


@app.post("/api/batch-screen")
async def batch_screen(req: BatchScreenRequest):
    """批量筛选 - 返回模拟的批量筛选结果"""
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
        results.append({
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
        })

    passed_count = sum(1 for r in results if r["passed"])
    return {
        "total": len(results),
        "threshold": req.threshold,
        "passedCount": passed_count,
        "failedCount": len(results) - passed_count,
        "avgScore": round(sum(r["score"] for r in results) / len(results)),
        "results": results,
    }


# ===================== 简历初筛（重写） =====================


@app.post("/api/resume/screening/run")
async def run_screening(req: ScreeningRequest):
    """简历初筛 - 上传简历后执行筛选，返回SSE流式结果"""
    task_id = str(uuid.uuid4())[:8]
    total = len(req.resumeIds)

    candidate_pool = [
        ("张三", "Java", ["Java", "Spring Boot", "微服务", "MySQL", "Redis", "Docker"], 6, "本科·北京大学", 92, "strong",
         ["6年Java开发经验", "精通Spring Boot微服务", "熟悉Docker容器化部署"],
         ["缺少大数据处理经验"],
         "候选人技术栈与岗位高度匹配，微服务经验丰富，强烈推荐面试。"),
        ("李四", "Java", ["Java", "Spring Cloud", "MySQL", "Kafka"], 4, "硕士·清华大学", 78, "moderate",
         ["硕士学历背景优秀", "熟悉Spring Cloud体系"],
         ["工作年限略短", "缺少Docker/K8s经验"],
         "候选人学历优秀，技术基础扎实，但微服务部署经验偏弱，建议考虑。"),
        ("王五", "Python", ["Python", "Django", "PostgreSQL"], 3, "本科·武汉大学", 35, "weak",
         ["有后端开发经验"],
         ["主要技术栈为Python非Java", "无微服务经验", "工作年限不足"],
         "候选人技术栈与岗位需求不匹配，主要使用Python而非Java，不推荐。"),
        ("赵六", "Java", ["Java", "Spring", "MyBatis", "RabbitMQ"], 5, "本科·华中科技", 72, "moderate",
         ["5年Java开发经验", "熟悉消息队列"],
         ["缺少微服务实战经验", "云原生经验不足"],
         "候选人Java基础扎实，但微服务和云原生经验偏弱，建议进一步沟通。"),
        ("钱七", "Go", ["Go", "Gin", "gRPC", "K8s", "Docker"], 7, "本科·浙江大学", 88, "strong",
         ["7年后端开发经验", "精通K8s和Docker", "微服务架构经验丰富"],
         ["主要技术栈为Go而非Java"],
         "候选人虽主用Go，但架构能力和云原生经验突出，值得考虑跨技术栈培养。"),
        ("孙八", "Java", ["Java", "Spring Boot", "MongoDB", "ES"], 3, "硕士·南京大学", 65, "moderate",
         ["硕士学历", "熟悉Spring Boot"],
         ["工作年限较短", "缺少微服务架构经验"],
         "候选人基础和学历不错，但经验尚浅，建议作为后备人选。"),
        ("周九", "C++", ["C++", "Qt", "STL", "Linux"], 8, "本科·哈工大", 45, "weak",
         ["8年C++开发经验", "Linux系统编程经验丰富"],
         ["主要技术栈为C++而非Java", "无微服务经验", "无Java生态经验"],
         "候选人技术栈与Java岗位严重不匹配，不推荐。"),
        ("吴十", "Java", ["Java", "Spring Cloud", "Nacos", "Sentinel", "MySQL"], 6, "本科·西安交大", 82, "strong",
         ["6年Java开发经验", "精通Spring Cloud体系", "有高并发经验"],
         ["学历背景一般"],
         "候选人Java技术栈扎实，微服务和高并发经验匹配度高，推荐面试。"),
        ("郑十一", "前端", ["React", "TypeScript", "Webpack", "Node.js"], 4, "本科·电子科大", 50, "weak",
         ["4年前端开发经验", "熟悉React生态"],
         ["技术栈为前端而非Java/后端", "缺少后端服务开发经验"],
         "候选人偏前端方向，与后端岗位JD不匹配，不推荐。"),
        ("冯十二", "Java", ["Java", "Spring", "Dubbo", "Zookeeper", "MyBatis"], 9, "本科·北京邮电", 90, "strong",
         ["9年Java开发经验", "精通Dubbo和分布式架构", "大厂背景"],
         ["对新兴技术栈了解较少"],
         "候选人Java经验深厚，分布式架构能力强，强烈推荐。"),
    ]

    async def event_generator():
        results = []
        for i in range(total):
            await asyncio.sleep(0.8)
            idx = i % len(candidate_pool)
            name, tech, skills, work_years, edu, score, rec, matches, misses, summary = candidate_pool[idx]
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
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )
