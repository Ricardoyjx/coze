import os
import json as _json
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ===================== 环境变量 =====================
load_dotenv(Path(__file__).parent / ".env")
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

# ===================== FastAPI 应用 =====================
app = FastAPI(title="招聘Agent后端API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== Coze 多Space配置 =====================


def _load_spaces_config() -> dict:
    """
    自动扫描所有 *_NAME 变量，按前缀收集对应的 _API_KEY / _BOT_ID。
    没有 API Key 的空间也会注册（留给前端展示和后续配置）。
    """
    raw = os.getenv("COZE_SPACES_CONFIG", "").strip()
    if raw:
        try:
            return _json.loads(raw)
        except _json.JSONDecodeError:
            pass

    # 收集所有 *_NAME 前缀
    prefixes: set[str] = set()
    for key in os.environ:
        if key.endswith("_NAME"):
            prefix = key.removesuffix("_NAME")
            if prefix:
                prefixes.add(prefix)

    # 排除明显的系统变量
    skip = {"WSL_DISTRO", "LOG"}
    prefixes -= skip

    spaces: dict = {}
    for prefix in sorted(prefixes):
        name = os.getenv(f"{prefix}_NAME", "")
        api_key = os.getenv(f"{prefix}_API_KEY", "")
        bot_id = os.getenv(f"{prefix}_BOT_ID", "")
        spaces[prefix.lower()] = {"name": name, "api_key": api_key, "bot_id": bot_id}

    # 兜底：单一 token 旧模式
    if not spaces:
        token = os.getenv("COZE_API_TOKEN", "")
        if token:
            spaces["default"] = {"name": "默认空间", "api_key": token, "bot_id": ""}

    return spaces


COZE_SPACES: dict = _load_spaces_config()
COZE_API_TOKEN: str = os.getenv("COZE_API_TOKEN", "")
JD_WORKFLOW_ID: str = os.getenv("COZE_JD_WORKFLOW_ID", "")
SCREEN_WORKFLOW_ID: str = os.getenv("COZE_SCREEN_WORKFLOW_ID", "")
OFFER_WORKFLOW_ID: str = os.getenv("COZE_OFFER_WORKFLOW_ID", "")


# ===================== 内存存储 =====================
class ResumeData(BaseModel):
    id: str
    filename: str
    raw_text: str = ""
    file_bytes: bytes = b""
    name: str = ""
    phone: str = ""
    email: str = ""
    education: str = ""
    workYears: int = 0
    skills: list[str] = []
    experience: str = ""
    uploadedAt: str = ""


uploaded_resumes: dict[str, ResumeData] = {}
screening_tasks: dict[str, dict] = {}
jd_history: list[dict] = []
