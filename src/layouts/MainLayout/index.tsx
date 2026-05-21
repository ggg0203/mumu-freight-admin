/**
 * ★★★ MainLayout - 主布局组件 ★★★
 *
 * 功能：
 * 1. 布局容器：侧边栏 + 头部 + 标签栏 + 内容区 + 底部
 * 2. 路由守卫：未登录时重定向到登录页
 * 3. 侧边栏折叠/展开
 * 4. ★★★ 多标签页管理器：通过 TabBar 实现页面级缓存，
 *    解决 React.lazy() 懒加载导致页面切换后组件重新挂载、状态丢失的问题 ★★★
 *
 * 布局结构：
 * ┌──────────┬──────────────────────────────────┐
 * │          │         NavHeader                 │
 * │          ├──────────────────────────────────┤
 * │          │         TabBar (多标签页)         │
 * │ SideMenu ├──────────────────────────────────┤
 * │          │                                  │
 * │          │        Content (Outlet)           │
 * │          │                                  │
 * │          ├──────────────────────────────────┤
 * │          │         NavFooter                 │
 * └──────────┴──────────────────────────────────┘
 *
 * ★★★ 为什么 TabBar 能解决状态丢失？★★★
 * 1. 状态驱动路由：TabBar 的标签切换本质是打开/关闭对应路由
 * 2. Zustand 持久化：所有页面的搜索条件、表格状态、表单数据存入 Zustand Store
 * 3. 自定义 KeepAlive：未来可升级为组件级 KeepAlive 方案
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import SideMenu from '@/components/SideMenu';
import NavHeader from '@/components/NavHeader';
import NavFooter from '@/components/NavFooter';
import TabBar from '@/components/TabBar';
import AIAssistant from '@/components/AIAssistant';
import Watermark from '@/components/Watermark';
import PerfPanel from '@/components/PerfPanel';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { useUserStore } from '@/stores/userStore';
import styles from './index.module.css';

const { Content } = Layout;

/** 不需要 TabBar 的页面路径 */
const NO_TAB_PATHS = ['/welcome'];

/**
 * 主布局组件
 * 所有需要登录后才能访问的页面都在此布局内
 */
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { authStatus } = useUserStore();
  const { t } = useTranslation();

  /** 侧边栏折叠状态 */
  const [collapsed, setCollapsed] = useState(false);

  /** 当前页面是否需要显示 TabBar */
  const showTabBar = !NO_TAB_PATHS.includes(location.pathname);

  /** ★★★ 路由守卫：未登录时重定向到登录页 ★★★ */
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      navigate('/login', { replace: true });
    }
  }, [authStatus, navigate]);

  /** 如果未认证，不渲染布局内容 */
  if (authStatus === 'unauthenticated') {
    return null;
  }

  return (
    <Layout className={styles.layout}>
      {/* ★★★ 侧边栏 ★★★ */}
      <SideMenu collapsed={collapsed} onCollapse={setCollapsed} />

      <Layout>
        {/* ★★★ 顶部导航 ★★★ */}
        <NavHeader collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        {/* ★★★ 多标签页导航条 ★★★ */}
        {showTabBar && <TabBar />}

        {/* ★★★ 主内容区域 ★★★ */}
        <Content
          className={showTabBar ? styles.content : styles.contentNoTabs}
          style={{
            background: token.colorBgLayout,
          }}
        >
          {/* ★★★ Outlet 渲染子路由组件 ★★★ */}
          <Outlet />
        </Content>

        {/* ★★★ 底部版权信息 ★★★ */}
        <NavFooter />
      </Layout>
      {/* ★★★ AI 智能数据助手 ★★★ */}
      <AIAssistant />

      {/* ★★★ 水印组件 ★★★ */}
      <Watermark text={t('watermark.default')} />

      {/* ★★★ 性能监控悬浮面板 ★★★ */}
      <PerfPanel />

      {/* ★★★ PWA 安装提示 ★★★ */}
      <PWAInstallPrompt />
    </Layout>
  );
};

export default MainLayout;
