/**
 * ★★★ TypeScript 类型声明文件 (.d.ts) ★★★
 *
 * 使用 declare 关键字声明模块、变量、文件类型等
 *
 * 学习要点：
 * 1. declare module：声明模块类型
 * 2. declare namespace：声明命名空间
 * 3. 文件模块声明：让 TS 识别非 TS 文件（如图片、CSS Module）
 */

// ==================== Vite 环境变量类型声明 ====================

/// <reference types="vite/client" />

// ==================== CSS Module 类型声明 ====================

/**
 * ★★★ 让 TypeScript 理解 .module.css 文件 ★★★
 *
 * CSS Module 文件在导入时会被编译为对象，
 * TypeScript 默认不认识 .module.css 文件，
 * 需要手动声明其类型
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// ==================== 图片文件类型声明 ====================

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

// ==================== 运行时环境配置声明 ====================

/**
 * ★★★ declare 关键字扩展 Window 类型 ★★★
 *
 * 让 TypeScript 知道 window.APP_CONFIG 的存在
 */
interface Window {
  /** 运行时环境配置 */
  APP_CONFIG?: {
    API_BASE_URL?: string;
    APP_TITLE?: string;
    [key: string]: string | undefined;
  };
}
