/**
 * ★★★ Mock 数据模块 ★★★
 *
 * 使用 Mock.js 模拟后端 API 数据，让前端可以独立开发和调试
 * 开发环境下启用 Mock，生产环境自动关闭
 *
 * 学习要点：
 * - Mock.js 语法：@string、@integer、@boolean 等数据模板
 * - 拦截 Axios 请求，返回模拟数据
 * - 模拟登录验证逻辑
 */

import Mock from 'mockjs';
import type { MockjsRequestOptions } from 'mockjs';
import storage, { STORAGE_KEYS } from '@/utils/storage';

// ==================== 模拟数据配置 ====================

/** 模拟用户数据 */
const mockUser = {
  id: 1,
  username: 'admin',
  password: 'admin123', // 实际项目中密码不会明文存储
  nickname: '管理员',
  avatar: '',
  email: 'admin@mumu.com',
  phone: '13800138000',
  role: 'admin',
  status: 1,
  createTime: '2024-01-01 00:00:00',
};

/** 模拟 Token */
const mockToken = 'mock_token_mumu_freight_admin_' + Date.now();

// ==================== 菜单配置 ====================

/** 侧边栏菜单数据（含二级三级） */
const menuData = [
  // 一级菜单
  { id: 1, name: '数据概览', icon: 'DashboardOutlined', path: '/dashboard', parentId: null, sort: 1, type: 'menu', status: '启用', component: 'Dashboard', perm: 'stats:dashboard:list' },
  { id: 2, name: '订单管理', icon: 'OrderedListOutlined', path: '/order', parentId: null, sort: 2, type: 'directory', status: '启用', component: '', perm: 'operation:order:list' },
  { id: 3, name: '课程管理', icon: 'ReadOutlined', path: '/course', parentId: null, sort: 3, type: 'menu', status: '启用', component: 'Course', perm: 'course:list' },
  { id: 4, name: '系统管理', icon: 'SettingOutlined', path: '/system', parentId: null, sort: 4, type: 'directory', status: '启用', component: '', perm: 'system:list' },
  // 二级菜单（订单管理下）
  { id: 21, name: '订单列表', icon: 'FileTextOutlined', path: '/order', parentId: 2, sort: 1, type: 'menu', status: '启用', component: 'Order', perm: 'operation:order:list' },
  { id: 22, name: '订单看板', icon: 'AppstoreOutlined', path: '/order-kanban', parentId: 2, sort: 2, type: 'menu', status: '启用', component: 'OrderKanban', perm: 'operation:order:kanban' },
  { id: 23, name: '订单聚合', icon: 'ApartmentOutlined', path: '/order-cluster', parentId: 2, sort: 3, type: 'menu', status: '启用', component: 'OrderCluster', perm: 'operation:order:cluster' },
  { id: 24, name: '运单追踪', icon: 'CarOutlined', path: '/order-trace', parentId: 2, sort: 4, type: 'menu', status: '启用', component: 'OrderTrace', perm: 'operation:order:trace' },
  { id: 25, name: '路线规划', icon: 'ControlOutlined', path: '/route-planning', parentId: 2, sort: 5, type: 'menu', status: '启用', component: 'RoutePlanning', perm: 'operation:route:list' },
  // 二级菜单（系统管理下）
  { id: 41, name: '用户管理', icon: 'UserOutlined', path: '/user', parentId: 4, sort: 1, type: 'menu', status: '启用', component: 'UserList', perm: 'system:user:list' },
  { id: 42, name: '菜单管理', icon: 'MenuOutlined', path: '/menu', parentId: 4, sort: 2, type: 'menu', status: '启用', component: 'MenuList', perm: 'system:menu:list' },
  { id: 43, name: '角色管理', icon: 'TeamOutlined', path: '/role', parentId: 4, sort: 3, type: 'menu', status: '启用', component: 'RoleList', perm: 'system:role:list' },
  { id: 44, name: '部门管理', icon: 'BankOutlined', path: '/dept', parentId: 4, sort: 4, type: 'menu', status: '启用', component: 'DeptList', perm: 'system:dept:list' },
  { id: 45, name: '审计日志', icon: 'SafetyOutlined', path: '/audit', parentId: 4, sort: 5, type: 'menu', status: '启用', component: 'AuditLog', perm: 'system:audit:list' },
  // 三级菜单（用户管理下的按钮权限示例）
  { id: 411, name: '新增用户', icon: '', path: '', parentId: 41, sort: 1, type: 'button', status: '启用', component: '', perm: 'system:user:create' },
  { id: 412, name: '编辑用户', icon: '', path: '', parentId: 41, sort: 2, type: 'button', status: '启用', component: '', perm: 'system:user:edit' },
  { id: 413, name: '删除用户', icon: '', path: '', parentId: 41, sort: 3, type: 'button', status: '启用', component: '', perm: 'system:user:delete' },
];

// ==================== 部门配置（含二级三级）====================

