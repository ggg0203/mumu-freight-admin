/**
 * ★★★ RBAC 数据管理层 ★★★
 *
 * 集中管理菜单和角色数据，实现页面间数据共享：
 * - MenuList 增删改菜单 → 侧边栏实时更新
 * - RoleList 修改权限 → 权限校验实时生效
 * - 所有模块读同一份缓存
 */

// ==================== 菜单类型 ====================

export interface MenuItem {
  id: number;
  parentId: number | null;
  name: string;
  icon: string;
  path: string;
  component: string;
  perm: string;
  sort: number;
  type: 'directory' | 'menu' | 'button';
  status: '启用' | '禁用';
  children?: MenuItem[];
}

export interface RoleItem {
  id: number;
  roleName: string;
  roleKey: string;
  roleSort: number;
  status: '启用' | '禁用';
  createTime: string;
  permIds: number[];
}

// ==================== 模块级缓存 ====================

let menuData: MenuItem[] | null = null;
let roleData: RoleItem[] | null = null;

// ---- 菜单数据 ----

export const getMenuData = (): MenuItem[] => {
  if (!menuData) menuData = generateDefaultMenus();
  return menuData;
};

export const setMenuData = (data: MenuItem[]) => {
  menuData = data;
};

// ---- 角色数据 ----

export const getRoleData = (): RoleItem[] => {
  if (!roleData) roleData = generateDefaultRoles();
  return roleData;
};

export const setRoleData = (data: RoleItem[]) => {
  roleData = data;
};

// 重置缓存（用于测试）
export const resetData = () => {
  menuData = null;
  roleData = null;
};

// ==================== 默认数据 ====================

const generateDefaultMenus = (): MenuItem[] => [
  {
    id: 1, parentId: null, name: '系统管理', icon: 'SettingOutlined', path: '/system', component: '', perm: '', sort: 1, type: 'directory', status: '启用',
    children: [
      {
        id: 11, parentId: 1, name: '用户管理', icon: 'UserOutlined', path: '/user-list', component: 'UserList', perm: 'system:user:list', sort: 1, type: 'menu', status: '启用',
        children: [
          { id: 111, parentId: 11, name: '新增用户', icon: '', path: '', component: '', perm: 'system:user:add', sort: 1, type: 'button', status: '启用' },
          { id: 112, parentId: 11, name: '编辑用户', icon: '', path: '', component: '', perm: 'system:user:edit', sort: 2, type: 'button', status: '启用' },
          { id: 113, parentId: 11, name: '删除用户', icon: '', path: '', component: '', perm: 'system:user:delete', sort: 3, type: 'button', status: '启用' },
        ],
      },
      { id: 12, parentId: 1, name: '菜单管理', icon: 'MenuOutlined', path: '/menu-list', component: 'MenuList', perm: 'system:menu:list', sort: 2, type: 'menu', status: '启用' },
      { id: 13, parentId: 1, name: '角色管理', icon: 'TeamOutlined', path: '/role-list', component: 'RoleList', perm: 'system:role:list', sort: 3, type: 'menu', status: '启用' },
      { id: 14, parentId: 1, name: '部门管理', icon: 'ApartmentOutlined', path: '/dept-list', component: 'DeptList', perm: 'system:dept:list', sort: 4, type: 'menu', status: '启用' },
    ],
  },
  {
    id: 2, parentId: null, name: '运营管理', icon: 'ProfileOutlined', path: '/operation', component: '', perm: '', sort: 2, type: 'directory', status: '启用',
    children: [
      { id: 21, parentId: 2, name: '订单管理', icon: 'OrderedListOutlined', path: '/order', component: 'Order', perm: 'operation:order:list', sort: 1, type: 'menu', status: '启用' },
      { id: 26, parentId: 2, name: '订单看板', icon: 'AppstoreOutlined', path: '/order-kanban', component: 'OrderKanban', perm: 'operation:order:kanban', sort: 2, type: 'menu', status: '启用' },
      { id: 22, parentId: 2, name: '订单聚合', icon: 'ClusterOutlined', path: '/order-cluster', component: 'OrderCluster', perm: 'operation:order:cluster', sort: 3, type: 'menu', status: '启用' },
      { id: 24, parentId: 2, name: '运单追踪', icon: 'EnvironmentOutlined', path: '/order-trace', component: 'OrderTrace', perm: 'operation:order:trace', sort: 4, type: 'menu', status: '启用' },
      { id: 25, parentId: 2, name: '路线规划', icon: 'SafetyOutlined', path: '/route-planning', component: 'RoutePlanning', perm: 'operation:route:plan', sort: 5, type: 'menu', status: '启用' },
      { id: 23, parentId: 2, name: '司机列表', icon: 'CarOutlined', path: '/driver-list', component: 'DriverList', perm: 'operation:driver:list', sort: 6, type: 'menu', status: '启用' },
    ],
  },
  {
    id: 3, parentId: null, name: '数据统计', icon: 'BarChartOutlined', path: '/stats', component: '', perm: '', sort: 3, type: 'directory', status: '启用',
    children: [
      { id: 31, parentId: 3, name: '数据概览', icon: 'DashboardOutlined', path: '/dashboard', component: 'Dashboard', perm: 'stats:dashboard:view', sort: 1, type: 'menu', status: '启用' },
      { id: 32, parentId: 3, name: '数据大屏', icon: 'DesktopOutlined', path: '/screen', component: 'BigScreen', perm: 'stats:screen:view', sort: 2, type: 'menu', status: '启用' },
      { id: 33, parentId: 3, name: '智能报表', icon: 'BarChartOutlined', path: '/reports', component: 'ReportCenter', perm: 'stats:report:view', sort: 3, type: 'menu', status: '启用' },
      { id: 34, parentId: 3, name: '热力地图', icon: 'HeatMapOutlined', path: '/heatmap', component: 'HeatmapView', perm: 'stats:heatmap:view', sort: 4, type: 'menu', status: '启用' },
      { id: 35, parentId: 3, name: '3D货运网络', icon: 'GlobalOutlined', path: '/three-globe', component: 'ThreeGlobe', perm: 'stats:globe:view', sort: 5, type: 'menu', status: '启用' },
      { id: 36, parentId: 3, name: '智能订单预测', icon: 'LineChartOutlined', path: '/order-prediction', component: 'OrderPrediction', perm: 'stats:prediction:view', sort: 6, type: 'menu', status: '启用' },
    ],
  },
  {
    id: 4, parentId: null, name: '其他', icon: 'ReadOutlined', path: '/other', component: '', perm: '', sort: 4, type: 'directory', status: '启用',
    children: [
      { id: 41, parentId: 4, name: '课程管理', icon: 'ReadOutlined', path: '/course', component: 'Course', perm: 'other:course:list', sort: 1, type: 'menu', status: '启用' },
      { id: 42, parentId: 4, name: '系统设置', icon: 'SettingOutlined', path: '/settings', component: 'Settings', perm: 'other:settings:view', sort: 2, type: 'menu', status: '启用' },
      { id: 43, parentId: 4, name: '操作审计日志', icon: 'SafetyOutlined', path: '/audit-log', component: 'AuditLog', perm: 'other:audit:view', sort: 3, type: 'menu', status: '启用' },
    ],
  },
];

