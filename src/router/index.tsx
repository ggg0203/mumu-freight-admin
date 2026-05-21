/**
 * ★★★ 路由配置 (React Router v6) ★★★
 *
 * 学习要点：
 * 1. createBrowserRouter：使用 API 方式创建路由（非 JSX 方式）
 * 2. 嵌套路由：通过 children 实现布局嵌套
 * 3. 路由守卫：通过 loader 或组件内判断实现权限控制
 * 4. 动态路由：:id 参数传递
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import MainLayout from '@/layouts/MainLayout';

// ==================== 路由懒加载 ====================

/**
 * ★★★ React.lazy() 实现路由懒加载 ★★★
 *
 * 为什么需要懒加载？
 * - 页面组件按需加载，减少首屏包体积
 * - 配合 Suspense 显示加载状态
 * - 提升用户体验
 */

/* ---- 基础页面 ---- */
const Login = lazy(() => import('@/pages/Login'));
const Welcome = lazy(() => import('@/pages/Welcome'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const BigScreen = lazy(() => import('@/pages/BigScreen'));

/* ---- 系统管理 ---- */
const UserList = lazy(() => import('@/pages/UserList'));
const MenuList = lazy(() => import('@/pages/MenuList'));
const RoleList = lazy(() => import('@/pages/RoleList'));
const DeptList = lazy(() => import('@/pages/DeptList'));

/* ---- 运营管理 ---- */
const Order = lazy(() => import('@/pages/Order'));
const OrderCluster = lazy(() => import('@/pages/OrderCluster'));
const OrderKanban = lazy(() => import('@/pages/OrderKanban'));
const OrderTrace = lazy(() => import('@/pages/OrderTrace'));
const RoutePlanning = lazy(() => import('@/pages/RoutePlanning'));
const DriverList = lazy(() => import('@/pages/DriverList'));

/* ---- 其他 ---- */
const Course = lazy(() => import('@/pages/Course'));
const Settings = lazy(() => import('@/pages/Settings'));
const ReportCenter = lazy(() => import('@/pages/ReportCenter'));
const HeatmapView = lazy(() => import('@/pages/HeatmapView'));
const ThreeGlobe = lazy(() => import('@/pages/ThreeGlobe'));
const OrderPrediction = lazy(() => import('@/pages/OrderPrediction'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));

/**
 * 路由懒加载的 Suspense 包裹组件
 * 在页面加载完成前显示加载动画
 */
function LazyLoad({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

// ==================== 路由配置 ====================

/**
 * 使用 createBrowserRouter API 创建路由
 * React Router v6 推荐的方式
 *
 * 路由结构：
 * - /login          → 登录页（独立于主布局）
 * - /               → 主布局（包含侧边栏、头部）
 *   - /dashboard    → 数据概览（默认首页）
 *   - /order        → 订单管理
 *   - /order-cluster → 订单聚合
 *   - /driver-list  → 司机列表
 *   - /user-list    → 用户管理
 *   - /menu-list    → 菜单管理
 *   - /role-list    → 角色管理
 *   - /dept-list    → 部门管理
 *   - /course       → 课程管理
 *   - /settings     → 系统设置
 *   - /*            → 404 重定向到 /dashboard
 */
const router = createBrowserRouter(
  [
    // ★★★ 登录页面 - 独立路由，不包含在主布局中 ★★★
    {
      path: '/login',
      element: (
        <LazyLoad>
          <Login />
        </LazyLoad>
      ),
    },
    // ★★★ 数据大屏 - 全屏独立路由 ★★★
    {
      path: '/screen',
      element: (
        <LazyLoad>
          <BigScreen />
        </LazyLoad>
      ),
    },
    {
      // ★★★ 主布局路由 - 包含侧边栏、头部、底部 ★★★
      path: '/',
      element: <MainLayout />,
      children: [
        {
          // ★★★ 默认首页：/ 自动重定向到 /dashboard ★★★
          index: true,
          element: <Navigate to="/dashboard" replace />,
        },
        {
          // ★★★ 欢迎页 ★★★
          path: 'welcome',
          element: (
            <LazyLoad>
              <Welcome />
            </LazyLoad>
          ),
        },
        // ---- 数据统计 ----
        {
          path: 'dashboard',
          element: (
            <LazyLoad>
              <Dashboard />
            </LazyLoad>
          ),
        },
        // ---- 运营管理 ----
        {
          path: 'order',
          element: (
            <LazyLoad>
              <Order />
            </LazyLoad>
          ),
        },
        {
          path: 'order-cluster',
          element: (
            <LazyLoad>
              <OrderCluster />
            </LazyLoad>
          ),
        },
        {
          path: 'order-kanban',
          element: (
            <LazyLoad>
              <OrderKanban />
            </LazyLoad>
          ),
        },
        {
          path: 'order-trace',
          element: (
            <LazyLoad>
              <OrderTrace />
            </LazyLoad>
          ),
        },
        {
          path: 'route-planning',
          element: (
            <LazyLoad>
              <RoutePlanning />
            </LazyLoad>
          ),
        },
        {
          path: 'driver-list',
          element: (
            <LazyLoad>
              <DriverList />
            </LazyLoad>
          ),
        },
        // ---- 系统管理 ----
        {
          path: 'user-list',
          element: (
            <LazyLoad>
              <UserList />
            </LazyLoad>
          ),
        },
        {
          path: 'menu-list',
          element: (
            <LazyLoad>
              <MenuList />
            </LazyLoad>
          ),
        },
        {
          path: 'role-list',
          element: (
            <LazyLoad>
              <RoleList />
            </LazyLoad>
          ),
        },
        {
          path: 'dept-list',
          element: (
            <LazyLoad>
              <DeptList />
            </LazyLoad>
          ),
        },
        // ---- 其他 ----
        {
          path: 'course',
          element: (
            <LazyLoad>
              <Course />
            </LazyLoad>
          ),
        },
        {
          path: 'reports',
          element: (
            <LazyLoad>
              <ReportCenter />
            </LazyLoad>
          ),
        },
        {
          path: 'heatmap',
          element: (
            <LazyLoad>
              <HeatmapView />
            </LazyLoad>
          ),
        },
        {
          path: 'three-globe',
          element: (
            <LazyLoad>
              <ThreeGlobe />
            </LazyLoad>
          ),
        },
        {
          path: 'order-prediction',
          element: (
            <LazyLoad>
              <OrderPrediction />
            </LazyLoad>
          ),
        },
        {
          path: 'settings',
          element: (
            <LazyLoad>
              <Settings />
            </LazyLoad>
          ),
        },
        {
          path: 'audit-log',
          element: (
            <LazyLoad>
              <AuditLog />
            </LazyLoad>
          ),
        },
        {
          // ★★★ 404 兜底 - 未匹配的路由重定向到首页 ★★★
          path: '*',
          element: <Navigate to="/dashboard" replace />,
        },
      ],
    },
  ],
  {
    // ★★★ React Router v7 未来特性标记，消除控制台警告 ★★★
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
    },
  },
);

export default router;
