/**
 * ★★★ Dashboard AI 数据洞察引擎 ★★★
 *
 * 基于阿里云百炼 qwen3.6-plus，分析 Dashboard 实时数据
 * 生成自然语言运营分析报告
 */

import { chatCompletion } from '@/services/ai';
import { computeDashboardStats } from '@/shared-data';
import type { DashboardStats } from '@/shared-data';

/** 构建分析系统提示词 */
const buildAnalysisPrompt = (stats: DashboardStats): string => {
  const { totalOrders, totalRevenue, driverCount, coveredCities, orderTrend, revenueTrend, trendMonths, cityDistribution, ageDistribution } = stats;

  // 订单变化方向判断
  const orderChange = orderTrend.length >= 2
    ? orderTrend[orderTrend.length - 1] - orderTrend[orderTrend.length - 2]
    : 0;
  const revenueChange = revenueTrend.length >= 2
    ? revenueTrend[revenueTrend.length - 1] - revenueTrend[revenueTrend.length - 2]
    : 0;

  // 头部城市
  const topCities = cityDistribution.slice(0, 3).map(c => `${c.name}(${c.value}单)`).join('、');

  // 年龄结构概况
  const ageSummary = ageDistribution.map(a => `${a.name}:${a.value}人`).join('、');

  return `你是一个货运管理系统的数据分析专家。请基于以下真实的经营数据，提供专业的分析洞察。

【核心指标】
- 总订单数：${totalOrders} 笔
- 总营收：¥${totalRevenue.toLocaleString()}（约 ${(totalRevenue / 10000).toFixed(1)} 万元）
- 注册司机：${driverCount} 人
- 覆盖城市：${coveredCities} 座

【月度趋势（近12个月）】
月度订单量走势（${trendMonths.join('/')}）：${orderTrend.join(' → ')}
月度营收走势（万元）：${revenueTrend.join(' → ')}
${orderChange !== 0 ? `环比上月订单：${orderChange > 0 ? `增长 ${orderChange} 单` : `减少 ${Math.abs(orderChange)} 单`}` : ''}
${revenueChange !== 0 ? `环比上月营收：${revenueChange > 0 ? `增长 ${revenueChange} 万元` : `减少 ${Math.abs(revenueChange)} 万元`}` : ''}

【城市订单分布 TOP3】
${topCities}

【司机年龄结构】
${ageSummary}

请严格按照以下格式（Markdown）输出分析报告：

## 📊 经营概述
（2-3句话概括整体经营状况，指出亮点和风险点）

## 📈 趋势解读
（分析订单和营收的变化趋势，指出增长或下降的关键月份和可能原因）

## 💡 运营建议
（列出2-3条基于当前数据的可操作建议）

要求：
1. 基于以上真实数据，不要编造
2. 语言简洁有力，用中文
3. 使用适当的 emoji 增强可读性
4. 不要评价"数据不够多"或"样本不足"之类的问题`;
};

/** AI 洞察接口 */
export interface AIInsightResult {
  success: boolean;
  content: string;
  error?: string;
}

/** 调用百炼 AI 生成 Dashboard 数据洞察 */
export const generateDashboardInsight = async (): Promise<AIInsightResult> => {
  try {
    const stats = computeDashboardStats();
    const prompt = buildAnalysisPrompt(stats);

    const content = await chatCompletion([
      { role: 'system', content: prompt },
      { role: 'user', content: '请分析当前 Dashboard 数据' },
    ], { temperature: 0.7, maxTokens: 1500 });

    return { success: true, content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    console.error('[AI Insight Error]', msg);
    return {
      success: false,
      content: '',
      error: msg.includes('401') || msg.includes('Unauthorized') || msg.includes('API')
        ? '⚠️ AI 服务连接失败，请检查 `DASHSCOPE_API_KEY` 是否配置正确。'
        : `😅 AI 服务暂时不可用，请稍后再试。\n\n错误信息：${msg}`,
    };
  }
};
