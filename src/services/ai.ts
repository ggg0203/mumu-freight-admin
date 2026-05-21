/**
 * ★★★ 阿里云百炼 AI 服务 ★★★
 *
 * 调用阿里云百炼平台 qwen3.6-plus 模型
 * API 兼容 OpenAI 格式
 */

const API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen3.6-plus';

/** 获取 API Key */
const getApiKey = (): string => {
  const key = import.meta.env.VITE_DASHSCOPE_API_KEY as string | undefined;
  if (!key) {
    throw new Error('请在环境变量中配置 DASHSCOPE_API_KEY');
  }
  return key;
};

/** 消息格式 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 调用 AI 对话接口 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  return content;
}
