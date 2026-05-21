/**
 * ★★★ 应用入口文件 main.tsx ★★★
 *
 * 这是整个应用的起点，Vite 从 index.html 加载此文件
 *
 * 执行顺序：
 * 1. main.tsx → 渲染 App 组件
 * 2. App.tsx → 配置主题、路由
 * 3. Router → 根据 URL 加载对应页面
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// ★★★ 初始化国际化 ★★★
import './i18n';

/**
 * createRoot 是 React 18 的新 API
 * 替代了 React 17 的 ReactDOM.render
 *
 * document.getElementById('root') 对应 index.html 中的 <div id="root">
 */
createRoot(document.getElementById('root')!).render(
  /**
   * StrictMode 是 React 的严格模式
   * 在开发环境下会：
   * 1. 双重渲染组件（帮助发现副作用问题）
   * 2. 检查过时的 API 使用
   * 3. 不会影响生产构建
   */
  <StrictMode>
    <App />
  </StrictMode>,
);
