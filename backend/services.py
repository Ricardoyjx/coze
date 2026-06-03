from typing import AsyncGenerator
import asyncio
import json
from datetime import datetime

from config import (
    COZE_SPACES,
    COZE_API_TOKEN,
)

# ===================== Coze 客户端管理 =====================

_coze_clients: dict = {}


def get_coze_client(space_id: str = ""):
    if space_id and space_id in COZE_SPACES:
        cfg = COZE_SPACES[space_id]
    elif COZE_SPACES:
        space_id = next(iter(COZE_SPACES))
        cfg = COZE_SPACES[space_id]
    else:
        if not COZE_API_TOKEN:
            return None
        cfg = {"api_key": COZE_API_TOKEN}

    api_key = cfg.get("api_key", "")
    if not api_key:
        return None

    if space_id in _coze_clients:
        return _coze_clients[space_id]

    try:
        from cozepy import Coze, TokenAuth, COZE_CN_BASE_URL
        from cozepy.request import SyncHTTPClient

        client = Coze(
            auth=TokenAuth(token=api_key),
            base_url=COZE_CN_BASE_URL,
            http_client=SyncHTTPClient(timeout=30),
        )
        _coze_clients[space_id] = client
        return client
    except ImportError:
        return None


def get_all_coze_clients() -> dict:
    clients = {}
    for sid, cfg in COZE_SPACES.items():
        if cfg.get("api_key"):
            c = get_coze_client(sid)
            if c:
                clients[sid] = c
    return clients


# ===================== JD 生成（流式） =====================


async def jd_stream_generator(message: str):
    """Coze Bot 流式生成 JD，Bot 未配置时返回错误提示。"""
    try:
        coze = get_coze_client("jd_generator")
        bot_id = COZE_SPACES.get("jd_generator", {}).get("bot_id", "")

        if coze and bot_id:
            try:
                prompt = f"请根据以下要求生成一份专业的招聘JD：{message}"
                from cozepy.chat import Message, ChatEventType

                for event in coze.chat.stream(
                    bot_id=bot_id,
                    user_id="recruitment-agent",
                    additional_messages=[
                        Message(role="user", content=prompt, content_type="text")
                    ],
                    auto_save_history=False,
                ):
                    if event.event != ChatEventType.CONVERSATION_MESSAGE_DELTA:
                        continue
                    if hasattr(event, "message") and event.message:
                        if hasattr(event.message, "content") and event.message.content:
                            yield event.message.content
                return
            except GeneratorExit:
                return  # 客户端断开连接，正常退出
            except Exception as e:
                yield f"\n\n> Coze Bot 调用失败: {str(e)}\n\n"
        else:
            yield "> JD生成 Bot 未配置，请在 .env 中配置 JD_GENERATOR_API_KEY 和 JD_GENERATOR_BOT_ID\n"
    except GeneratorExit:
        return  # 最外层也捕获 GeneratorExit
    except Exception as e:
        # 兜底：防止未捕获的异常导致 ASGI 崩溃
        try:
            yield f"\n\n> 生成异常: {str(e)}\n\n"
        except GeneratorExit:
            pass


# ===================== Offer 邮件（流式） =====================


