/**
 * ★★★ 统一 API 服务层 ★★★
 *
 * 所有页面统一从此文件导入 API 方法，
 * 自动拼接 baseURL，自动处理 ApiResponse 格式。
 */
import axios from 'axios';
import type { ApiResponse } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080',
  timeout: 1000,
});

api.interceptors.response.use(
  (res) => res.data as ApiResponse,
  (err) => {
    console.error('[API] 请求失败:', err);
    return Promise.reject(err);
  },
);

// ==================== 通用类型 ====================

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 用户管理 ====================

export interface UserInfo {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  email: string;
  phone: string;
  role: string;
  status: number;
  createTime: string;
}

export interface UserCreateParams {
  username: string;
  password: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: number;
}

export const userApi = {
  /** 列表 */
  list: (params?: { keyword?: string; role?: string }) =>
    api.get<any, UserInfo[]>('/api/user/list', { params }),
  /** 新增 */
  create: (data: UserCreateParams) =>
    api.post<any, UserInfo>('/api/user/create', data),
  /** 编辑 */
  update: (id: number, data: Partial<UserCreateParams>) =>
    api.put<any, null>(`/api/user/${id}`, data),
  /** 删除 */
  delete: (id: number) =>
    api.delete<any, null>(`/api/user/${id}`),
};

// ==================== 部门管理 ====================

export interface DeptItem {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  leader: string;
  phone: string;
  email: string;
  status: string;
  createTime: string;
}

export const deptApi = {
  list: (params?: { keyword?: string }) =>
    api.get<any, DeptItem[]>('/api/dept/list', { params }),
  create: (data: { name: string; parentId?: number; sort?: number }) =>
    api.post<any, DeptItem>('/api/dept/create', data),
  update: (id: number, data: Partial<{ name?: string; parentId?: number; sort?: number }>) =>
    api.put<any, null>(`/api/dept/${id}`, data),
  delete: (id: number) =>
    api.delete<any, null>(`/api/dept/${id}`),
};

// ==================== 角色管理 ====================

export interface RoleItem {
  id: number;
  name: string;
  roleKey: string;
  roleSort: number;
  status: string;
  description: string;
  permissions: string;
  createTime: string;
}

export const roleApi = {
  list: (params?: { keyword?: string }) =>
    api.get<any, RoleItem[]>('/api/role/list', { params }),
  create: (data: { name: string; description?: string; permissions?: string }) =>
    api.post<any, RoleItem>('/api/role/create', data),
  update: (id: number, data: Partial<{ name?: string; description?: string; permissions?: string }>) =>
    api.put<any, null>(`/api/role/${id}`, data),
  delete: (id: number) =>
    api.delete<any, null>(`/api/role/${id}`),
};

// ==================== 菜单管理 ====================

export interface MenuItem {
  id: number;
  name: string;
  icon: string;
  path: string;
  parentId: number | null;
  sort: number;
  type: string;
  status: string;
  component: string;
  perm: string;
}

export const menuApi = {
  list: () => api.get<any, MenuItem[]>('/api/menu/list'),
  create: (data: { name: string; icon?: string; path?: string; parentId?: number; sort?: number; type?: string; status?: string; component?: string; perm?: string }) =>
    api.post<any, MenuItem>('/api/menu/create', data),
  update: (id: number, data: Partial<{ name?: string; icon?: string; path?: string; parentId?: number; sort?: number; type?: string; status?: string; component?: string; perm?: string }>) =>
    api.put<any, null>(`/api/menu/${id}`, data),
  delete: (id: number) =>
    api.delete<any, null>(`/api/menu/${id}`),
};

// ==================== 订单管理 ====================

export interface OrderItem {
  id: number;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  origin: string;
  destination: string;
  goodsType: string;
  weight: number;
  volume: number;
  amount: number;
  status: string;
  driverName?: string;
  driverPhone?: string;
  createTime: string;
  updateTime: string;
}

export const orderApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }) => api.get<any, PageResult<OrderItem>>('/api/order/list', { params }),
  detail: (id: number) => api.get<any, OrderItem>(`/api/order/detail/${id}`),
  create: (data: any) => api.post<any, OrderItem>('/api/order/create', data),
  updateStatus: (id: number, status: string) =>
    api.put<any, null>(`/api/order/status/${id}`, { status }),
};

// ==================== 司机管理 ====================

export interface DriverItem {
  id: number;
  name: string;
  phone: string;
  city: string;
  plateNumber: string;
  rating: number;
  orderCount: number;
  status: string;
  registerTime: string;
  avatar: string;
  age: number;
  yearsOfExperience: number;
  idCard: string;
  address: string;
}

export const driverApi = {
  list: (params?: { name?: string; phone?: string; city?: string; status?: string }) =>
    api.get<any, DriverItem[]>('/api/driver/list', { params }),
  detail: (id: number) => api.get<any, DriverItem>(`/api/driver/detail/${id}`),
  updateStatus: (id: number, status: string) =>
    api.put<any, null>(`/api/driver/status/${id}`, { status }),
};

// ==================== Dashboard ====================

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  totalDrivers: number;
  activeDrivers: number;
  todayOrders: number;
  todayRevenue: number;
  orderTrend: { date: string; count: number }[];
  cityRank: { city: string; count: number }[];
}

export const dashboardApi = {
  stats: () => api.get<any, DashboardStats>('/api/dashboard/stats'),
};

// ==================== 审计日志 ====================

export interface AuditLogItem {
  id: number;
  operator: string;
  module: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
  result: string;
  time: string;
}

export const auditLogApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    module?: string;
    action?: string;
    operator?: string;
    keyword?: string;
  }) => api.get<any, PageResult<AuditLogItem>>('/api/audit-log/list', { params }),
};

// ==================== 课程 ====================

export interface CourseItem {
  id: number;
  title: string;
  category: string;
  duration: string;
  students: number;
  progress: number;
  status: string;
  color: string;
}

export const courseApi = {
  list: () => api.get<any, CourseItem[]>('/api/course/list'),
  updateProgress: (id: number, progress: number, status: string, students?: number) =>
    api.put<any, CourseItem>(`/api/course/progress/${id}`, { progress, status, students }),
};
