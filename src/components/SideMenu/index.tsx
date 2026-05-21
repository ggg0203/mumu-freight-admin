/**
 * ★★★ SideMenu - 侧边栏菜单 ★★★
 *
 * 功能：
 * 1. 从 userStore 读取动态菜单（已按权限过滤）
 * 2. 支持菜单展开/折叠
 * 3. 高亮当前选中的菜单项
 * 4. 响应式适配
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  DashboardOutlined,
  OrderedListOutlined,
  ReadOutlined,
  SettingOutlined,
  AppstoreOutlined,
  UserOutlined,
  MenuOutlined,
  TeamOutlined,
  ApartmentOutlined,
  CarOutlined,
  ClusterOutlined,
  BarChartOutlined,
  SafetyOutlined,
  ProfileOutlined,
  EnvironmentOutlined,
  DesktopOutlined,
  HeatMapOutlined,
  GlobalOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useUserStore } from '@/stores/userStore';
import styles from './index.module.css';

const { Sider } = Layout;

// 菜单名称到 i18n key 的映射
const menuNameToKey: Record<string, string> = {
  '系统管理': 'menu.system', '用户管理': 'menu.userList', '菜单管理': 'menu.menuList',
  '角色管理': 'menu.roleList', '部门管理': 'menu.deptList',
  '运营管理': 'menu.operation', '订单管理': 'menu.orderList',
  '订单看板': 'menu.orderKanban', '订单聚合': 'menu.orderCluster', '运单追踪': 'menu.orderTrace',
  '路线规划': 'menu.routePlanning',
  '司机列表': 'menu.driverList',
  '数据统计': 'menu.stats', '数据概览': 'menu.dashboard',
  '数据大屏': 'menu.bigScreen', '智能报表': 'menu.reports', '热力地图': 'menu.heatmap', '3D货运网络': 'menu.threeGlobe',
  '智能订单预测': 'menu.orderPrediction',
  '其他': 'menu.other', '课程管理': 'menu.course', '系统设置': 'menu.settings',
  '操作审计日志': 'menu.auditLog',
};

interface SideMenuProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

/**
 * 图标映射
 */
const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  OrderedListOutlined: <OrderedListOutlined />,
  ReadOutlined: <ReadOutlined />,
  SettingOutlined: <SettingOutlined />,
  UserOutlined: <UserOutlined />,
  MenuOutlined: <MenuOutlined />,
  TeamOutlined: <TeamOutlined />,
  ApartmentOutlined: <ApartmentOutlined />,
  CarOutlined: <CarOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  ProfileOutlined: <ProfileOutlined />,
  EnvironmentOutlined: <EnvironmentOutlined />,
  DesktopOutlined: <DesktopOutlined />,
  HeatMapOutlined: <HeatMapOutlined />,
  GlobalOutlined: <GlobalOutlined />,
  LineChartOutlined: <LineChartOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
};

/** 将 RBAC 菜单树转换为 Ant Design Menu items */
const convertMenuToItems = (
  items: import('@/rbac-data').MenuItem[],
  t: (key: string) => string
): import('antd').MenuProps['items'] => {
  return items
    .filter((item) => item.status === '启用')
    .map((item) => {
      const translatedName = t(menuNameToKey[item.name] || item.name);
      // 目录类型且有子菜单 → 分组
      if (item.type === 'directory' && item.children?.length) {
        return {
          key: item.path || String(item.id),
          icon: item.icon ? iconMap[item.icon] : <AppstoreOutlined />,
          label: translatedName,
          children: convertMenuToItems(item.children, t),
        };
      }
      // 菜单类型且有路由路径 → 可点击跳转
      if (item.type === 'menu' && item.path) {
        return {
          key: item.path,
          icon: item.icon ? iconMap[item.icon] : undefined,
          label: translatedName,
        };
      }
      // 按钮类型不显示在侧边栏
      return null;
    })
    .filter(Boolean);
};

/**
 * SideMenu 组件
 */
const SideMenu: React.FC<SideMenuProps> = ({ collapsed, onCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const menuList = useUserStore((s) => s.menuList);

  // 将 RBAC 菜单转换成 Ant Design Menu items
  const menuItems = convertMenuToItems(menuList as any, t);

  // 计算当前展开的子菜单 key
  const findOpenKeys = (pathname: string): string[] => {
    for (const item of menuList) {
      if (item.children?.some((child) => child.path === pathname)) {
        return [item.path || String(item.id)];
      }
    }
    return [];
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="md"
      collapsedWidth={64}
      style={{
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
      className={styles.sider}
    >
      <div className={styles.logo}>
        <AppstoreOutlined style={{ fontSize: collapsed ? 24 : 28, color: token.colorPrimary }} />
        {!collapsed && <span className={styles.logoText}>{t('app.name')}</span>}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={findOpenKeys(location.pathname)}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 'none' }}
      />
    </Sider>
  );
};

export default SideMenu;