const deptData = [
  // 一级部门
  { id: 1, name: '总公司', parentId: null, sort: 1, leader: '张三', phone: '13800138000', email: 'zhangsan@mumu.com', status: '启用', createTime: '2024-01-01 00:00:00' },
  // 二级部门
  { id: 2, name: '技术部', parentId: 1, sort: 1, leader: '李四', phone: '13800138001', email: 'lisi@mumu.com', status: '启用', createTime: '2024-01-02 00:00:00' },
  { id: 3, name: '市场部', parentId: 1, sort: 2, leader: '王五', phone: '13800138002', email: 'wangwu@mumu.com', status: '启用', createTime: '2024-01-03 00:00:00' },
  { id: 4, name: '人事部', parentId: 1, sort: 3, leader: '赵六', phone: '13800138003', email: 'zhaoliu@mumu.com', status: '启用', createTime: '2024-01-04 00:00:00' },
  // 三级部门
  { id: 21, name: '前端组', parentId: 2, sort: 1, leader: '', phone: '', email: '', status: '启用', createTime: '2024-02-01 00:00:00' },
  { id: 22, name: '后端组', parentId: 2, sort: 2, leader: '', phone: '', email: '', status: '启用', createTime: '2024-02-02 00:00:00' },
  { id: 23, name: '测试组', parentId: 2, sort: 3, leader: '', phone: '', email: '', status: '启用', createTime: '2024-02-03 00:00:00' },
];

// ==================== 角色配置 ====================

const roleData = [
  { id: 1, name: '超级管理员', roleKey: 'admin', roleSort: 1, status: '启用', description: '系统超级管理员，拥有所有权限', permissions: '*,*:*:*', createTime: '2024-01-01 00:00:00' },
  { id: 2, name: '普通管理员', roleKey: 'editor', roleSort: 2, status: '启用', description: '普通管理员，拥有部分权限', permissions: 'system:user:list,system:menu:list', createTime: '2024-01-02 00:00:00' },
  { id: 3, name: '访客', roleKey: 'visitor', roleSort: 3, status: '启用', description: '访客角色，只有查看权限', permissions: 'dashboard:view', createTime: '2024-01-03 00:00:00' },
];

// ==================== 生成模拟订单数据 ====================

const orderStatusList = ['pending', 'processing', 'completed', 'cancelled'];
const goodsTypeList = ['电子产品', '食品生鲜', '日用百货', '机械设备', '化工原料', '快递包裹'];
const cityList = [
  '北京市',
  '上海市',
  '广州市',
  '深圳市',
  '杭州市',
  '成都市',
  '武汉市',
  '南京市',
  '重庆市',
  '西安市',
];

function generateMockOrders(count = 50) {
  const orders: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    orders.push({
      id: i + 1,
      orderNo: `MUMU${String(Date.now()).slice(-8)}${String(i + 1).padStart(4, '0')}`,
      customerName: '@cname',
      customerPhone: /^1[3-9]\d{9}$/,
      origin: `@pick(${JSON.stringify(cityList)})`,
      destination: `@pick(${JSON.stringify(cityList)})`,
      goodsType: `@pick(${JSON.stringify(goodsTypeList)})`,
      weight: '@float(10, 5000, 1, 2)',
      volume: '@float(0.5, 100, 1, 2)',
      amount: '@float(100, 50000, 2, 2)',
      status: `@pick(${JSON.stringify(orderStatusList)})`,
      driverName: '@cname',
      driverPhone: /^1[3-9]\d{9}$/,
      createTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
      updateTime: '@datetime("yyyy-MM-dd HH:mm:ss")',
    });
  }
  return orders;
}

// ==================== 注册 Mock 接口 ====================

/** 是否已启用 Mock */
let mockEnabled = false;

/**
 * 启用 Mock 数据
 * 在开发环境下自动调用
 */
