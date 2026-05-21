/**
 * ★★★ 报表 AI 摘要生成引擎 ★★★
 *
 * 基于阿里云百炼 qwen3.6-plus
 * 自动分析报表数据，生成运营摘要报告
 */

import { chatCompletion } from '@/services/ai';

/** 日报摘要输入上下文 */
export interface ReportSummaryContext {
  reportType: string;
  totalOrders: number;
  totalRevenue: number;
  activeDrivers: number;
  coveredCities: number;
  topCities: { name: string; value: number }[];
  monthTrend: { months: string[]; orders: number[] };
  cargoDistribution: { type: string; ratio: number }[];
  generatedAt: string;
}

/** 构建摘要提示词 */
const buildSummaryPrompt = (ctx: ReportSummaryContext): string => {
  const orderChange = ctx.monthTrend.orders.length >= 2
    ? ctx.monthTrend.orders[ctx.monthTrend.orders.length - 1] - ctx.monthTrend.orders[ctx.monthTrend.orders.length - 2]
    : 0;

  const top3Cities = ctx.topCities.slice(0, 3).map(c => `${c.name}(${c.value}单)`).join('、');
  const top3Cargo = ctx.cargoDistribution.slice(0, 3).map(c => `${c.type}(${c.ratio}%)`).join('、');

  return `你是一个货运管理系统的 AI 运营分析师。请基于以下报表数据生成一份简洁的运营摘要。

【报表类型】${ctx.reportType}
【核心指标】
- 总订单数：${ctx.totalOrders} 单
- 总营收：¥${ctx.totalRevenue.toLocaleString()}
- 活跃司机：${ctx.activeDrivers} 人
- 覆盖城市：${ctx.coveredCities} 座
${orderChange !== 0 ? `- 月度订单变化：${orderChange > 0 ? `+${orderChange}` : `${orderChange}`}` : ''}

【头部城市TOP3】${top3Cities}
【主要货物类型TOP3】${top3Cargo}

【月度趋势】
${ctx.monthTrend.months.map((m, i) => `${m}: ${ctx.monthTrend.orders[i]}单`).join('、')}

请严格按照以下格式输出（Markdown）：

## 📋 关键发现
（2-3条最重要的数据发现，用要点列出）

## 📊 趋势分析
（分析订单变化趋势，指出增长或下降的关键信号）

## 💡 行动建议
（基于数据给出 2-3 条可操作的建议）

要求：
1. 基于以上真实数据，不要编造数字
2. 语言简洁专业，用中文
3. 适当使用 emoji`;
};

/** AI 摘要生成结果 */
export interface AISummaryResult {
  success: boolean;
  content: string;
  error?: string;
}

/** 调用百炼 AI 生成报表摘要 */
export const generateReportSummary = async (ctx: ReportSummaryContext): Promise<AISummaryResult> => {
  try {
    const prompt = buildSummaryPrompt(ctx);
    const content = await chatCompletion([
      { role: 'system', content: prompt },
      { role: 'user', content: '请生成运营摘要' },
    ], { temperature: 0.7, maxTokens: 1200 });

    return { success: true, content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    console.error('[AI Summary Error]', msg);
    return {
      success: false,
      content: '',
      error: msg.includes('401') || msg.includes('Unauthorized')
        ? '⚠️ AI 服务连接失败'
        : `😅 AI 服务暂不可用：${msg}`,
    };
  }
};
