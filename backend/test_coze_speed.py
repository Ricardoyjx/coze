"""
Coze API 响应速度测试 — 使用与实际业务一致的 prompt
用法: cd backend && ../.venv/bin/python test_coze_speed.py
"""
import time, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from config import COZE_SPACES
from services import get_coze_client
from cozepy.chat import Message, ChatEventType


def measure(bot_key, prompt, expect_json=False):
    """调用 Coze Bot 并计时，返回 (耗秒, 响应文本, 解析结果或None)"""
    cfg = COZE_SPACES.get(bot_key, {})
    bot_id = cfg.get("bot_id", "")
    api_key = cfg.get("api_key", "")
    name = cfg.get("name", bot_key)

    if not api_key or not bot_id:
        print(f"[{name}] 未配置，跳过\n")
        return None

    client = get_coze_client(bot_key)
    if not client:
        print(f"[{name}] 客户端创建失败\n")
        return None

    print(f"[{name}] bot_id={bot_id}")
    print(f"  prompt 长度: {len(prompt)} 字符")

    start = time.time()
    accumulated = ""
    try:
        for event in client.chat.stream(
            bot_id=bot_id,
            user_id="speed-test",
            additional_messages=[
                Message(role="user", content=prompt, content_type="text")
            ],
            auto_save_history=False,
        ):
            if event.event == ChatEventType.CONVERSATION_MESSAGE_DELTA:
                if hasattr(event, "message") and event.message:
                    if hasattr(event.message, "content") and event.message.content:
                        accumulated += event.message.content

        elapsed = time.time() - start
        print(f"  耗时: {elapsed:.2f}s | 响应长度: {len(accumulated)} 字符")

        parsed = None
        if expect_json:
            text = accumulated.strip()
            # 去掉 markdown 代码块
            if text.startswith("```"):
                lines = text.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                text = "\n".join(lines)
            try:
                parsed = json.loads(text)
                print(f"  JSON 解析: 成功，字段={list(parsed.keys())}")
            except Exception as e:
                print(f"  JSON 解析: 失败 ({e})")
                print(f"  原始响应前200字符: {accumulated[:200]}")
        else:
            print(f"  响应预览: {accumulated[:120]}...")

        print()
        return elapsed, accumulated, parsed

    except Exception as e:
        elapsed = time.time() - start
        print(f"  错误: {e} | 耗时: {elapsed:.2f}s\n")
        return elapsed, str(e), None


# ============================================================
#  模拟真实业务场景的测试数据
# ============================================================

print("=" * 60)
print("  Coze API 响应速度测试（真实业务场景）")
print("=" * 60)

results = {}

# --- 1. JD 生成 ---
jd_prompt = (
    "请根据以下要求生成一份专业的招聘JD：\n"
    "高级Java开发工程师，5年经验，熟悉微服务架构，\n"
    "负责核心业务系统的需求分析、架构设计与开发实现。\n"
    "参与技术方案评审，推动代码质量与工程规范建设。\n"
    "与产品、测试团队紧密协作，按时高质量交付项目。\n"
    "持续优化系统性能，提升系统稳定性与可扩展性。\n"
    "指导初级开发人员，参与团队技术分享。\n"
    "任职要求：本科及以上学历，计算机科学等相关专业，5年以上相关岗位工作经验。\n"
    "加分项：有开源项目贡献经验，具备跨团队协作与项目管理经验。\n"
    "薪资范围：15-25K × 14薪，五险一金+补充商业保险，弹性工作制。"
)
results["jd_generator"] = measure("jd_generator", jd_prompt)


# --- 2. 薪资分析 ---
salary_prompt = (
    "请对以下岗位进行薪资分析，返回严格的JSON格式（不要markdown包裹），字段如下：\n"
    '{\n'
    '  "position": "岗位名称",\n'
    '  "city": "城市",\n'
    '  "experience": "工作经验",\n'
    '  "education": "学历",\n'
    '  "salaryRange": {"min": 最低薪资K, "max": 最高薪资K, "median": 中位数K},\n'
    '  "percentiles": {"p10": P10薪资K, "p25": P25薪资K, "p50": P50薪资K, "p75": P75薪资K, "p90": P90薪资K},\n'
    '  "industryAvg": 行业平均薪资K,\n'
    '  "cityAvg": 城市平均薪资K,\n'
    '  "experienceLevels": [\n'
    '    {"level": "1年以下", "salary": 对应薪资K},\n'
    '    {"level": "1-3年", "salary": 对应薪资K},\n'
    '    {"level": "3-5年", "salary": 对应薪资K},\n'
    '    {"level": "5-10年", "salary": 对应薪资K},\n'
    '    {"level": "10年以上", "salary": 对应薪资K}\n'
    '  ],\n'
    '  "educationImpact": [\n'
    '    {"level": "大专", "salary": 对应薪资K},\n'
    '    {"level": "本科", "salary": 对应薪资K},\n'
    '    {"level": "硕士", "salary": 对应薪资K},\n'
    '    {"level": "博士", "salary": 对应薪资K}\n'
    '  ],\n'
    '  "recommendedRange": "建议薪资范围如 22K - 32K",\n'
    '  "confidence": "高/中/低"\n'
    '}\n\n'
    "岗位名称：高级Java开发工程师\n"
    "所在城市：北京\n"
    "工作经验：3-5年\n"
    "学历要求：本科\n\n"
    "请基于中国IT行业2024-2025年市场数据，给出合理真实的薪资分析结果。"
)
results["salary_analysis"] = measure("salary_analysis", salary_prompt, expect_json=True)


