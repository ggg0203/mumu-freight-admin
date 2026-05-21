/**
 * ★★★ 报表 AI 智能对话引擎 ★★★
 *
 * 基于阿里云百炼 qwen3.6-plus
 * 用户自然语言提问 → AI 基于报表数据回答
 */

import { chatCompletion } from '@/services/ai';

/** 报表数据上下文 */
export interface ReportContext {
  reportType: string;
  totalOrders: number;
  totalRevenue: number;
  activeDrivers: number;
  coveredCities: number;
  topCity: string;
  topCityOrders: number;
  monthTrend: { months: string[]; orders: number[]; revenue: number[] };
  cityRank: { city: string; orders: number; revenue: number; drivers: number }[];
  cargoType: { type: string; ratio: number; amount: number }[];
  generatedAt: string;
}

/** 构建系统提示词 */
const buildSystemPrompt = (ctx: ReportContext): string => {
  const top3Cities = ctx.cityRank.slice(0, 3)
    .map((c) => `${c.city}(${c.orders}单/¥${c.revenue.toLocaleString()})`).join('、');
  const top3Cargo = ctx.cargoType.slice(0, 3)
    .map((c) => `${c.type}(${c.ratio}%)`).join('、');

  return `你是一个货运管理系统的 AI 数据分析师。请基于当前报表数据回答用户的问题。

【当前报表概览】
- 报表类型：${ctx.reportType}
- 总订单数：${ctx.totalOrders} 单
- 总营收：¥${ctx.totalRevenue.toLocaleString()}（约 ${(ctx.totalRevenue / 10000).toFixed(1)} 万元）
- 活跃司机：${ctx.activeDrivers} 人
- 覆盖城市：${ctx.coveredCities} 座
- 头部城市排名：${top3Cities}
- 主要货物类型：${top3Cargo}
- 头部城市：${ctx.topCity}（${ctx.topCityOrders} 单）

【月度趋势】
${ctx.monthTrend.months.map((m, i) => `${m}: ${ctx.monthTrend.orders[i]}单/¥${ctx.monthTrend.revenue[i].toLocaleString()}`).join('\n')}

【回复要求】
1. 基于以上真实报表数据回答，不要编造
2. 回答简洁专业，用中文
3. 适当使用 emoji 增强可读性
4. 如果用户问的是报表中未包含的数据，请坦诚说明
5. 可以提供基于现有数据的分析和建议`;
};

/** AI 对话消息 */
export interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
}

/** 调用百炼 AI 回答报表相关问题 */
export const askReportQuestion = async (
  question: string,
  context: ReportContext,
  history?: ChatMsg[]
): Promise<{ success: boolean; text: string; error?: string }> => {
  try {
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: buildSystemPrompt(context) },
    ];

    // 添加最近 3 轮历史
    if (history) {
      const recent = history.slice(-3);
      for (const msg of recent) {
        const mappedRole = msg.role === 'ai' ? 'assistant' : 'user';
        messages.push({ role: mappedRole, content: msg.text });
      }
    }

    messages.push({ role: 'user', content: question });

    const content = await chatCompletion(messages, { temperature: 0.7, maxTokens: 1000 });
    return { success: true, text: content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return {
      success: false,
      text: '',
      error: msg.includes('401') || msg.includes('Unauthorized')
        ? '⚠️ AI 服务连接失败，请检查 API Key 配置。'
        : `😅 AI 服务暂不可用：${msg}`,
    };
  }
};

/** 获取快捷提问列表 */
export const getQuickQuestions = (): string[] => [
  '总结一下当前运营情况',
  '哪个城市订单最多？',
  '营收趋势怎么样？',
  '有哪些值得关注的异常？',
  '建议在哪个城市增加运力？',
];
