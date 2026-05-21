/**
 * ★★★ 统一业务数据共享层 ★★★
 *
 * 所有页面的业务数据集中管理，确保：
 * 1. 数据互相关联（订单司机来自司机列表、Dashboard 统计来自真实订单）
 * 2. 用户增删改操作持久化到 localStorage
 * 3. 页面间数据一致
 */

import storage, { STORAGE_KEYS } from '@/utils/storage';
import type { OrderInfo, OrderStatus } from '@/types/api';

// ==================== 司机数据类型 ====================

export interface DriverItem {
  id: number;
  name: string;
  phone: string;
  city: string;
  plateNumber: string;
  rating: number;
  orderCount: number;
  status: '空闲' | '运输中' | '离线';
  registerTime: string;
  avatar?: string;
  age: number;
  yearsOfExperience: number;
  idCard: string;
  address: string;
}

// ==================== 课程数据类型 ====================

export interface CourseItem {
  id: number;
  title: string;
  category: string;
  duration: string;
  students: number;
  progress: number;
  status: 'completed' | 'in_progress' | 'not_started';
  color: string;
}

// ==================== 统一数据结构 ====================

interface SharedData {
  orders: OrderInfo[];
  drivers: DriverItem[];
  courses: CourseItem[];
}

// ==================== 初始化数据 ====================

const driverNames = ['王大勇', '刘强', '陈明', '赵刚', '孙伟', '周磊', '吴浩', '郑宇', '冯达', '蒋斌', '沈飞', '韩冰', '杨帆', '朱超', '马亮'];
const cityNames = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市', '天津市', '苏州市', '长沙市', '郑州市', '青岛市'];
const goodsTypes = ['电子产品', '食品生鲜', '日用百货', '机械设备', '化工原料'];

