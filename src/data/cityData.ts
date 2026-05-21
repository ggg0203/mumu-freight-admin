/**
 * ★★★ 中国城市坐标及货运数据 ★★★
 *
 * 用于 3D 地球货运网络可视化
 */

export interface CityInfo {
  id: number;
  name: string;
  /** 纬度 */
  lat: number;
  /** 经度 */
  lng: number;
  /** 订单量 */
  orderCount: number;
  /** 营收（万元） */
  revenue: number;
  /** 活跃司机数 */
  driverCount: number;
  /** 热门货物类型 */
  topGoods: string;
  /** 增长率 */
  growth: number;
}

/** 中国主要城市货运数据（模拟） */
export const cityData: CityInfo[] = [
  { id: 1,  name: '北京市',   lat: 39.90, lng: 116.40, orderCount: 12580, revenue: 9850,  driverCount: 320, topGoods: '电子产品',   growth: 12.5 },
  { id: 2,  name: '上海市',   lat: 31.23, lng: 121.47, orderCount: 14230, revenue: 11200, driverCount: 380, topGoods: '机械设备',   growth: 15.2 },
  { id: 3,  name: '广州市',   lat: 23.13, lng: 113.26, orderCount: 9860,  revenue: 7230,  driverCount: 260, topGoods: '日用百货',   growth: 8.9 },
  { id: 4,  name: '深圳市',   lat: 22.54, lng: 114.06, orderCount: 11200, revenue: 8900,  driverCount: 290, topGoods: '电子产品',   growth: 18.3 },
  { id: 5,  name: '杭州市',   lat: 30.27, lng: 120.15, orderCount: 6780,  revenue: 5200,  driverCount: 180, topGoods: '食品生鲜',   growth: 10.1 },
  { id: 6,  name: '成都市',   lat: 30.57, lng: 104.07, orderCount: 8540,  revenue: 6100,  driverCount: 220, topGoods: '食品生鲜',   growth: 14.7 },
  { id: 7,  name: '武汉市',   lat: 30.58, lng: 114.30, orderCount: 5320,  revenue: 3800,  driverCount: 150, topGoods: '机械设备',   growth: 7.5 },
  { id: 8,  name: '南京市',   lat: 32.06, lng: 118.80, orderCount: 4890,  revenue: 3500,  driverCount: 130, topGoods: '电子产品',   growth: 9.8 },
  { id: 9,  name: '西安市',   lat: 34.27, lng: 108.94, orderCount: 4230,  revenue: 2900,  driverCount: 120, topGoods: '化工原料',   growth: 6.2 },
  { id: 10, name: '重庆市',   lat: 29.57, lng: 106.55, orderCount: 7210,  revenue: 4800,  driverCount: 200, topGoods: '机械设备',   growth: 11.4 },
  { id: 11, name: '长沙市',   lat: 28.23, lng: 112.94, orderCount: 3560,  revenue: 2600,  driverCount: 100, topGoods: '日用百货',   growth: 8.1 },
  { id: 12, name: '郑州市',   lat: 34.75, lng: 113.63, orderCount: 4120,  revenue: 3100,  driverCount: 110, topGoods: '食品生鲜',   growth: 5.8 },
  { id: 13, name: '青岛市',   lat: 36.07, lng: 120.38, orderCount: 3780,  revenue: 2700,  driverCount: 105, topGoods: '食品生鲜',   growth: 7.2 },
  { id: 14, name: '苏州市',   lat: 31.30, lng: 120.58, orderCount: 5230,  revenue: 4100,  driverCount: 140, topGoods: '电子产品',   growth: 13.6 },
  { id: 15, name: '天津市',   lat: 39.13, lng: 117.20, orderCount: 3450,  revenue: 2500,  driverCount: 95,  topGoods: '化工原料',   growth: 4.3 },
  { id: 16, name: '宁波市',   lat: 29.87, lng: 121.54, orderCount: 2980,  revenue: 2300,  driverCount: 85,  topGoods: '机械设备',   growth: 9.5 },
  { id: 17, name: '昆明市',   lat: 25.04, lng: 102.72, orderCount: 2340,  revenue: 1800,  driverCount: 70,  topGoods: '食品生鲜',   growth: 10.8 },
  { id: 18, name: '福州市',   lat: 26.07, lng: 119.30, orderCount: 2560,  revenue: 1900,  driverCount: 75,  topGoods: '日用百货',   growth: 6.9 },
  { id: 19, name: '合肥市',   lat: 31.82, lng: 117.23, orderCount: 2780,  revenue: 2100,  driverCount: 80,  topGoods: '电子产品',   growth: 11.2 },
  { id: 20, name: '哈尔滨市', lat: 45.75, lng: 126.64, orderCount: 1890,  revenue: 1400,  driverCount: 55,  topGoods: '食品生鲜',   growth: 3.1 },
];

/** 将经纬度转换为 3D 坐标 */
export const latLngToPosition = (
  lat: number,
  lng: number,
  radius: number
): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
};
