# services

> 服务层 — 第三方服务封装

## 逻辑文件

| 文件 | 作用 |
|------|------|
| `ai.ts` | 阿里云百炼 AI 服务，chatCompletion() 统一接口，调用 qwen3.6-plus 模型 |
| `websocket.ts` | WebSocket 单例服务（Observer 模式），含 Mock 引擎 + 真实 WS 接口 |

