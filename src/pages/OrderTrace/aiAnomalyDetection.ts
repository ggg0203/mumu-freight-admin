/**
 * ★★★ 运单 AI 异常检测引擎 ★★★
 *
 * 基于阿里云百炼 qwen3.6-plus
 * 分析运单轨迹数据，检测异常并给出预警
 */

import { chatCompletion } from '@/services/ai';

/** 运单数据摘要（传递给 AI 分析） */
export interface AnomalyContext {
  orderNo: string;
  status: string;
  progress: number;
  totalDistance: number;
  estimatedTime: string;
  currentLocation: { lng: number; lat: number; updateTime: string };
  startLocation: { name: string; address: string; lng: number; lat: number };
  endLocation: { name: string; address: string; lng: number; lat: number };
  driver: { name: string; phone: string; plateNo: string };
  trackPointsCount: number;
}

/** 构建分析提示词 */
const buildPrompt = (ctx: AnomalyContext): string => {
  // 计算起终点距离（简化）
  const distance = ctx.totalDistance;

  // 预估正常耗时（分钟），假设平均时速 40km/h
  const estimatedMinutes = Math.round((distance / 40) * 60);

  return `你是一个货运物流 AI 异常检测系统。请分析以下运单数据，判断是否存在异常。

【运单信息】
- 运单号：${ctx.orderNo}
- 状态：${ctx.status === 'pending' ? '待取货' : ctx.status === 'picked' ? '已取货' : ctx.status === 'transit' ? '运输中' : '已送达'}
- 运输进度：${ctx.progress}%
- 总距离：${distance}km（预计正常行驶约 ${estimatedMinutes} 分钟）
- 预计到达：${ctx.estimatedTime}

【起终点】
- 起点：${ctx.startLocation.name}（${ctx.startLocation.address}）
- 终点：${ctx.endLocation.name}（${ctx.endLocation.address}）

【当前位置】
- 坐标：(${ctx.currentLocation.lat}, ${ctx.currentLocation.lng})
- 更新时间：${ctx.currentLocation.updateTime}

【司机】
- 姓名：${ctx.driver.name}
- 车牌：${ctx.driver.plateNo}

【轨迹点数量】${ctx.trackPointsCount} 个

请严格按以下 JSON 格式输出分析结果，不要包含其他文字：
{
  "hasAnomaly": true/false,
  "anomalies": [
    {
      "type": "route_deviation|long_stall|progress_abnormal|eta_risk",
      "level": "warning|danger",
      "title": "简短标题",
      "description": "详细描述"
    }
  ],
  "summary": "总体评估一句话"
}

检测规则：
- route_deviation：轨迹点偏离直线路径过远
- long_stall：当前位置长时间未更新或进度未变化
- progress_abnormal：进度与状态不匹配（如 status="picked" 但 progress>50%）
- eta_risk：预计到达时间可能延误
- 如果一切正常，anomalies 为空数组，hasAnomaly 为 false`;
};

/** 异常条目 */
export interface AnomalyItem {
  type: 'route_deviation' | 'long_stall' | 'progress_abnormal' | 'eta_risk';
  level: 'warning' | 'danger';
  title: string;
  description: string;
}

/** 异常检测结果 */
export interface AnomalyResult {
  hasAnomaly: boolean;
  anomalies: AnomalyItem[];
  summary: string;
}

/** 调用百炼 AI 检测运单异常 */
export const detectOrderAnomaly = async (ctx: AnomalyContext): Promise<AnomalyResult> => {
  try {
    const prompt = buildPrompt(ctx);
    const content = await chatCompletion([
      { role: 'system', content: prompt },
      { role: 'user', content: '请分析该运单数据' },
    ], { temperature: 0.3, maxTokens: 800 });

    // 解析 JSON
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    try {
      const result = JSON.parse(cleaned) as AnomalyResult;
      return result;
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AnomalyResult;
      }
      return { hasAnomaly: false, anomalies: [], summary: 'AI 异常检测暂时不可用' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    console.error('[AI Anomaly Error]', msg);
    return { hasAnomaly: false, anomalies: [], summary: 'AI 检测服务暂不可用' };
  }
};
