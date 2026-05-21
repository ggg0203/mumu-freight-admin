/**
 * ★★★ 通用 API 类型定义 ★★★
 * 本项目所有接口响应的类型定义集中管理
 */

// ==================== 通用响应结构 ====================

/**
 * 通用 API 响应格式
 * 所有后端接口统一返回此结构
 */
export interface ApiResponse<T = unknown> {
  code: number; // 状态码：200 成功，其他为失败
  data: T; // 响应数据
  message: string; // 提示信息
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page: number; // 当前页码
  pageSize: number; // 每页条数
}

/**
 * 分页响应数据
 */
export interface PaginationResult<T> {
  list: T[]; // 数据列表
  total: number; // 总条数
  page: number; // 当前页码
  pageSize: number; // 每页条数
}

// ==================== 登录相关 ====================

/** 登录请求参数 */
export interface LoginParams {
  username: string;
  password: string;
}

/** 登录响应数据 */
export interface LoginResult {
  token: string;
  userInfo: UserInfo;
}

// ==================== 用户相关 ====================

/** 用户信息 */
export interface UserInfo {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'user'; // 角色：管理员/普通用户
  status: number; // 状态：1启用 0禁用
  createTime: string;
}

// ==================== 菜单相关 ====================

/** 菜单项 */
export interface MenuItem {
  id: number;
  name: string; // 菜单名称
  icon?: string; // 图标名称
  path: string; // 路由路径
  component?: string; // 组件路径
  parentId: number | null; // 父级ID
  sort: number; // 排序
  children?: MenuItem[]; // 子菜单
  hidden?: boolean; // 是否隐藏
}

// ==================== 订单相关 ====================

/** 订单信息 */
export interface OrderInfo {
  id: number;
  orderNo: string; // 订单编号
  customerName: string; // 客户名称
  customerPhone: string; // 客户电话
  origin: string; // 发货地
  destination: string; // 目的地
  goodsType: string; // 货物类型
  weight: number; // 货物重量(kg)
  volume: number; // 货物体积(m³)
  amount: number; // 订单金额
  status: OrderStatus; // 订单状态
  driverName?: string; // 司机姓名
  driverPhone?: string; // 司机电话
  createTime: string;
  updateTime: string;
}

/** 订单状态枚举 */
export type OrderStatus =
  | 'pending' // 待处理
  | 'processing' // 运输中
  | 'completed' // 已完成
  | 'cancelled'; // 已取消

// ==================== 统计相关 ====================

/** 统计数据 */
export interface DashboardStats {
  totalOrders: number; // 总订单数
  todayOrders: number; // 今日订单
  monthlyRevenue: number; // 本月收入
  activeDrivers: number; // 活跃司机数
  orderTrend: { date: string; count: number }[]; // 订单趋势
  revenueTrend: { date: string; amount: number }[]; // 收入趋势
}