async def offer_stream_generator(
    candidate_name: str,
    position: str,
    salary: str,
    start_date: str,
    location: str,
    notes: str,
    company_name: str,
):
    """Coze Bot 流式生成 Offer 邮件。"""
    coze = get_coze_client("offer_email")
    bot_id = COZE_SPACES.get("offer_email", {}).get("bot_id", "")

    if coze and bot_id:
        try:
            prompt = (
                f"请生成一份正式的Offer录用通知书。\n"
                f"候选人：{candidate_name}\n"
                f"录用岗位：{position}\n"
                f"薪资待遇：{salary}\n"
                f"报到日期：{start_date}\n"
                f"工作地点：{location}\n"
                f"公司名称：{company_name or '我司'}\n"
            )
            if notes:
                prompt += f"备注：{notes}\n"

            from cozepy.chat import Message, ChatEventType

            for event in coze.chat.stream(
                bot_id=bot_id,
                user_id="recruitment-agent",
                additional_messages=[
                    Message(role="user", content=prompt, content_type="text")
                ],
                auto_save_history=False,
            ):
                if event.event != ChatEventType.CONVERSATION_MESSAGE_DELTA:
                    continue
                if hasattr(event, "message") and event.message:
                    if hasattr(event.message, "content") and event.message.content:
                        yield event.message.content
            return
        except Exception as e:
            yield f"\n\n> Coze Bot 调用失败: {str(e)}，使用模拟数据\n\n"
    else:
        pass  # 走下面的模拟数据

    company = company_name or "XXXX科技有限公司"
    mock_email = (
        f"**录用通知书**\n\n"
        f"**致：{candidate_name} 先生/女士**\n\n"
        f"---\n\n"
        f"感谢您参加 {company} 的面试，经过综合评估，"
        f"我们非常高兴地通知您，您已被正式录用为 **{position}**。\n\n"
        f"### 录用详情\n\n"
        f"| 项目 | 内容 |\n"
        f"|------|------|\n"
        f"| **录用岗位** | {position} |\n"
        f"| **薪酬待遇** | {salary} |\n"
        f"| **报到日期** | {start_date} |\n"
        f"| **工作地点** | {location} |\n"
        f"| **合同期限** | 首次签订三年（含试用期三个月） |\n\n"
        f"### 入职材料\n\n"
        f"请您在报到当日携带以下材料：\n\n"
        f"1. 身份证原件及复印件（2份）\n"
        f"2. 最高学历、学位证书原件及复印件\n"
        f"3. 离职证明原件\n"
        f"4. 近三个月内的体检报告\n"
        f"5. 一寸免冠照片（2张）\n"
        f"6. 银行卡复印件（用于工资发放）\n\n"
        f"### 薪酬福利说明\n\n"
        f"- **薪资结构**：基本工资 + 绩效奖金 + 年终奖\n"
        f"- **社会保险**：按国家规定缴纳五险一金\n"
        f"- **其他福利**：补充商业保险、带薪年假、节日福利、定期团建\n"
        f"- **试用期薪资**：按转正薪资的 80% 执行\n\n"
        f"### 确认方式\n\n"
        f"请您在收到本通知后 **3个工作日内** 通过邮件回复确认是否接受此录用邀请。"
        f"如逾期未确认，本通知将自动失效。\n\n"
        f"如您对上述内容有任何疑问，欢迎随时与我们联系。\n\n"
        f"---\n"
        f"> 此Offer邮件由AI自动生成，请根据实际情况调整确认后发送。\n"
    )
    for char in mock_email:
        yield char
        await asyncio.sleep(0.02)


# ===================== 面试题生成（流式） =====================


