import uvicorn
from config import app  # noqa: F401
import routes  # noqa: F401  — 触发路由注册

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
