/**
 * ★★★ AI 智能司机调度推荐引擎 ★★★
 *
 * 基于阿里云百炼 qwen3.6-plus
 * 根据订单信息（起点/终点/货物类型）和司机数据智能推荐最优司机
 */

import { chatCompletion } from '@/services/ai';
import { getDrivers } from '@/shared-data';

/** 订单信息上下文 */
export interface OrderContext {
  origin: string;
  destination: string;
  goodsType: string;
  weight: number;
}

/** 司机推荐结果 */
export interface DriverRecommend {
  index: number;     // 在 drivers 数组中的索引
  name: string;
  reason: string;
  score: number;     // 1-10 推荐分数
}

/** 推荐结果 */
export interface RecommendResult {
  success: boolean;
  recommendations: DriverRecommend[];
  raw?: string;
  error?: string;
}

/** 构建推荐提示词 */
const buildRecommendPrompt = (ctx: OrderContext): string => {
  const drivers = getDrivers();

  const driverData = drivers.map((d, i) => ({
    index: i,
    name: d.name,
    city: d.city,
    status: d.status,
    rating: d.rating,
    orderCount: d.orderCount,
    experience: d.yearsOfExperience,
    plateNumber: d.plateNumber,
    phone: d.phone,
  }));

  return `你是一个货运调度 AI 系统。请根据订单信息和司机数据，推荐最合适的 3 位司机。

【订单信息】
- 出发城市：${ctx.origin}
- 到达城市：${ctx.destination}
- 货物类型：${ctx.goodsType}
- 货物重量：${ctx.weight}kg

【可用司机列表（JSON）】
${JSON.stringify(driverData, null, 2)}

【推荐规则（按优先级排序）】
1. 司机所在城市与出发城市匹配（优先）
2. 司机状态：空闲 > 运输中 > 离线
3. 评分（rating）越高越好
4. 经验（yearsOfExperience）越丰富越好
5. 历史订单数（orderCount）越多越好

请严格按以下 JSON 数组格式返回推荐结果，不要包含其他文字：
[
  {
    "index": 司机在列表中的索引,
    "name": "司机姓名",
    "reason": "推荐理由（20字以内）",
    "score": 推荐分数（1-10）
  }
]

最多返回 3 位司机。如果找不到合适的司机，返回空数组 []。`;
};

/** 调用百炼 AI 推荐司机 */
export const recommendDrivers = async (ctx: OrderContext): Promise<RecommendResult> => {
  try {
    const content = await chatCompletion([
      { role: 'system', content: buildRecommendPrompt(ctx) },
      { role: 'user', content: '请推荐最适合该订单的司机' },
    ], { temperature: 0.3, maxTokens: 800 });

    // 解析 JSON
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    let recommendations: DriverRecommend[];
    try {
      recommendations = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        return { success: false, recommendations: [], raw: content, error: 'AI 返回格式异常' };
      }
    }

    // 验证数据
    if (!Array.isArray(recommendations)) {
      return { success: false, recommendations: [], error: 'AI 返回格式异常' };
    }

    return { success: true, recommendations };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    console.error('[AI Recommend Error]', msg);
    return {
      success: false,
      recommendations: [],
      error: msg.includes('401') || msg.includes('Unauthorized')
        ? '⚠️ AI 服务连接失败'
        : `😅 AI 服务暂不可用`,
    };
  }
};
