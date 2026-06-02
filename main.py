import os
from cozepy import Coze, TokenAuth, COZE_CN_BASE_URL
from dotenv import load_dotenv

load_dotenv()  # 在获取环境变量前调用

# 获取 Token：在 coze.cn 控制台 -> 设置 -> 开发者 -> API Token
coze = Coze(
    auth=TokenAuth(token=os.getenv("COZE_API_TOKEN")), base_url=COZE_CN_BASE_URL
)

# 示例：列出你的工作空间
workspaces = coze.workspaces.list()
for ws in workspaces.items:
    print(f"工作空间名称: {ws.name}, ID: {ws.id}")
    bots = coze.bots.list(space_id=ws.id)
    print(bots.items)
