/**
 * ★★★ 应用根组件 App.tsx ★★★
 *
 * 职责：
 * 1. 配置 Ant Design 主题（支持深色/浅色模式切换）
 * 2. 注入 RouterProvider 路由
 * 3. 开发环境下启用 Mock 数据
 */

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import router from '@/router';
import { enableMock, shouldEnableMock } from '@/mock';
import { useThemeStore } from '@/stores/themeStore';
import { wsService } from '@/services/websocket';
import '@/styles/global.css';

/**
 * Ant Design 5.x 自定义主题
 * 支持动态切换深色/浅色模式
 *
 * 学习要点：
 * - token.colorPrimary：主色
 * - algorithm：主题算法（默认暗色/亮色）
 * - components：组件级别定制
 */
function App() {
  const { themeMode } = useThemeStore();

  // ★★★ 开发环境下启用 Mock 数据 & 实时推送 & 清理残留 SW ★★★
  useEffect(() => {
    if (shouldEnableMock()) {
      enableMock();
    }
    // 启动实时推送服务
    wsService.connect();

    // ★★★ 清理之前 `npm run preview` 残留的 PWA Service Worker ★★★
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
          reg.unregister();
          console.log('[App] 已注销残留的 Service Worker');
        }
      });
    }

    return () => wsService.disconnect();
  }, []);

  // 根据主题模式选择算法
  const themeAlgorithm = themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

  // 主题配置
  const themeConfig = {
    // ★★★ 算法：深色或浅色主题 ★★★
    algorithm: themeAlgorithm,

    // ★★★ 主色调：幕幕货运品牌色 ★★★
    token: {
      colorPrimary: '#1677ff',
      borderRadius: 8,

      // ★★★ 文字规范 ★★★
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },

    // ★★★ 组件级别定制 ★★★
    components: {
      Menu: {
        itemBorderRadius: 8,
        itemMarginInline: 8,
      },
      Card: {
        paddingLG: 20,
      },
      Table: {
        headerBg: 'transparent',
      },
    },
  };

  return (
    /**
     * ConfigProvider 是 Ant Design 的主题配置容器
     * 所有 Ant Design 组件都会继承这里的主题配置
     * 每次 themeMode 变化时自动重新渲染，实现主题切换
     */
    <ConfigProvider
      locale={zhCN}
      theme={themeConfig}
    >
      {/*
       * AntApp 提供 message、notification 等静态方法的上下文
       * 确保 message.success() 等方法正常工作
       */}
      <AntApp>
        {/*
         * RouterProvider 注入路由系统
         * 所有路由页面都由这里渲染
         */}
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
