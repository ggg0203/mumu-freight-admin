/**
 * ★★★ 环境变量封装工具 ★★★
 *
 * 封装 Vite 的环境变量，提供类型安全和运行时的环境判断
 *
 * 编译时环境：通过 import.meta.env 读取 Vite 内置变量
 * (在构建时由 Vite 注入，无法在运行时更改)
 *
 * 运行时环境：通过全局变量 window.APP_CONFIG 注入
 * (可在部署时通过修改 HTML 或服务器配置动态更改)
 */

// ==================== 编译时环境 ====================

/**
 * 获取编译时环境变量
 * 这些变量在构建时由 Vite 注入
 */
export const buildEnv = {
  /** 应用模式：development / production */
  MODE: import.meta.env.MODE as string,

  /** 是否为开发模式 */
  isDev: import.meta.env.DEV,

  /** 是否为生产模式 */
  isProd: import.meta.env.PROD,

  /** 应用标题 */
  APP_TITLE: (import.meta.env.VITE_APP_TITLE as string) || '幕幕货运管理系统',

  /** API 基础地址 */
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string) || '/api',
} as const;

// ==================== 运行时环境 ====================

/**
 * 运行时环境配置接口
 * 可在 index.html 中通过 window.APP_CONFIG 注入
 */
interface RuntimeConfig {
  /** 后端 API 地址 */
  API_BASE_URL?: string;

  /** 应用标题 */
  APP_TITLE?: string;

  /** 其他自定义配置 */
  [key: string]: string | undefined;
}

/**
 * 获取运行时环境配置
 * 支持在部署后动态修改
 */
export function getRuntimeConfig(): RuntimeConfig {
  return (window as unknown as { APP_CONFIG?: RuntimeConfig }).APP_CONFIG || {};
}

/**
 * 判断当前环境
 * @returns 'development' | 'production' | 'test'
 */
export function getEnvType(): string {
  return buildEnv.MODE;
}

/**
 * 是否为开发环境
 */
export const isDev = buildEnv.isDev;
