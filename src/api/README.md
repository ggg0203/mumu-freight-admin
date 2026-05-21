# api

> API 服务层 — 封装 Axios 实例 + 各模块 API 调用

## 逻辑文件

| 文件 | 作用 |
|------|------|
| `index.ts` | 统一导出入口，暴露 userApi/orderApi/dashboardApi 等 |
| `request.ts` | Axios 实例封装：baseURL=/api、Token 自动注入、响应拦截统一错误处理 |
| `user.ts` | 用户相关 API：login / getUserInfo / getMenuList |
| `order.ts` | 订单相关 API：getOrderList / createOrder / updateOrder 等 |
| `dashboard.ts` | 仪表盘 API：getStats / getTrend 等统计接口 |

