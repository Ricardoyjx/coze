import asyncio
from datetime import datetime

from config import (
    COZE_SPACES,
    COZE_API_TOKEN,
    JD_WORKFLOW_ID,
    SCREEN_WORKFLOW_ID,
    OFFER_WORKFLOW_ID,
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
    coze = get_coze_client()
    if coze and OFFER_WORKFLOW_ID:
        try:
            for event in coze.workflows.runs.stream(
                workflow_id=OFFER_WORKFLOW_ID,
                parameters={
                    "input": {
                        "candidate_name": candidate_name,
                        "position": position,
                        "salary": salary,
                        "start_date": start_date,
                        "location": location,
                        "notes": notes,
                        "company_name": company_name,
                    }
                },
            ):
                if hasattr(event, "data") and event.data:
                    yield event.data
                elif hasattr(event, "content"):
                    yield event.content
            return
        except Exception as e:
            yield f"\n\n> ⚠️ Coze工作流调用失败: {str(e)}，使用模拟数据\n\n"

    company = company_name or "XXXX科技有限公司"
    mock_email = f"""**录用通知书**

**致：{candidate_name} 先生/女士**

---

感谢您参加 {company} 的面试，经过综合评估，我们非常高兴地通知您，您已被正式录用为 **{position}**。

### 录用详情

| 项目 | 内容 |
|------|------|
| **录用岗位** | {position} |
| **薪酬待遇** | {salary} |
| **报到日期** | {start_date} |
| **工作地点** | {location} |
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

            for event in coze.chat.stream(
                bot_id=bot_id,
                user_id="recruitment-agent",
                additional_messages=[
                    Message(role="user", content=prompt, content_type="text")
                ],
                auto_save_history=False,
            ):
                if hasattr(event, "message") and event.message:
                    if hasattr(event.message, "content") and event.message.content:
                        yield event.message.content
                elif hasattr(event, "content") and event.content:
                    yield event.content
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