const generateInitialData = (): SharedData => {
  // 1. 生成 15 个司机
  const drivers: DriverItem[] = driverNames.map((name, i) => ({
    id: i + 1,
    name,
    phone: `138${String(10000000 + i * 731).slice(0, 8)}`,
    city: cityNames[i],
    plateNumber: `京A·${String(10000 + i * 888).slice(0, 5)}`,
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    orderCount: Math.floor(Math.random() * 300 + 20 + i * 10),
    status: (['空闲', '运输中', '离线'] as const)[i % 3],
    registerTime: `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
    age: 25 + (i % 20),
    yearsOfExperience: 2 + (i % 15),
    idCard: `1101011990${String(100000 + i).slice(0, 6)}`,
    address: `${['北京市海淀区', '上海市浦东新区', '广州市天河区', '深圳市南山区'][i % 4]}路${i + 1}号`,
  }));

  const statuses: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled'];
  const months = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

  // 2. 生成 46 个订单（分配真实司机名）
  const orders: OrderInfo[] = Array.from({ length: 46 }, (_, i) => {
    const monthIdx = Math.floor(Math.random() * months.length);
    const day = 1 + Math.floor(Math.random() * 28);
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    const driver = drivers[Math.floor(Math.random() * drivers.length)];
    const origin = cityNames[Math.floor(Math.random() * cityNames.length)];
    let destination = cityNames[Math.floor(Math.random() * cityNames.length)];
    while (destination === origin) {
      destination = cityNames[Math.floor(Math.random() * cityNames.length)];
    }

    return {
      id: i + 1,
      orderNo: `MUMU${String(20240101 + i)}`,
      customerName: ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '陈二'][i % 10],
      customerPhone: `138${String(10000000 + i).slice(0, 8)}`,
      origin,
      destination,
      goodsType: goodsTypes[Math.floor(Math.random() * goodsTypes.length)],
      weight: Math.round(Math.random() * 5000 * 100) / 100,
      volume: Math.round(Math.random() * 100 * 100) / 100,
      amount: Math.round(Math.random() * 50000 * 100) / 100,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      driverName: driver.name,
      driverPhone: driver.phone,
      createTime: `${months[monthIdx]}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      updateTime: `${months[monthIdx]}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    };
  });

  // 3. 生成 6 个课程
  const courses: CourseItem[] = [
    { id: 1, title: '货运安全操作规范', category: '安全培训', duration: '2小时', students: 156, progress: 100, status: 'completed', color: '#52c41a' },
    { id: 2, title: '物流成本核算与管理', category: '财务管理', duration: '3小时', students: 98, progress: 60, status: 'in_progress', color: '#1677ff' },
    { id: 3, title: '客户沟通技巧进阶', category: '服务培训', duration: '1.5小时', students: 120, progress: 30, status: 'in_progress', color: '#faad14' },
    { id: 4, title: '运输路线优化策略', category: '运营管理', duration: '2.5小时', students: 85, progress: 0, status: 'not_started', color: '#ff4d4f' },
    { id: 5, title: '新能源车辆维护指南', category: '技术培训', duration: '4小时', students: 72, progress: 0, status: 'not_started', color: '#722ed1' },
    { id: 6, title: '危险品运输管理条例', category: '法规培训', duration: '1小时', students: 200, progress: 100, status: 'completed', color: '#13c2c2' },
  ];

  return { orders, drivers, courses };
};

// ==================== 数据读写 ====================

let sharedCache: SharedData | null = null;

const loadData = (): SharedData => {
  if (sharedCache) return sharedCache;
  const saved = storage.get<SharedData>(STORAGE_KEYS.SHARED_DATA);
  if (saved && saved.orders?.length) {
    sharedCache = saved;
  } else {
    sharedCache = generateInitialData();
    saveData(sharedCache);
  }
  return sharedCache;
};

const saveData = (data: SharedData) => {
  sharedCache = data;
  storage.set(STORAGE_KEYS.SHARED_DATA, data);
};

// ==================== 公开 API ====================

/** 获取所有订单 */
export const getOrders = (): OrderInfo[] => loadData().orders;

/** 更新订单列表 */
export const setOrders = (orders: OrderInfo[]) => {
  const data = loadData();
  data.orders = orders;
  saveData(data);
};

/** 获取所有司机 */
export const getDrivers = (): DriverItem[] => loadData().drivers;

/** 更新司机列表 */
export const setDrivers = (drivers: DriverItem[]) => {
  const data = loadData();
  data.drivers = drivers;
  saveData(data);
};

/** 获取所有课程 */
export const getCourses = (): CourseItem[] => loadData().courses;

/** 更新课程列表 */
export const setCourses = (courses: CourseItem[]) => {
  const data = loadData();
  data.courses = courses;
  saveData(data);
};

// ==================== Dashboard 统计函数 ====================

export interface DashboardStats {
  driverCount: number;
  totalRevenue: number;
  totalOrders: number;
  coveredCities: number;
  revenueTrend: number[];
  orderTrend: number[];
  trendMonths: string[];
  cityDistribution: { name: string; value: number }[];
  ageDistribution: { name: string; value: number }[];
}

/** 从真实订单和司机数据计算 Dashboard 统计 */
export const computeDashboardStats = (): DashboardStats => {
  const data = loadData();
  const { orders, drivers } = data;

  // 总订单数
  const totalOrders = orders.length;

  // 总营收（amount 之和，转为 "万" 单位）
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

  // 司机数量
  const driverCount = drivers.length;

  // 覆盖城市（从订单的 origin 和 destination 去重统计）
  const citySet = new Set<string>();
  orders.forEach((o) => {
    citySet.add(o.origin);
    citySet.add(o.destination);
  });
  const coveredCities = citySet.size;

  // 12个月趋势（从订单 createTime 按月聚合）
  const trendMonths = ['7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月'];
  const monthPatterns = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
                         '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

  const orderTrend = monthPatterns.map((mp) =>
    orders.filter((o) => o.createTime.startsWith(mp)).length
  );

  const revenueTrend = monthPatterns.map((mp) =>
    Math.round(orders
      .filter((o) => o.createTime.startsWith(mp))
      .reduce((sum, o) => sum + o.amount, 0) / 10000 * 10) / 10
  );

  // 城市分布（按 origin 统计）
  const cityCount = new Map<string, number>();
  orders.forEach((o) => {
    cityCount.set(o.origin, (cityCount.get(o.origin) || 0) + 1);
    cityCount.set(o.destination, (cityCount.get(o.destination) || 0) + 1);
  });
  const cityDistribution = Array.from(cityCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)
    .map(([name, value]) => ({ name, value }));

  // 补充「其他」分类
  const otherCount = Array.from(cityCount.entries())
    .slice(9)
    .reduce((sum, [, v]) => sum + v, 0);
  if (otherCount > 0) {
    cityDistribution.push({ name: '其他', value: otherCount });
  }

  // 年龄分布
  const ageGroups = [
    { min: 20, max: 30, name: '20-30岁' },
    { min: 31, max: 40, name: '31-40岁' },
    { min: 41, max: 45, name: '41-45岁' },
    { min: 46, max: 50, name: '46-50岁' },
    { min: 51, max: 99, name: '50岁以上' },
  ];
  const ageDistribution = ageGroups.map((g) => ({
    name: g.name,
    value: drivers.filter((d) => d.age >= g.min && d.age <= g.max).length,
  }));

  return {
    driverCount,
    totalRevenue,
    totalOrders,
    coveredCities,
    revenueTrend,
    orderTrend,
    trendMonths,
    cityDistribution,
    ageDistribution,
  };
};

// ==================== OrderCluster 聚合统计 ====================

export interface CityOrderStats {
  city: string;
  count: number;
  lng: number;
  lat: number;
}

/** 城市经纬度映射 */
const CITY_COORDS: Record<string, { lng: number; lat: number }> = {
  '北京市': { lng: 116.4, lat: 39.9 },
  '上海市': { lng: 121.47, lat: 31.23 },
  '广州市': { lng: 113.26, lat: 23.13 },
  '深圳市': { lng: 114.07, lat: 22.55 },
  '杭州市': { lng: 120.15, lat: 30.28 },
  '成都市': { lng: 104.07, lat: 30.57 },
  '武汉市': { lng: 114.31, lat: 30.58 },
  '南京市': { lng: 118.78, lat: 32.06 },
  '西安市': { lng: 108.94, lat: 34.26 },
  '重庆市': { lng: 106.55, lat: 29.57 },
  '天津市': { lng: 117.2, lat: 39.13 },
  '苏州市': { lng: 120.58, lat: 31.3 },
  '长沙市': { lng: 112.97, lat: 28.23 },
  '郑州市': { lng: 113.65, lat: 34.76 },
  '青岛市': { lng: 120.38, lat: 36.07 },
};

/** 从订单数据计算城市订单统计 */
export const computeCityOrderStats = (): CityOrderStats[] => {
  const orders = getOrders();
  const cityCount = new Map<string, number>();
  orders.forEach((o) => {
    cityCount.set(o.origin, (cityCount.get(o.origin) || 0) + (o.destination ? 1 : 0));
  });
  return Array.from(cityCount.entries())
    .filter(([city]) => CITY_COORDS[city])
    .map(([city, count]) => ({
      city,
      count,
      lng: CITY_COORDS[city].lng,
      lat: CITY_COORDS[city].lat,
    }))
    .sort((a, b) => b.count - a.count);
};

/** 计算月度订单趋势 */
export const computeMonthlyTrend = (): { month: string; count: number }[] => {
  const orders = getOrders();
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  return Array.from({ length: 12 }, (_, i) => {
    const mp = i < 6 ? `2025-${String(i + 1).padStart(2, '0')}` : `2024-${String(i + 1).padStart(2, '0')}`;
    return {
      month: monthNames[i],
      count: orders.filter((o) => o.createTime?.startsWith(mp)).length,
    };
  });
};

// ==================== 工具函数 ====================

export const getDriverNames = (): string[] => driverNames;
export const getCityNames = (): string[] => cityNames;
export const getGoodsTypes = (): string[] => goodsTypes;