async def interview_questions_generator(
    position: str,
    jd_content: str = "",
    count: int = 5,
    difficulty: str = "medium",
    types: list[str] | None = None,
):
    if types is None:
        types = ["technical", "behavioral"]

    coze = get_coze_client("interview_questions")
    bot_id = COZE_SPACES.get("interview_questions", {}).get("bot_id", "")

    if coze and bot_id:
        try:
            diff_map = {"easy": "简单", "medium": "中等", "hard": "困难"}
            prompt = f"岗位: {position}\n"
            if jd_content:
                prompt += f"岗位描述: {jd_content}\n"
            type_str = "、".join(types)
            diff_str = diff_map.get(difficulty, "中等")
            prompt += (
                f"\n请为该岗位生成{count}道{diff_str}难度的面试题，"
                f"包含{type_str}类型。每道题请给出题目、考察点和参考答案。"
            )
            from cozepy.chat import Message
            from cozepy.chat import ChatEventType

            for event in coze.chat.stream(
                bot_id=bot_id,
                user_id="recruitment-agent",
                additional_messages=[
                    Message(role="user", content=prompt, content_type="text")
                ],
                auto_save_history=False,
            ):
                # 只处理增量事件，跳过 completed 等完整内容事件避免重复
                if event.event != ChatEventType.CONVERSATION_MESSAGE_DELTA:
                    continue
                if hasattr(event, "message") and event.message:
                    if hasattr(event.message, "content") and event.message.content:
                        yield event.message.content
            return
        except Exception as e:
            yield f"\n\n> Coze调用失败: {str(e)}，使用模拟数据\n\n"

    diff_label = {"easy": "简单", "medium": "中等", "hard": "困难"}.get(
        difficulty, "中等"
    )
    type_label = "、".join(types)
    mock_data = (
        f"## 面试题 - {position}\n"
        f"> 难度: {diff_label} | 数量: {count} 题 | 类型: {type_label}\n"
        f"\n"
        f"### 一、技术题\n"
        f"\n---\n"
        f"\n**题目 1：** 请解释您对该岗位核心技术的理解，以及相关项目的实践经验。\n"
        f"\n- **考察点：** 技术深度、项目经验、系统设计能力\n"
        f"- **参考答案：** 候选人应能清晰阐述核心技术原理，并结合实际项目说明应用场景和解决的问题。\n"
        f"\n---\n"
        f"\n**题目 2：** 请描述您参与过的最有挑战性的一个技术项目，您在其中的角色和贡献。\n"
        f"\n- **考察点：** 项目经验、问题解决能力、团队协作\n"
        f"- **参考答案：** 候选人应能具体描述项目背景、技术难点、个人贡献和最终成果。\n"
        f"\n---\n"
        f"\n**题目 3：** 如何处理系统性能瓶颈？请结合具体工具和方法说明。\n"
        f"\n- **考察点：** 性能优化经验、工具使用能力\n"
        f"- **参考答案：** 应涵盖性能分析工具、常见优化策略（缓存、索引、异步等）和实际案例。\n"
        f"\n---\n"
        f"\n### 二、行为题\n"
        f"\n---\n"
        f"\n**题目 4：** 请举例说明您如何处理与团队成员在技术方案上的分歧。\n"
        f"\n- **考察点：** 沟通能力、冲突解决、团队合作\n"
        f"- **参考答案：** 应展示理性讨论、数据驱动决策、尊重他人意见的态度。\n"
        f"\n---\n"
        f"\n**题目 5：** 您如何进行技术学习和自我提升？请分享您的学习方法。\n"
        f"\n- **考察点：** 学习能力、自驱力、技术热情\n"
        f"- **参考答案：** 应展示持续学习的习惯，如阅读源码、参与开源、技术博客等。\n"
        f"\n---\n"
        f"\n> 📝 *此面试题由AI自动生成，仅供参考。建议根据实际业务场景调整。*\n"
    )

    for char in mock_data:
        yield char
        await asyncio.sleep(0.02)


# ===================== 简历初筛 =====================


