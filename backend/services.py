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

        client = Coze(auth=TokenAuth(token=api_key), base_url=COZE_CN_BASE_URL)
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
        except Exception as e:
            yield f"\n\n> Coze Bot 调用失败: {str(e)}\n\n"
    else:
        yield "> JD生成 Bot 未配置，请在 .env 中配置 JD_GENERATOR_API_KEY 和 JD_GENERATOR_BOT_ID\n"


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
        }

        if coze and bot_id and resume_text.strip():
            try:
                prompt = (
                    f"【岗位描述】\n{jd_content}\n\n"
                    f"【简历内容】\n{resume_text}\n\n"
                    "请根据岗位需求对该简历进行初筛评分，返回严格的JSON格式（不要markdown包裹），字段如下：\n"
                    '{"score": 0-100整数, "recommendation": "strong"或"moderate"或"weak", '
                    '"matchPoints": ["匹配点1", "匹配点2"], "missingPoints": ["缺失项1", "缺失项2"], '
                    '"summary": "综合评价"}'
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
