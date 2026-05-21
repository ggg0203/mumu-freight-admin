# shared-data

> 共享数据层 — 业务数据统一管理（核心架构），所有页面通过此模块读写订单/司机/课程数据

## 逻辑文件

| 文件 | 作用 |
|------|------|
| `shared-data.ts` | getOrders/setOrders/getDrivers/setDrivers + computeDashboardStats 等统计函数，数据持久化到 localStorage |