async def resume_screening_generator(
    jd_content: str,
    resume_items: list[dict],
) -> AsyncGenerator[dict, None]:
    """调用 Coze Bot 对每份简历进行初筛评分，流式返回结果。"""
    coze = get_coze_client("resume_screening")
    bot_id = COZE_SPACES.get("resume_screening", {}).get("bot_id", "")

    from cozepy.chat import Message, ChatEventType

    total = len(resume_items)
    if total == 0:
        yield "data: " + json.dumps({
            "id": "empty",
            "status": "completed",
            "totalResumes": 0,
            "processedResumes": 0,
            "results": [],
            "createdAt": datetime.now().isoformat(),
        }) + "\n\n"
        return

    results = []
    import time as _time
    _start_all = _time.time()
    print(f"[SCREEN] 开始初筛，共 {total} 份简历")
    # 发送初始连接确认
    yield "data: " + json.dumps({
        "id": "init",
        "status": "processing",
        "totalResumes": total,
        "processedResumes": 0,
        "results": [],
        "createdAt": datetime.now().isoformat(),
    }) + "\n\n"

    for idx, item in enumerate(resume_items):
        resume_id = item.get("id", f"resume_{idx}")
        resume_text = item.get("raw_text", "")
        filename = item.get("filename", "unknown")

        result_item = {
            "id": resume_id,
            "resume": {
                "id": resume_id,
                "filename": filename,
                "name": item.get("name", ""),
                "phone": item.get("phone", ""),
                "email": item.get("email", ""),
                "education": item.get("education", ""),
                "workYears": item.get("workYears", 0),
                "skills": item.get("skills", []),
                "experience": item.get("experience", ""),
                "uploadedAt": item.get("uploadedAt", ""),
            },
            "score": 0,
            "matchPoints": [],
            "missingPoints": [],
            "recommendation": "moderate",
            "summary": "",
            "integrityIssues": [],
            "integrityScore": 100,
            "timelineConsistent": True,
        }

        _start_one = _time.time()
        print(f"[SCREEN] 第 {idx+1}/{total} 份简历开始分析...")
        if coze and bot_id and resume_text.strip():
            try:
                prompt = (
                    f"【岗位描述】\n{jd_content}\n\n"
                    f"【简历内容】\n{resume_text}\n\n"
                    "请根据岗位需求对该简历进行初筛评分，并核查简历真实性，返回严格的JSON格式（不要markdown包裹），字段如下：\n"
                    '{"score": 0-100整数, "recommendation": "strong"或"moderate"或"weak", '
                    '"matchPoints": ["匹配点1", "匹配点2"], "missingPoints": ["缺失项1", "缺失项2"], '
                    '"summary": "综合评价", '
                    '"integrityIssues": ["发现的造假或不合理之处1", "发现的造假或不合理之处2"], '
                    '"integrityScore": 0-100整数（简历可信度评分）, '
                    '"timelineConsistent": true或false（毕业年份与工作经历年限是否匹配）}\n'
                    "\n特别注意核查以下内容：\n"
                    "1. 毕业年份与工作年限是否匹配（如2020年毕业但声称5年经验则不合理）\n"
                    "2. 工作经历时间线是否有重叠或空白\n"
                    "3. 公司名称、职位、薪资等是否合理\n"
                    "4. 技能描述与工作年限是否匹配（如声称精通但年限很短）\n"
                    "5. 学历与岗位要求是否匹配"
                )
                accumulated = ""
                for event in coze.chat.stream(
                    bot_id=bot_id,
                    user_id="recruitment-agent",
                    additional_messages=[
                        Message(role="user", content=prompt, content_type="text")
                    ],
                    auto_save_history=False,
                ):
                    if event.event != ChatEventType.CONVERSATION_MESSAGE_DELTA:
                        continue
                    if hasattr(event, "message") and event.message:
                        if hasattr(event.message, "content") and event.message.content:
                            accumulated += event.message.content

                import json as _json

                bot_result = _json.loads(accumulated)
                result_item["score"] = bot_result.get("score", 60)
                result_item["recommendation"] = bot_result.get(
                    "recommendation", "moderate"
                )
                result_item["matchPoints"] = bot_result.get("matchPoints", [])
                result_item["missingPoints"] = bot_result.get("missingPoints", [])
                result_item["summary"] = bot_result.get("summary", "")
                result_item["integrityIssues"] = bot_result.get("integrityIssues", [])
                result_item["integrityScore"] = bot_result.get("integrityScore", 100)
                result_item["timelineConsistent"] = bot_result.get("timelineConsistent", True)

                if result_item["resume"]["name"] == "":
                    result_item["resume"]["name"] = bot_result.get(
                        "candidate_name", f"候选人{idx+1}"
                    )

            except Exception as e:
                result_item["score"] = 50
                result_item["recommendation"] = "moderate"
                result_item["summary"] = f"AI分析异常: {str(e)}"

        elif not resume_text.strip():
            result_item["score"] = 0
            result_item["recommendation"] = "weak"
            result_item["summary"] = "简历内容为空，无法分析"

        _elapsed = _time.time() - _start_one
        print(f"[SCREEN] 第 {idx+1}/{total} 份简历完成，耗时 {_elapsed:.1f}s")
        results.append(result_item)
        progress = {
            "id": f"task_{idx}",
            "status": "completed" if idx >= total - 1 else "processing",
            "totalResumes": total,
            "processedResumes": idx + 1,
            "results": results,
            "createdAt": datetime.now().isoformat(),
        }
        yield "data: " + json.dumps(progress) + "\n\n"
        await asyncio.sleep(0.1)
    _total_elapsed = _time.time() - _start_all
    print(f"[SCREEN] 全部完成，总耗时 {_total_elapsed:.1f}s")



