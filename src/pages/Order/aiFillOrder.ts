/**
 * ★★★ 订单 AI 智能填单引擎 ★★★
 *
 * 基于阿里云百炼 qwen3.6-plus
 * 自然语言 → 结构化订单表单数据
 */

import { chatCompletion } from '@/services/ai';
import { getCityNames, getGoodsTypes, getDriverNames } from '@/shared-data';

/** AI 填单结果 */
export interface AIFillResult {
  success: boolean;
  fields: AIOrderFields | null;
  raw?: string;
  error?: string;
}

/** 订单字段映射（与 Form 字段名一致） */
export interface AIOrderFields {
  customerName?: string;
  customerPhone?: string;
  origin?: string;
  destination?: string;
  goodsType?: string;
  weight?: number;
  amount?: number;
  driverId?: number;
}

/** 构建提示词 */
const buildFillPrompt = (): string => {
  const cities = getCityNames();
  const goods = getGoodsTypes();
  const drivers = getDriverNames();
  const driverList = drivers.map((d) => ({ name: d, phone: '' }));

  return `你是一个货运管理系统的智能填单助手。请根据用户的自然语言描述，提取关键信息并返回 JSON 格式的表单数据。

【可选城市列表】${cities.join('、')}
【可选货物类型】${goods.join('、')}
【可选司机】${driverList.map((d) => `${d.name}`).join('、')}

【运费参考】
- 同城短途（<100km）：200-500 元
- 省内中短途（100-300km）：500-1500 元
- 跨省长途（300-800km）：1500-4000 元
- 超长距离（>800km）：4000-8000 元
- 特殊货物（电子设备/精密仪器等）：在上述基础上上浮 20%-50%

【输出格式要求】
1. 严格返回 JSON 对象，不要包含 \`\`\`json 标记或其他说明文字
2. 只返回字段和值，不要注释
3. 字段名使用英文：customerName, customerPhone, origin, destination, goodsType, weight, amount
4. 城市名必须从可选城市列表中匹配（模糊匹配），如果找不到匹配的城市名，用用户输入的原值
5. 货物类型必须从可选货物类型列表中匹配
6. 重量统一使用 "kg" 单位，用户说"吨"时转换为 kg（1吨=1000kg）
7. amount 是运费金额（元），根据运费参考估算
8. 用户未提供的信息字段留空（null），不要编造

【示例】
用户说："从深圳发一批电子设备到广州，总重2吨，联系人张三"
返回：{"customerName":"张三","origin":"深圳","destination":"广州","goodsType":"电子设备","weight":2000}

用户说："上海到北京，衣服，500kg，李四"
返回：{"origin":"上海","destination":"北京","goodsType":"衣服","weight":500,"customerName":"李四"}`;
};

/** 调用百炼 AI 解析自然语言填单 */
export const aiFillOrder = async (input: string): Promise<AIFillResult> => {
  try {
    if (!input.trim()) {
      return { success: false, fields: null, error: '请输入订单描述' };
    }

    const content = await chatCompletion([
      { role: 'system', content: buildFillPrompt() },
      { role: 'user', content: input },
    ], { temperature: 0.3, maxTokens: 800 });

    // 解析 AI 返回的 JSON
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    let fields: AIOrderFields;
    try {
      fields = JSON.parse(cleaned);
    } catch {
      // 尝试提取 JSON 片段
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fields = JSON.parse(jsonMatch[0]);
      } else {
        return { success: false, fields: null, raw: content, error: 'AI 返回格式异常，请重试' };
      }
    }

    return { success: true, fields, raw: content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    console.error('[AI FillOrder Error]', msg);
    return {
      success: false,
      fields: null,
      error: msg.includes('401') || msg.includes('Unauthorized')
        ? '⚠️ AI 服务连接失败，请检查 API Key 配置。'
        : `😅 AI 服务暂不可用：${msg}`,
    };
  }
};
