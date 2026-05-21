# Order

> 订单管理 — 核心业务页面

## 组件文件

| 文件 | 作用 |
|------|------|
| `index.tsx` | Order：订单 Table + 分页 + 搜索筛选 + 状态流转 + 创建订单 Modal + Excel 导入/导出 |

## 逻辑文件

| 文件 | 作用 |
|------|------|
| `aiFillOrder.ts` | AI 智能填单：自然语言 → AI 解析 → 自动填充表单字段 |
| `aiDriverRecommend.ts` | AI 司机推荐：根据起点/货物类型 → AI 推荐最优司机 |

## 样式文件

| 文件 | 作用 |
|------|------|
| `index.module.css` | 订单管理样式 |