const generateDefaultRoles = (): RoleItem[] => [
  { id: 1, roleName: '超级管理员', roleKey: 'admin', roleSort: 1, status: '启用', createTime: '2024-01-01 09:00:00', permIds: [1, 2, 3, 4, 11, 12, 13, 14, 111, 112, 113, 21, 26, 22, 23, 24, 25, 31, 32, 33, 34, 35, 36, 41, 42, 43] },
  { id: 2, roleName: '运营主管', roleKey: 'operation', roleSort: 2, status: '启用', createTime: '2024-01-15 10:30:00', permIds: [2, 21, 26, 22, 23, 24, 25, 3, 31, 32, 33, 34, 35, 36] },
  { id: 3, roleName: '客服人员', roleKey: 'service', roleSort: 3, status: '启用', createTime: '2024-03-10 16:20:00', permIds: [21] },
];

// ==================== 工具函数 ====================

/** 扁平化菜单树 */
export const flattenMenus = (items: MenuItem[]): MenuItem[] => {
  const result: MenuItem[] = [];
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      result.push(item);
      if (item.children) walk(item.children);
    }
  };
  walk(items);
  return result;
};

/** 根据 permIds 过滤菜单树（保留有权限的节点及其父级链） */
export const filterMenuTree = (items: MenuItem[], allowedIds: number[]): MenuItem[] => {
  const allowed = new Set(allowedIds);
  return items
    .filter((item) => allowed.has(item.id) || item.children?.some((c) => allowed.has(c.id)))
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuTree(item.children, allowedIds) : [],
    }))
    .filter((item) => item.children?.length || allowed.has(item.id));
};

/** 根据角色名获取权限 ID 列表 */
export const getPermIdsByRole = (roleName: string): number[] => {
  const roles = getRoleData();
  const role = roles.find((r) => r.roleName === roleName);
  return role?.permIds ?? [];
};

/** 根据当前角色获取可访问的菜单树 */
export const getFilteredMenuTree = (roleName: string): MenuItem[] => {
  const allMenus = getMenuData();
  const permIds = getPermIdsByRole(roleName);
  return filterMenuTree(allMenus, permIds);
};

/** 获取当前角色拥有的所有权限标识（扁平字符串列表） */
export const getPermStrings = (roleName: string): string[] => {
  const allMenus = getMenuData();
  const permIds = getPermIdsByRole(roleName);
  const allowed = new Set(permIds);
  return flattenMenus(allMenus)
    .filter((m) => allowed.has(m.id) && m.perm)
    .map((m) => m.perm);
};