def _build_mock_salary_data(
    position: str,
    city: str = "",
    experience: str = "3-5年",
    education: str = "本科",
) -> dict:
    """Coze Bot 不可用时的本地兜底数据。"""
    import json as _json

    mock_data = {
        "position": position,
        "city": city or "全国",
        "experience": experience,
        "education": education,
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
        mock_data["percentiles"] = {"p10": 15, "p25": 20, "p50": 28, "p75": 35, "p90": 45}
        mock_data["industryAvg"] = 28
        mock_data["recommendedRange"] = "25K - 38K"
    elif any(kw in pl for kw in ["前端", "web", "react", "vue", "angular"]):
        mock_data["salaryRange"] = {"min": 15, "max": 42, "median": 24}
        mock_data["percentiles"] = {"p10": 12, "p25": 18, "p50": 24, "p75": 32, "p90": 38}
        mock_data["industryAvg"] = 24
        mock_data["recommendedRange"] = "20K - 32K"
    elif any(kw in pl for kw in ["产品", "产品经理"]):
        mock_data["salaryRange"] = {"min": 15, "max": 45, "median": 25}
        mock_data["percentiles"] = {"p10": 12, "p25": 18, "p50": 25, "p75": 33, "p90": 40}
        mock_data["industryAvg"] = 25
        mock_data["recommendedRange"] = "22K - 35K"
    elif any(kw in pl for kw in ["数据分析", "数据", "算法", "ai", "人工智能", "机器学习"]):
        mock_data["salaryRange"] = {"min": 20, "max": 55, "median": 30}
        mock_data["percentiles"] = {"p10": 16, "p25": 22, "p50": 30, "p75": 40, "p90": 50}
        mock_data["industryAvg"] = 30
        mock_data["recommendedRange"] = "28K - 42K"

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
        for item in mock_data["experienceLevels"]:
            item["salary"] = round(item["salary"] * ratio)
        for item in mock_data["educationImpact"]:
            item["salary"] = round(item["salary"] * ratio)
        lo, hi = mock_data["recommendedRange"].replace("K", "").split(" - ")
        mock_data["recommendedRange"] = (
            f"{round(int(lo) * ratio)}K - {round(int(hi) * ratio)}K"
        )

    return mock_data




# ===================== 简历审查 =====================


async def batch_screening_generator(
    jd_content: str,
    resume_items: list[dict],
    threshold: int = 60,
) -> AsyncGenerator[str, None]:
    """调用 Coze Bot 对每份简历进行审查评分，SSE 流式返回进度和结果。"""
    coze = get_coze_client("batch_screening")
    bot_id = COZE_SPACES.get("batch_screening", {}).get("bot_id", "")

    total = len(resume_items)
    results = []

    if total == 0:
        yield "data: " + json.dumps({
            "status": "completed", "totalResumes": 0,
            "processedResumes": 0, "results": [],
        }, ensure_ascii=False) + "\n\n"
        return

    # 初始确认
    yield "data: " + json.dumps({
        "status": "processing", "totalResumes": total,
        "processedResumes": 0, "results": [],
    }, ensure_ascii=False) + "\n\n"

    for idx, item in enumerate(resume_items):
        resume_id = item.get("id", f"resume_{idx}")
        resume_text = item.get("raw_text", "")
        filename = item.get("filename", "unknown")

        result_item = {
            "id": resume_id,
            "name": item.get("name", ""),
            "filename": filename,
            "mainTech": "",
            "skills": "",
            "score": 0,
            "recommendation": "moderate",
            "passed": False,
            "education": item.get("education", ""),
            "workYears": item.get("workYears", 0),
            "integrityIssues": [],
            "integrityScore": 100,
            "timelineConsistent": True,
        }

        if coze and bot_id and resume_text.strip():
            try:
                prompt = (
                    f"【岗位描述】\n{jd_content}\n\n"
                    f"【简历内容】\n{resume_text}\n\n"
                    "请根据岗位需求对该简历进行审查评分并核查真实性，返回严格的JSON格式（不要markdown包裹），字段如下：\n"
                    '{"score": 0-100整数, "recommendation": "strong"或"moderate"或"weak", '
                    '"mainTech": "候选人主技术栈", "skills": "技能列表，逗号分隔", '
                    '"education": "学历", "workYears": 工作年限整数, '
                    '"name": "候选人姓名", '
                    '"integrityIssues": ["发现的造假或不合理之处"], '
                    '"integrityScore": 0-100整数（简历可信度）, '
                    '"timelineConsistent": true或false}\n'
                    "\n核查要点：毕业年份与工作年限是否匹配、工作时间线是否有重叠或空白、技能与年限是否匹配。"
                )

                import json as _json
                accumulated = ""
                for event in coze.chat.stream(
                    bot_id=bot_id,
                    user_id="recruitment-agent",
                    additional_messages=[
                        Message(role="user", content=prompt, content_type="text")
                    ],
                    auto_save_history=False,
                ):
                    if event.event != ChatEventType.CONVERSATION_MESSAGE_DELTA:
                        continue
                    if hasattr(event, "message") and event.message:
                        if hasattr(event.message, "content") and event.message.content:
                            accumulated += event.message.content

                cleaned = accumulated.strip()
                if cleaned.startswith("```"):
                    lines = cleaned.split("\n")
                    lines = [l for l in lines if not l.strip().startswith("```")]
                    cleaned = "\n".join(lines)

                bot_result = _json.loads(cleaned)
                result_item["score"] = bot_result.get("score", 50)
                result_item["recommendation"] = bot_result.get("recommendation", "moderate")
                result_item["mainTech"] = bot_result.get("mainTech", "")
                result_item["skills"] = bot_result.get("skills", "")
                result_item["education"] = bot_result.get("education", result_item["education"])
                result_item["workYears"] = bot_result.get("workYears", result_item["workYears"])
                result_item["name"] = bot_result.get("name", result_item["name"] or f"候选人{idx+1}")
                result_item["integrityIssues"] = bot_result.get("integrityIssues", [])
                result_item["integrityScore"] = bot_result.get("integrityScore", 100)
                result_item["timelineConsistent"] = bot_result.get("timelineConsistent", True)

            except Exception as e:
                result_item["score"] = 50
                result_item["recommendation"] = "moderate"
                result_item["mainTech"] = "解析失败"
                result_item["skills"] = str(e)[:100]

        elif not resume_text.strip():
            result_item["score"] = 0
            result_item["recommendation"] = "weak"
            result_item["mainTech"] = "无法解析"
            result_item["skills"] = "简历内容为空"

        result_item["passed"] = result_item["score"] >= threshold
        if not result_item["name"]:
            result_item["name"] = f"候选人{idx+1}"
        results.append(result_item)

        # 流式返回当前进度
        progress = {
            "status": "completed" if idx >= total - 1 else "processing",
            "totalResumes": total,
            "processedResumes": idx + 1,
            "results": results,
        }
        yield "data: " + json.dumps(progress, ensure_ascii=False) + "\n\n"
        await asyncio.sleep(0.1)

    passed_count = sum(1 for r in results if r["passed"])
    avg_score = round(sum(r["score"] for r in results) / len(results)) if results else 0

    final_result = {
        "status": "completed",
        "total": len(results),
        "threshold": threshold,
        "passedCount": passed_count,
        "failedCount": len(results) - passed_count,
        "avgScore": avg_score,
        "results": results,
    }

    yield "data: " + json.dumps(final_result, ensure_ascii=False) + "\n\n"


# ===================== 薪资分析 =====================


async def salary_analysis_generator(
    position: str,
    city: str = "",
    experience: str = "3-5年",
    education: str = "本科",
) -> AsyncGenerator[str, None]:
    """调用 Coze Bot 分析薪资并流式返回 JSON 结果。"""
    coze = get_coze_client("salary_analysis")
    bot_id = COZE_SPACES.get("salary_analysis", {}).get("bot_id", "")

    if coze and bot_id:
        try:
            prompt = (
                f"请对以下岗位进行薪资分析，返回严格的JSON格式（不要markdown包裹），字段如下：\n"
                f"{{\n"
                f'  "position": "岗位名称",\n'
                f'  "city": "城市",\n'
                f'  "experience": "工作经验",\n'
                f'  "education": "学历",\n'
                f'  "salaryRange": {{"min": 最低薪资K, "max": 最高薪资K, "median": 中位数K}},\n'
                f'  "percentiles": {{"p10": P10薪资K, "p25": P25薪资K, "p50": P50薪资K, "p75": P75薪资K, "p90": P90薪资K}},\n'
                f'  "industryAvg": 行业平均薪资K,\n'
                f'  "cityAvg": 城市平均薪资K,\n'
                f'  "experienceLevels": [\n'
                f'    {{"level": "1年以下", "salary": 对应薪资K}},\n'
                f'    {{"level": "1-3年", "salary": 对应薪资K}},\n'
                f'    {{"level": "3-5年", "salary": 对应薪资K}},\n'
                f'    {{"level": "5-10年", "salary": 对应薪资K}},\n'
                f'    {{"level": "10年以上", "salary": 对应薪资K}}\n'
                f'  ],\n'
                f'  "educationImpact": [\n'
                f'    {{"level": "大专", "salary": 对应薪资K}},\n'
                f'    {{"level": "本科", "salary": 对应薪资K}},\n'
                f'    {{"level": "硕士", "salary": 对应薪资K}},\n'
                f'    {{"level": "博士", "salary": 对应薪资K}}\n'
                f'  ],\n'
                f'  "recommendedRange": "建议薪资范围如 22K - 32K",\n'
                f'  "confidence": "高/中/低"\n'
                f"}}\n\n"
                f"岗位名称：{position}\n"
                f"所在城市：{city or '全国'}\n"
                f"工作经验：{experience}\n"
                f"学历要求：{education}\n\n"
                f"请基于中国IT行业2024-2025年市场数据，给出合理真实的薪资分析结果。"
            )

            from cozepy.chat import Message, ChatEventType

            accumulated = ""
            for event in coze.chat.stream(
                bot_id=bot_id,
                user_id="recruitment-agent",
                additional_messages=[
                    Message(role="user", content=prompt, content_type="text")
                ],
                auto_save_history=False,
            ):
                if event.event != ChatEventType.CONVERSATION_MESSAGE_DELTA:
                    continue
                if hasattr(event, "message") and event.message:
                    if hasattr(event.message, "content") and event.message.content:
                        accumulated += event.message.content

            # Strip markdown code blocks if present
            import json as _json
            cleaned = accumulated.strip()
            if cleaned.startswith("```"):
                # Remove first and last lines (```json and ```)
                lines = cleaned.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                cleaned = "\n".join(lines)
            bot_result = _json.loads(cleaned)

            # Normalize: ensure all required fields exist
            result = {
                "position": bot_result.get("position", position),
                "city": bot_result.get("city", city or "全国"),
                "experience": bot_result.get("experience", experience),
                "education": bot_result.get("education", education),
                "salaryRange": bot_result.get("salaryRange", {"min": 15, "max": 45, "median": 25}),
                "percentiles": bot_result.get("percentiles", {"p10": 12, "p25": 18, "p50": 25, "p75": 32, "p90": 40}),
                "industryAvg": bot_result.get("industryAvg", 25),
                "cityAvg": bot_result.get("cityAvg", 24),
                "experienceLevels": bot_result.get("experienceLevels", []),
                "educationImpact": bot_result.get("educationImpact", []),
                "recommendedRange": bot_result.get("recommendedRange", "20K - 30K"),
                "confidence": bot_result.get("confidence", "中"),
            }

            yield _json.dumps(result, ensure_ascii=False)
            return

        except Exception as e:
            yield _json.dumps({"error": f"Coze Bot 调用失败: {str(e)}"})
            return

    # Fallback: mock data when bot is not configured
    yield _json.dumps(_build_mock_salary_data(position, city, experience, education), ensure_ascii=False)
