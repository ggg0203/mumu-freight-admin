# hooks

> 自定义 React Hooks — 封装可复用的组件逻辑

## 逻辑文件

| 文件 | 作用 |
|------|------|
| `useRealtime.ts` | 实时事件订阅 Hook，封装 WebSocket 服务为 React 接口，返回 connected/latestEvent/eventLog |
| `usePerfMonitor.ts` | 性能监控 Hook，采集 FPS、内存、API 耗时、DOM 节点数 |

