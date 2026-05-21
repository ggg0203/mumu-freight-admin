/**
 * ★★★ AI 数据助手 — 真实 AI 引擎 ★★★
 *
 * 基于阿里云百炼 qwen3.6-plus，告别 Mock 数据
 * 保留语音导航功能
 */

import { chatCompletion } from '@/services/ai';
import type { ChatMessage } from '@/services/ai';
import { getOrders, getDrivers, computeDashboardStats } from '@/shared-data';

// ==================== 导航指令匹配规则（保留，真实功能）====================

interface NavRule {
  patterns: RegExp[];
  path: string;
  name: string;
}

const navRules: NavRule[] = [
  { patterns: [/打开.*订单管理/, /去.*订单管理/, /订单管理/, /订单页面/], path: '/order', name: '订单管理' },
  { patterns: [/打开.*数据大屏/, /去.*数据大屏/, /数据大屏/, /大屏显示/], path: '/screen', name: '数据大屏' },
  { patterns: [/打开.*数据概览/, /去.*数据概览/, /数据概览/, /概览页面/, /首页/], path: '/dashboard', name: '数据概览' },
  { patterns: [/打开.*订单追踪/, /去.*运单追踪/, /运单追踪/, /订单追踪/], path: '/order-trace', name: '运单追踪' },
  { patterns: [/打开.*路线规划/, /去.*路线规划/, /路线规划/], path: '/route-planning', name: '路线规划' },
  { patterns: [/打开.*司机/, /去.*司机/, /司机列表/], path: '/driver-list', name: '司机列表' },
  { patterns: [/打开.*看板/, /去.*看板/, /订单看板/], path: '/order-kanban', name: '订单看板' },
  { patterns: [/打开.*热力/, /去.*热力/, /热力地图/], path: '/heatmap', name: '热力地图' },
  { patterns: [/打开.*设置/, /去.*设置/, /系统设置/], path: '/settings', name: '系统设置' },
  { patterns: [/打开.*报表/, /去.*报表/, /智能报表/], path: '/reports', name: '智能报表' },
  { patterns: [/打开.*3D/, /去.*3D/, /3D货运网络/, /货运网络/], path: '/three-globe', name: '3D货运网络' },
  { patterns: [/打开.*预测/, /去.*预测/, /智能预测/, /订单预测/, /预测页面/], path: '/order-prediction', name: '智能订单预测' },
  { patterns: [/打开.*用户/, /去.*用户/, /用户管理/], path: '/user-list', name: '用户管理' },
  { patterns: [/打开.*菜单/, /去.*菜单/, /菜单管理/], path: '/menu-list', name: '菜单管理' },
  { patterns: [/打开.*角色/, /去.*角色/, /角色管理/], path: '/role-list', name: '角色管理' },
  { patterns: [/打开.*部门/, /去.*部门/, /部门管理/], path: '/dept-list', name: '部门管理' },
  { patterns: [/打开.*聚合/, /去.*聚合/, /订单聚合/], path: '/order-cluster', name: '订单聚合' },
  { patterns: [/打开.*课程/, /去.*课程/, /课程管理/], path: '/course', name: '课程管理' },
  { patterns: [/打开.*审计/, /去.*审计/, /审计日志/, /操作日志/], path: '/audit-log', name: '操作审计日志' },
];

/** 匹配导航指令（保留，真实功能） */
export const matchNavigation = (input: string): { path: string; name: string } | null => {
  const lower = input.toLowerCase();
  for (const rule of navRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lower) || pattern.test(input)) {
        return { path: rule.path, name: rule.name };
      }
    }
  }
  return null;
};

// ==================== 构建系统提示词 ====================

/** 从共享数据层获取实时统计数据 */
const buildSystemPrompt = (): string => {
  const stats = computeDashboardStats();
  const orders = getOrders();
  const drivers = getDrivers();

  // 统计订单状态分布
  const statusCount = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
  orders.forEach((o) => { statusCount[o.status]++; });

  // 城市列表
  const cities = [...new Set(orders.flatMap((o) => [o.origin, o.destination]))].join('、');

  return `你是一个货运管理系统的 AI 数据助手，名叫「幕幕货运 AI 助手」。你正在帮助管理员分析运营数据。

【当前系统实时数据】
- 总订单数：${stats.totalOrders} 笔
- 订单状态分布：待处理 ${statusCount.pending} 笔，运输中 ${statusCount.processing} 笔，已完成 ${statusCount.completed} 笔，已取消 ${statusCount.cancelled} 笔
- 总营收：¥${Math.round(stats.totalRevenue).toLocaleString()}（约 ${(stats.totalRevenue / 10000).toFixed(1)} 万元）
- 注册司机：${stats.driverCount} 人
- 覆盖城市：${stats.coveredCities} 座（包括：${cities}）

【功能说明】
1. 系统有 21 个功能页面，包括订单管理、数据大屏、运单追踪、路线规划、司机列表、用户管理等
2. 用户可以对订单/司机/用户/菜单/角色/部门进行增删改操作
3. 系统支持中英文切换和暗黑模式

【回复要求】
1. 基于以上真实数据回答，不要编造数字
2. 回答简洁、专业，用中文
3. 适当使用表情符号让回复更友好
4. 如果是用户问"打开xxx"类的导航需求，引导用户使用"打开订单管理"这样的语音指令
5. 不知道的问题请坦诚说明，不要编造`;
};

// ==================== AI 问答（真实调用）====================

/** 调用百炼 AI 生成回答 */
export const generateResponse = async (
  input: string,
  history?: { role: 'user' | 'ai'; text: string }[]
): Promise<{ text: string; data?: any }> => {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
  ];

  // 添加对话历史（最多最近 5 轮）
  if (history) {
    const recentHistory = history.slice(-5);
    for (const msg of recentHistory) {
      // ★★★ 修复：'ai' → 'assistant' 角色映射，类型断言不改变运行时值 ★★★
      const mappedRole = msg.role === 'ai' ? 'assistant' : 'user';
      messages.push({ role: mappedRole, content: msg.text });
    }
  }

  // 添加当前问题
  messages.push({ role: 'user', content: input });

  try {
    const content = await chatCompletion(messages);
    return { text: content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    console.error('[AI Error]', msg);

    // 如果是 API Key 问题，给明确提示
    if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('API')) {
      return {
        text: '⚠️ AI 服务连接失败，请检查 `DASHSCOPE_API_KEY` 是否配置正确。\n\n当前使用的是后备模式，可以试试语音导航功能：说"打开订单管理"来跳转页面。',
      };
    }

    return {
      text: `抱歉，AI 服务暂时不可用 😅 请稍后再试。\n\n错误信息：${msg}`,
    };
  }
};

/** 获取快捷问答列表 */
export const getQuickQuestions = (): string[] => [
  '总订单有多少？',
  '这个月营收如何？',
  '有多少司机在线？',
  '覆盖了多少城市？',
  '订单状态分布怎么样？',
  '系统有哪些功能？',
];