# --- 3. 简历初筛 ---
jd_for_screening = (
    "岗位职责：\n"
    "1. 负责核心业务系统的需求分析、架构设计与开发实现\n"
    "2. 参与技术方案评审，推动代码质量与工程规范建设\n"
    "3. 与产品、测试团队紧密协作，按时高质量交付项目\n"
    "4. 持续优化系统性能，提升系统稳定性与可扩展性\n"
    "5. 指导初级开发人员，参与团队技术分享\n"
    "任职要求：\n"
    "- 本科及以上学历，计算机科学、软件工程等相关专业\n"
    "- 5年以上相关岗位工作经验\n"
    "- 扎实的专业基础，熟悉主流技术框架与工具\n"
    "- 具备良好的沟通能力和团队协作精神\n"
    "- 有大型项目经验者优先"
)

resume_text = (
    "张三 - 高级Java开发工程师\n"
    "电话：138-0000-0001 | 邮箱：zhangsan@email.com\n"
    "学历：本科，北京理工大学，计算机科学与技术，2018年毕业\n"
    "工作经历：\n"
    "2020-至今 某互联网公司 高级Java开发工程师\n"
    "- 主导微服务架构改造，使用 Spring Cloud + Kubernetes 实现服务治理\n"
    "  系统可用性从 99.5% 提升至 99.95%\n"
    "- 负责核心交易系统开发，日均处理订单量 50万+\n"
    "- 设计并实现分布式缓存方案，QPS 从 2000 提升至 8000\n"
    "- 推动团队 Code Review 规范，代码缺陷率降低 40%\n"
    "2018-2020 某科技有限公司 Java开发工程师\n"
    "- 参与电商平台后端开发，负责订单、支付模块\n"
    "- 使用 Spring Boot + MyBatis + MySQL 开发\n"
    "- 编写单元测试，覆盖率从 30% 提升至 75%\n"
    "技术栈：Java, Spring Boot, Spring Cloud, MySQL, Redis, Kafka, Docker, K8s, Git\n"
    "项目经验：分布式电商平台、微服务架构改造、实时数据处理平台"
)

screen_prompt = (
    f"【岗位描述】\n{jd_for_screening}\n\n"
    f"【简历内容】\n{resume_text}\n\n"
    "请根据岗位需求对该简历进行初筛评分，返回严格的JSON格式（不要markdown包裹），字段如下：\n"
    '{"score": 0-100整数, "recommendation": "strong"或"moderate"或"weak", '
    '"matchPoints": ["匹配点1", "匹配点2"], "missingPoints": ["缺失项1", "缺失项2"], '
    '"summary": "综合评价"}'
)
results["resume_screening"] = measure("resume_screening", screen_prompt, expect_json=True)


# --- 4. 面试题 ---
interview_prompt = (
    "岗位: 高级Java开发工程师\n"
    "岗位描述: 负责核心业务系统的需求分析、架构设计与开发实现，"
    "参与技术方案评审，推动代码质量与工程规范建设。\n"
    "任职要求：5年以上Java开发经验，熟悉微服务架构、Spring Cloud、MySQL、Redis。\n"
    "\n请为该岗位生成3道中等难度的面试题，"
    "包含技术题、行为题类型。每道题请给出题目、考察点和参考答案。"
)
results["interview_questions"] = measure("interview_questions", interview_prompt)


# --- 5. Offer 邮件 ---
offer_prompt = (
    "请生成一份正式的Offer录用通知书。\n"
    "候选人：张三\n"
    "录用岗位：高级Java开发工程师\n"
    "薪资待遇：25K × 14薪，五险一金+补充商业保险\n"
    "报到日期：2025-07-01\n"
    "工作地点：北京市朝阳区\n"
    "公司名称：XX科技有限公司\n"
    "备注：弹性工作制，每年15天年假，技术氛围好"
)
results["offer_email"] = measure("offer_email", offer_prompt)


# ============================================================
#  汇总
# ============================================================
print("=" * 60)
print("  汇总")
print("=" * 60)
print(f"{'Bot':<20} {'耗时':>8} {'响应长度':>10} {'JSON':>6}")
print("-" * 50)
for key, val in results.items():
    if val is None:
        print(f"{key:<20} {'跳过':>8}")
        continue
    elapsed, text, parsed = val
    json_ok = "是" if parsed else ("-" if "JSON" not in text else "否")
    print(f"{key:<20} {elapsed:>7.2f}s {len(text):>8}字符 {json_ok:>6}")
print("=" * 60)