export function enableMock(): void {
  if (mockEnabled) return;
  mockEnabled = true;

  // 设置 Mock 响应延迟，模拟真实网络（100-500ms）
  Mock.setup({
    timeout: '100-500',
  });

  // ====== 登录接口 ======
  Mock.mock(/\/api\/user\/login/, 'post', (options: MockjsRequestOptions) => {
    const { username, password } = JSON.parse(options.body);

    if (username === mockUser.username && password === mockUser.password) {
      return {
        code: 200,
        message: '登录成功',
        data: {
          token: mockToken,
          userInfo: { ...mockUser },
        },
      };
    }

    return {
      code: 401,
      message: '用户名或密码错误',
      data: null,
    };
  });

  // ====== 获取用户信息 ======
  Mock.mock(/\/api\/user\/info/, 'get', () => ({
    code: 200,
    message: '获取成功',
    data: { ...mockUser },
  }));

  // ====== 获取菜单 ======
  Mock.mock(/\/api\/menu\/list/, 'get', () => ({
    code: 200,
    message: '获取成功',
    data: menuData,
  }));

  // ====== 获取仪表盘统计 ======
  Mock.mock(/\/api\/dashboard\/stats/, 'get', () => ({
    code: 200,
    message: '获取成功',
    data: {
      totalOrders: 1586,
      todayOrders: 47,
      monthlyRevenue: 1256800.5,
      activeDrivers: 328,
      orderTrend: Array.from({ length: 7 }, (_, i) => ({
        date: Mock.Random.date('2024-01-'),
        count: Mock.Random.integer(30, 80),
      })),
      revenueTrend: Array.from({ length: 12 }, (_, i) => ({
        date: `2024-${String(i + 1).padStart(2, '0')}`,
        amount: Mock.Random.float(800000, 1500000, 2, 2),
      })),
    },
  }));

  // ====== 获取订单列表 ======
  Mock.mock(/\/api\/order\/list/, 'get', (options: MockjsRequestOptions) => {
    const { page = 1, pageSize = 10 } = Mock.mock({
      'page|+1': 1,
    });
    // 从 URL 获取参数
    const urlParams = new URLSearchParams(options.url.split('?')[1] || '');
    const p = parseInt(urlParams.get('page') || '1');
    const ps = parseInt(urlParams.get('pageSize') || '10');

    const orders = generateMockOrders(100);
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageData = orders.slice(start, end);

    return {
      code: 200,
      message: '获取成功',
      data: {
        list: pageData,
        total: 100,
        page: p,
        pageSize: ps,
      },
    };
  });


  // ===== 获取部门列表 =====
  Mock.mock(/\/api\/dept\/list/, 'get', () => ({
    code: 200, message: '获取成功', data: deptData,
  }));

  // ===== 新增部门 =====
  Mock.mock(/\/api\/dept\/create/, 'post', (options: MockjsRequestOptions) => {
    const body = JSON.parse(options.body);
    const newDept = { ...body, id: Date.now(), createTime: new Date().toISOString() };
    deptData.push(newDept);
    return { code: 200, message: '新增成功', data: newDept };
  });

  // ===== 编辑部门 =====
  Mock.mock(/\/api\/dept\/\d+/, 'put', (options: MockjsRequestOptions) => {
    const body = JSON.parse(options.body);
    const id = parseInt(options.url.match(/\/api\/dept\/(\d+)/)?.[1] || '0');
    const idx = deptData.findIndex((d: any) => d.id === id);
    if (idx !== -1) Object.assign(deptData[idx], body);
    return { code: 200, message: '编辑成功', data: null };
  });

  // ===== 删除部门 =====
  Mock.mock(/\/api\/dept\/\d+/, 'delete', (options: MockjsRequestOptions) => {
    const id = parseInt(options.url.match(/\/api\/dept\/(\d+)/)?.[1] || '0');
    const idx = deptData.findIndex((d: any) => d.id === id);
    if (idx !== -1) deptData.splice(idx, 1);
    return { code: 200, message: '删除成功', data: null };
  });

  // ===== 获取角色列表 =====
  Mock.mock(/\/api\/role\/list/, 'get', () => ({
    code: 200, message: '获取成功', data: roleData,
  }));

  // ===== 新增角色 =====
  Mock.mock(/\/api\/role\/create/, 'post', (options: MockjsRequestOptions) => {
    const body = JSON.parse(options.body);
    const newRole = { ...body, id: Date.now(), createTime: new Date().toISOString() };
    roleData.push(newRole);
    return { code: 200, message: '新增成功', data: newRole };
  });

  // ===== 编辑角色 =====
  Mock.mock(/\/api\/role\/\d+/, 'put', (options: MockjsRequestOptions) => {
    const body = JSON.parse(options.body);
    const id = parseInt(options.url.match(/\/api\/role\/(\d+)/)?.[1] || '0');
    const idx = roleData.findIndex((r: any) => r.id === id);
    if (idx !== -1) Object.assign(roleData[idx], body);
    return { code: 200, message: '编辑成功', data: null };
  });

  // ===== 删除角色 =====
  Mock.mock(/\/api\/role\/\d+/, 'delete', (options: MockjsRequestOptions) => {
    const id = parseInt(options.url.match(/\/api\/role\/(\d+)/)?.[1] || '0');
    const idx = roleData.findIndex((r: any) => r.id === id);
    if (idx !== -1) roleData.splice(idx, 1);
    return { code: 200, message: '删除成功', data: null };
  });

  // ===== 获取用户列表 =====
  Mock.mock(/\/api\/user\/list/, 'get', () => ({
    code: 200, message: '获取成功', data: [
      { id: 1, username: 'admin', nickname: '管理员', avatar: '', email: 'admin@mumu.com', phone: '13800138000', role: 'admin', status: 1, createTime: '2024-01-01 00:00:00' },
      { id: 2, username: 'editor', nickname: '编辑员', avatar: '', email: 'editor@mumu.com', phone: '13800138001', role: 'editor', status: 1, createTime: '2024-02-01 00:00:00' },
      { id: 3, username: 'user1', nickname: '张三', avatar: '', email: 'zhangsan@mumu.com', phone: '13800138002', role: 'user', status: 1, createTime: '2024-03-01 00:00:00' },
    ],
  }));

  console.log('[Mock] 模拟数据已启用，可使用 admin / admin123 登录');
}

/**
 * 判断是否应该启用 Mock
 * 已对接真实后端，关闭 Mock
 */
export function shouldEnableMock(): boolean {
  return true; // 启用 Mock 数据，支持部门/角色/菜单的二级三级数据
}
