/**
 * ★★★ 运单轨迹追踪页面 ★★★
 *
 * 功能：
 * 1. 运单列表选择（20+动态生成运单）
 * 2. 地图展示运单轨迹 + 路线规划
 * 3. 起点/终点/当前位置标注
 * 4. 轨迹回放（含地图动画车辆）
 * 5. AI 智能异常检测（带结果缓存）
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Select,
  Space,
  Tag,
  Timeline,
  Statistic,
  Button,
  Descriptions,
  message,
  Spin,
  Alert,
  Tooltip,
} from 'antd';
import {
  CarOutlined,
  EnvironmentOutlined,
  AimOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  WarningOutlined,
  RobotOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import MapContainer from '@/components/MapContainer/index';
import type { MarkerPoint, TrackPoint } from '@/components/MapContainer/index';
import { fetchDrivingRouteWithTimestamps } from '@/utils/drivingRouteUtils';
import { detectOrderAnomaly } from './aiAnomalyDetection';
import type { AnomalyResult } from './aiAnomalyDetection';
import styles from './index.module.css';

// ───── 动态运单数据 ─────

// 城市数据库
const CITY_DB = [
  { city: '北京', abbr: '京', lat: 39.9042, lng: 116.4074 },
  { city: '上海', abbr: '沪', lat: 31.2304, lng: 121.4737 },
  { city: '广州', abbr: '粤', lat: 23.1291, lng: 113.2644 },
  { city: '深圳', abbr: '粤', lat: 22.5431, lng: 114.0579 },
  { city: '杭州', abbr: '浙', lat: 30.2741, lng: 120.1551 },
  { city: '成都', abbr: '川', lat: 30.5728, lng: 104.0668 },
  { city: '武汉', abbr: '鄂', lat: 30.5928, lng: 114.3055 },
  { city: '重庆', abbr: '渝', lat: 29.4316, lng: 106.9123 },
  { city: '南京', abbr: '苏', lat: 32.0603, lng: 118.7969 },
  { city: '西安', abbr: '陕', lat: 34.3416, lng: 108.9398 },
  { city: '长沙', abbr: '湘', lat: 28.2282, lng: 112.9388 },
  { city: '郑州', abbr: '豫', lat: 34.7466, lng: 113.6253 },
  { city: '苏州', abbr: '苏', lat: 31.2990, lng: 120.5853 },
  { city: '天津', abbr: '津', lat: 39.0842, lng: 117.2000 },
  { city: '青岛', abbr: '鲁', lat: 36.0671, lng: 120.3826 },
  { city: '宁波', abbr: '浙', lat: 29.8683, lng: 121.5440 },
  { city: '厦门', abbr: '闽', lat: 24.4798, lng: 118.0894 },
  { city: '昆明', abbr: '滇', lat: 25.0389, lng: 102.7183 },
  { city: '大连', abbr: '辽', lat: 38.9140, lng: 121.6147 },
  { city: '合肥', abbr: '皖', lat: 31.8206, lng: 117.2272 },
  { city: '济南', abbr: '鲁', lat: 36.6512, lng: 117.1172 },
  { city: '福州', abbr: '闽', lat: 26.0745, lng: 119.2964 },
  { city: '南宁', abbr: '桂', lat: 22.8170, lng: 108.3665 },
  { city: '贵阳', abbr: '黔', lat: 26.6470, lng: 106.6302 },
];

// 地名后缀
const PLACES = ['物流园', '工业园区', '科技园', '商贸城', '仓储中心', '港口码头', '机场货运站', '批发市场', '配送中心', '电商产业园'];

// 货物类型
const GOODS_TYPES = ['电子产品', '日用百货', '食品饮料', '建材五金', '机械设备', '服装纺织', '化工原料', '医药器械', '冷链食品', '家具家居'];

const DRIVER_NAMES = ['张师傅', '李师傅', '王师傅', '赵师傅', '刘师傅', '陈师傅', '杨师傅', '黄师傅', '周师傅', '吴师傅',
  '徐师傅', '孙师傅', '马师傅', '朱师傅', '胡师傅', '郭师傅', '林师傅', '何师傅', '高师傅', '罗师傅'];

// 运单状态类型
type OrderStatus = 'pending' | 'picked' | 'transit' | 'delivered';

// 运单数据接口
interface OrderTrace {
  id: string;
  orderNo: string;
  status: OrderStatus;
  startLocation: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  endLocation: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  currentLocation: {
    lat: number;
    lng: number;
    updateTime: string;
  };
  driver: {
    name: string;
    phone: string;
    plateNo: string;
  };
  track: TrackPoint[];
  progress: number; // 0-100
  estimatedTime: string; // 预计到达时间 HH:mm
  distance: number; // 总距离 km
  goodsType: string;
  orderDate: string;
}

/** 随机整数 [min, max] */
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/** 随机取数组元素 */
const randPick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

/** 两点间经纬度距离（km，简化算法） */
const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

/**
 * 查找沿途中间城市作为路径点
 * 逻辑：找出 CITY_DB 中位于起终点走廊内的城市，按路径顺序返回
 */
const findWaypointCities = (startLat: number, startLng: number, endLat: number, endLng: number) => {
  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.3) return []; // 距离太近，不需要中间点

  const candidates: { lat: number; lng: number; progress: number }[] = [];

  for (const city of CITY_DB) {
    // 计算城市在起点→终点连线上的投影位置 t ∈ [0, 1]
    const t = ((city.lng - startLng) * dx + (city.lat - startLat) * dy) / (len * len);
    // 只取中间段（25%~75%），排除起终点城市本身
    if (t < 0.25 || t > 0.75) continue;

    // 计算城市到连线的垂直距离
    const projLng = startLng + t * dx;
    const projLat = startLat + t * dy;
    const dist = Math.sqrt((city.lng - projLng) ** 2 + (city.lat - projLat) ** 2);

    // 距离连线 3.5 度以内的视为"沿途走廊"
    if (dist < 3.5) {
      candidates.push({ lat: city.lat, lng: city.lng, progress: t });
    }
  }

  // 按从起点到终点的顺序排序
  candidates.sort((a, b) => a.progress - b.progress);
  // 最多取 4 个中间城市，避免路径过于曲折
  return candidates.slice(0, 4);
};

/** 生成模拟路网轨迹（经过中间城市，模拟高速路线） */
const generateTrack = (startLat: number, startLng: number, endLat: number, endLng: number, points: number): TrackPoint[] => {
  // 查找沿途城市作为路径点
  const waypoints = findWaypointCities(startLat, startLng, endLat, endLng);

  // 构建路径点序列：起点 → 中间路径点 → 终点
  const path: { lat: number; lng: number }[] = [
    { lat: startLat, lng: startLng },
    ...waypoints,
    { lat: endLat, lng: endLng },
  ];

  // 计算各段长度，按比例分配点
  const segLengths = path.slice(0, -1).map((p, i) => calcDistance(p.lat, p.lng, path[i + 1].lat, path[i + 1].lng));
  const totalLength = segLengths.reduce((s, l) => s + l, 0);

  const result: TrackPoint[] = [];
  let pointIdx = 0;

  for (let seg = 0; seg < path.length - 1; seg++) {
    const from = path[seg];
    const to = path[seg + 1];
    // 该段分配的点数（按路径长度加权，每段最少2个点）
    const segPoints = Math.max(2, Math.round(points * (segLengths[seg] / totalLength)));

    for (let i = 0; i < segPoints; i++) {
      const t = segPoints > 1 ? i / (segPoints - 1) : 0;
      // 加入微小偏移 ±0.002°，模拟轻微道路弯曲而非锯齿
      const offsetLat = (Math.random() - 0.5) * 0.004;
      const offsetLng = (Math.random() - 0.5) * 0.004;
      result.push({
        lat: Math.round((from.lat + (to.lat - from.lat) * t + offsetLat) * 1e6) / 1e6,
        lng: Math.round((from.lng + (to.lng - from.lng) * t + offsetLng) * 1e6) / 1e6,
        timestamp: Date.now() - (points - pointIdx) * 60000,
      });
      pointIdx++;
    }
  }

  return result;
};

/** 生成车牌号 */
const genPlateNo = (abbr: string) => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  const nums = '0123456789'.split('');
  return `${abbr}·${randPick(letters)}${nums[randInt(0, 9)]}${nums[randInt(0, 9)]}${nums[randInt(0, 9)]}${nums[randInt(0, 9)]}${nums[randInt(0, 9)]}`;
};

/** 生成手机号 */
const genPhone = () => {
  const prefixes = ['138', '139', '136', '135', '137', '150', '152', '158', '186', '188'];
  return `${randPick(prefixes)}****${String(randInt(1000, 9999))}`;
};

/** 生成预计到达时间 */
const calcEstimatedTime = (distance: number, progress: number): string => {
  // 平均时速 40km/h，剩余距离 = 总距离 * (1 - progress/100)
  const remainingDist = distance * (1 - progress / 100);
  const avgSpeed = 40 + Math.random() * 10; // 40-50 km/h
  const remainingMinutes = Math.round((remainingDist / avgSpeed) * 60);
  const now = new Date();
  now.setMinutes(now.getMinutes() + remainingMinutes);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

/** 生成 20+ 条随机运单 */
const generateMockOrders = (count: number = 24): OrderTrace[] => {
  const orders: OrderTrace[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const startCity = CITY_DB[i % CITY_DB.length];
    const endCity = CITY_DB[(i + randInt(1, 5)) % CITY_DB.length];

    // 确保起终点不同
    const startLat = startCity.lat + (Math.random() - 0.5) * 0.06;
    const startLng = startCity.lng + (Math.random() - 0.5) * 0.06;
    const endLat = endCity.lat + (Math.random() - 0.5) * 0.06;
    const endLng = endCity.lng + (Math.random() - 0.5) * 0.06;

    const statuses: OrderStatus[] = ['pending', 'picked', 'transit', 'transit', 'transit', 'delivered'];
    const status = statuses[randInt(0, statuses.length - 1)];

    let progress: number;
    switch (status) {
      case 'pending': progress = 0; break;
      case 'picked': progress = randInt(5, 25); break;
      case 'transit': progress = randInt(30, 85); break;
      case 'delivered': progress = 100; break;
      default: progress = 0;
    }

    // 先生成轨迹（含中间城市路径点）
    const trackPointCount = status === 'pending' ? 2 : randInt(10, 20);
    const track = generateTrack(startLat, startLng, endLat, endLng, trackPointCount);

    // 使用轨迹实际路径距离（各段之和），比直线距离更真实
    const distance = track.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + calcDistance(track[i - 1].lat, track[i - 1].lng, p.lat, p.lng);
    }, 0);

    // 当前位置 = 轨迹中间偏前的点
    const currentTrackIdx = progress > 0 ? Math.min(Math.floor(track.length * (progress / 100)), track.length - 1) : 0;
    const currentLoc = track[currentTrackIdx] || track[0];

    const place = randPick(PLACES);
    const driverName = randPick(DRIVER_NAMES);

    // 生成日期字符串
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const estimatedTime = calcEstimatedTime(distance, progress);

    orders.push({
      id: String(i + 1),
      orderNo: `YD${dateStr.replace(/-/g, '')}${String(i + 1).padStart(3, '0')}`,
      status,
      startLocation: {
        name: `${startCity.city}${place}`,
        address: `${startCity.city}市${startCity.city}区${place}A区`,
        lat: startLat,
        lng: startLng,
      },
      endLocation: {
        name: `${endCity.city}${place}`,
        address: `${endCity.city}市${endCity.city}区${place}B区`,
        lat: endLat,
        lng: endLng,
      },
      currentLocation: {
        lat: currentLoc.lat,
        lng: currentLoc.lng,
        updateTime: `${dateStr} ${String(9 + randInt(0, 8)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}:00`,
      },
      driver: {
        name: driverName,
        phone: genPhone(),
        plateNo: genPlateNo(startCity.abbr),
      },
      track,
      progress,
      estimatedTime,
      distance,
      goodsType: randPick(GOODS_TYPES),
      orderDate: dateStr,
    });
  }
  return orders;
};

// 生成运单数据（模块级常量，保持跨渲染一致）
const mockOrders = generateMockOrders(24);

/** 运单轨迹追踪页面 */
const OrderTrace: React.FC = () => {
  const { t } = useTranslation();

  // 状态配置
  const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: t('orderTrace.status_pending'), color: 'default', icon: <ClockCircleOutlined /> },
    picked: { label: t('orderTrace.status_picked'), color: 'processing', icon: <InboxOutlined /> },
    transit: { label: t('orderTrace.inTransit'), color: 'warning', icon: <CarOutlined /> },
    delivered: { label: t('orderTrace.delivered'), color: 'success', icon: <CheckCircleOutlined /> },
  };

  // 状态
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(mockOrders[0].id);
  const [playing, setPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);

  // ★ AI 异常检测状态 ★
  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  // AI 结果缓存：orderId → AnomalyResult
  const anomalyCache = useRef<Record<string, AnomalyResult>>({});

  // ★ 腾讯地图真实路线规划（API失败时不显示降级轨迹） ★
  const [realRouteTracks, setRealRouteTracks] = useState<TrackPoint[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [apiFailed, setApiFailed] = useState(false); // ★ 标记 API 是否尝试过但失败 ★
  const routeCache = useRef<Record<string, TrackPoint[]>>({});

  /** 执行 AI 异常检测 */
  const runAnomalyDetection = useCallback(async (order: OrderTrace) => {
    // 检查缓存
    if (anomalyCache.current[order.id]) {
      setAnomalyResult(anomalyCache.current[order.id]);
      return;
    }

    setAnomalyLoading(true);
    try {
      const result = await detectOrderAnomaly({
        orderNo: order.orderNo,
        status: order.status,
        progress: order.progress,
        totalDistance: order.distance,
        estimatedTime: order.estimatedTime,
        currentLocation: order.currentLocation,
        startLocation: order.startLocation,
        endLocation: order.endLocation,
        driver: order.driver,
        trackPointsCount: order.track.length,
      });
      // 缓存结果
      anomalyCache.current[order.id] = result;
      setAnomalyResult(result);
    } catch {
      // 出错时不清空已有结果
    } finally {
      setAnomalyLoading(false);
    }
  }, []);

  // ★ 切换运单时自动检测异常（若已缓存则直接使用缓存） ★
  useEffect(() => {
    const order = mockOrders.find(o => o.id === selectedOrderId);
    if (!order || order.status === 'delivered' || order.status === 'pending') {
      setAnomalyResult(null);
      return;
    }
    runAnomalyDetection(order);
  }, [selectedOrderId, runAnomalyDetection]);

    // ★ 切换运单时调用 HTTP WebService API 获取真实道路轨迹 ★
  useEffect(() => {
    const order = mockOrders.find(o => o.id === selectedOrderId);
    if (!order || order.status === 'pending' || order.status === 'delivered') {
      setRealRouteTracks([]);
      setApiFailed(false);
      return;
    }

    const cacheKey = `${order.startLocation.lat.toFixed(4)},${order.startLocation.lng.toFixed(4)}-${order.endLocation.lat.toFixed(4)},${order.endLocation.lng.toFixed(4)}`;
    if (routeCache.current[cacheKey]) {
      setRealRouteTracks(routeCache.current[cacheKey]);
      setApiFailed(false);
      return;
    }

    // ★ 立即清空旧轨迹，避免显示前一个运单的残留轨迹 ★
    setRealRouteTracks([]);
    setApiFailed(false);
    setRouteLoading(true);

    fetchDrivingRouteWithTimestamps(
      order.startLocation.lat, order.startLocation.lng,
      order.endLocation.lat, order.endLocation.lng,
    )
      .then(coords => {
        routeCache.current[cacheKey] = coords;
        setRealRouteTracks(coords);
        setApiFailed(false);
      })
      .catch(() => {
        // ★ API 失败时不显示降级轨迹（模拟折线视觉太差）★
        console.warn('[OrderTrace] 路线规划 API 失败，该运单不显示轨迹（仅显示标记）');
        setRealRouteTracks([]);
        setApiFailed(true);
      })
      .finally(() => {
        setRouteLoading(false);
      });
  }, [selectedOrderId]);

  // 获取当前选中的运单
  const currentOrder = mockOrders.find(o => o.id === selectedOrderId) || mockOrders[0];

  // ★ 稳定化地图中心点（避免每次 re-render 创建新对象引用） ★
  const stableMapCenter = useMemo(() => ({
    lat: (currentOrder.startLocation.lat + currentOrder.endLocation.lat) / 2,
    lng: (currentOrder.startLocation.lng + currentOrder.endLocation.lng) / 2,
  }), [currentOrder.startLocation.lat, currentOrder.startLocation.lng,
      currentOrder.endLocation.lat, currentOrder.endLocation.lng]);

  // ★ 实际显示的轨迹 ★
  // transit/picked: API成功→真实路线, API失败→不显示
  // pending/delivered: 不调用API→显示模拟轨迹（计划路线/完成路线）
  const displayTracks = useMemo<TrackPoint[]>(() => {
    if (realRouteTracks.length > 0) return realRouteTracks;
    // pending（待取货）和 delivered（已送达）不走 API，显示模拟轨迹
    if (currentOrder.status === 'pending' || currentOrder.status === 'delivered') {
      return currentOrder.track;
    }
    return [];
  }, [realRouteTracks, currentOrder.status, currentOrder.track]);

  // ★ 在 displayTracks 上按进度比例插值计算当前位置 ★
  const interpolatedCurrentLoc = useMemo<{ lat: number; lng: number }>(() => {
    if (displayTracks.length >= 2 && currentOrder.progress > 0) {
      const progress = currentOrder.progress / 100;
      const totalSegments = displayTracks.length - 1;
      const segFloat = progress * totalSegments;
      const segIdx = Math.min(Math.floor(segFloat), totalSegments - 1);
      const segRatio = segFloat - segIdx;
      const from = displayTracks[segIdx];
      const to = displayTracks[segIdx + 1];
      if (from && to) {
        return {
          lat: Math.round((from.lat + (to.lat - from.lat) * segRatio) * 1e6) / 1e6,
          lng: Math.round((from.lng + (to.lng - from.lng) * segRatio) * 1e6) / 1e6,
        };
      }
    }
    return { lat: currentOrder.currentLocation.lat, lng: currentOrder.currentLocation.lng };
  }, [displayTracks, currentOrder.progress, currentOrder.currentLocation]);

  // 生成地图标注点（移除 iconUrl）
  const markers = useMemo<MarkerPoint[]>(() => [
    {
      lat: currentOrder.startLocation.lat,
      lng: currentOrder.startLocation.lng,
      title: currentOrder.startLocation.name,
      description: currentOrder.startLocation.address,
      color: 'green',
    },
    {
      lat: currentOrder.endLocation.lat,
      lng: currentOrder.endLocation.lng,
      title: currentOrder.endLocation.name,
      description: currentOrder.endLocation.address,
      color: 'red',
    },
    {
      lat: interpolatedCurrentLoc.lat,
      lng: interpolatedCurrentLoc.lng,
      title: t('orderTrace.currentLocation'),
      description: `${t('orderTrace.updateTime')} ${currentOrder.currentLocation.updateTime}`,
      color: 'blue',
    },
  ], [currentOrder, t, interpolatedCurrentLoc]);

  // ★ 轨迹回放动画：计算当前播放进度对应的车辆位置 ★
  const animatedPosition = useMemo<{ lat: number; lng: number } | null>(() => {
    if (!playing && playProgress === 0) return null;
    if (displayTracks.length < 2) return null;

    const track = displayTracks;
    const progress = Math.min(playProgress / 100, 1);
    const totalSegments = track.length - 1;
    const segFloat = progress * totalSegments;
    const segIdx = Math.min(Math.floor(segFloat), totalSegments - 1);
    const segRatio = segFloat - segIdx;

    const from = track[segIdx];
    const to = track[segIdx + 1];
    if (!from || !to) return null;

    return {
      lat: Math.round((from.lat + (to.lat - from.lat) * segRatio) * 1e6) / 1e6,
      lng: Math.round((from.lng + (to.lng - from.lng) * segRatio) * 1e6) / 1e6,
    };
  }, [playing, playProgress, displayTracks]);

  // 地图点击回调
  const handleMapClick = useCallback((lat: number, lng: number) => {
    console.log('地图点击:', lat, lng);
  }, []);

  // 标注点击回调
  const handleMarkerClick = useCallback((marker: MarkerPoint, index: number) => {
    message.info(`${t('orderTrace.clickedMarker')}: ${marker.title}`);
  }, [t]);

  // 轨迹回放定时器
  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setPlayProgress(prev => {
        if (prev >= 100) {
          setPlaying(false);
          return 100;
        }
        return prev + 1.5; // 慢一点更真实
      });
    }, 300);

    return () => clearInterval(interval);
  }, [playing]);

  // 切换运单
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setPlaying(false);
    setPlayProgress(0);
  };

  // 距离的剩余公里数文本
  const remainingDist = currentOrder.distance * (1 - currentOrder.progress / 100);

  return (
    <div className={styles.container}>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <h2>
          <CarOutlined style={{ marginRight: 8 }} />
          {t('orderTrace.title')}
        </h2>
        <p className={styles.subtitle}>{t('orderTrace.desc')}</p>
      </div>

      <Row gutter={16}>
        {/* 左侧：运单列表和信息 */}
        <Col xs={24} lg={8}>
          {/* 运单选择 */}
          <Card className={styles.orderSelectCard} size="small">
            <Select
              value={selectedOrderId}
              onChange={handleOrderChange}
              style={{ width: '100%' }}
              size="large"
              placeholder={t('orderTrace.selectOrder')}
              showSearch
              optionFilterProp="label"
            >
              {mockOrders.map(order => (
                <Select.Option
                  key={order.id}
                  value={order.id}
                  label={`${order.orderNo} - ${order.startLocation.name.split('市')[0]}→${order.endLocation.name.split('市')[0]}`}
                >
                  <Space>
                    <Tag color={statusConfig[order.status].color}>
                      {statusConfig[order.status].icon}
                    </Tag>
                    <span style={{ fontWeight: 500 }}>{order.orderNo}</span>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {order.startLocation.name.slice(0, 2)}→{order.endLocation.name.slice(0, 2)}
                    </span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Card>

          {/* 运单详情 */}
          <Card className={styles.orderInfoCard} size="small" title={t('orderTrace.orderDetail')}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('orderTrace.orderNo')}>
                <strong>{currentOrder.orderNo}</strong>
              </Descriptions.Item>
              <Descriptions.Item label={t('orderTrace.status')}>
                <Tag color={statusConfig[currentOrder.status].color} icon={statusConfig[currentOrder.status].icon}>
                  {statusConfig[currentOrder.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="货物类型">
                <Tag color="geekblue">{currentOrder.goodsType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('orderTrace.driver')}>
                {currentOrder.driver.name} ({currentOrder.driver.plateNo})
              </Descriptions.Item>
              <Descriptions.Item label={t('orderTrace.driverPhone')}>
                <a href={`tel:${currentOrder.driver.phone}`}>{currentOrder.driver.phone}</a>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 路线信息 */}
          <Card className={styles.routeCard} size="small" title={t('orderTrace.routeInfo')}>
            <Row gutter={12}>
              <Col span={12}>
                <Statistic
                  title={t('orderTrace.totalDistance')}
                  value={currentOrder.distance}
                  suffix="km"
                  precision={1}
                  prefix={<AimOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={t('orderTrace.estimatedArrival')}
                  value={currentOrder.estimatedTime}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}
                />
              </Col>
            </Row>

            {/* 进度条 */}
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span>{t('orderTrace.progress')}</span>
                <span>{currentOrder.progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${currentOrder.progress}%` }}
                />
              </div>
              {currentOrder.status !== 'delivered' && currentOrder.progress > 0 && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 4, textAlign: 'right' }}>
                  剩余约 {remainingDist > 1 ? `${remainingDist.toFixed(1)} km` : '不足 1 km'}
                </div>
              )}
            </div>
          </Card>

          {/* ★ AI 异常检测 ★ */}
          <Card
            className={styles.routeCard}
            size="small"
            title={<span><RobotOutlined style={{ color: '#667eea', marginRight: 6 }} />AI 智能检测</span>}
            extra={
              anomalyLoading ? <Spin size="small" /> : (
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    const order = mockOrders.find(o => o.id === selectedOrderId);
                    if (!order) return;
                    // 重新检测时清除缓存
                    delete anomalyCache.current[order.id];
                    runAnomalyDetection(order);
                  }}
                  disabled={anomalyLoading}
                >
                  刷新检测
                </Button>
              )
            }
          >
            {anomalyLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Spin />
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>AI 正在分析运单数据...</div>
              </div>
            ) : anomalyResult && anomalyResult.hasAnomaly ? (
              <div>
                <div style={{ fontSize: 13, marginBottom: 8, color: '#666' }}>{anomalyResult.summary}</div>
                {anomalyResult.anomalies.map((item, i) => (
                  <Alert
                    key={i}
                    type={item.level === 'danger' ? 'error' : 'warning'}
                    showIcon
                    icon={<WarningOutlined />}
                    message={<span style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</span>}
                    description={<span style={{ fontSize: 12 }}>{item.description}</span>}
                    style={{ marginBottom: 8, borderRadius: 6 }}
                  />
                ))}
              </div>
            ) : anomalyResult && !anomalyResult.hasAnomaly ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>✅ 当前运单未检测到异常</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{anomalyResult.summary}</div>
              </div>
            ) : currentOrder.status === 'delivered' ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#aaa', fontSize: 13 }}>
                运单已送达，无需检测
              </div>
            ) : currentOrder.status === 'pending' ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#aaa', fontSize: 13 }}>
                运单尚未开始运输，暂不需要检测
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#aaa', fontSize: 13 }}>
                正在等待运单数据...
              </div>
            )}
          </Card>

          {/* 位置信息 */}
          <Card className={styles.locationCard} size="small" title={t('orderTrace.locationInfo')}>
            {/* 起点 */}
            <div className={styles.locationItem}>
              <div className={`${styles.locationIcon} ${styles.startIcon}`}>
                <EnvironmentOutlined />
              </div>
              <div className={styles.locationContent}>
                <div className={styles.locationTitle}>{t('orderTrace.startPoint')}</div>
                <div className={styles.locationName}>{currentOrder.startLocation.name}</div>
                <div className={styles.locationAddress}>{currentOrder.startLocation.address}</div>
              </div>
            </div>

            {/* 轨迹线 */}
            <div className={styles.trackLine} />

            {/* 当前位置 */}
            <div className={styles.locationItem}>
              <div className={`${styles.locationIcon} ${styles.currentIcon}`}>
                <CarOutlined />
              </div>
              <div className={styles.locationContent}>
                <div className={styles.locationTitle}>{t('orderTrace.currentLocation')}</div>
                <div className={styles.locationName}>{t('orderTrace.lng')}: {currentOrder.currentLocation.lng.toFixed(6)}</div>
                <div className={styles.locationAddress}>{t('orderTrace.lat')}: {currentOrder.currentLocation.lat.toFixed(6)}</div>
                <div className={styles.updateTime}>{t('orderTrace.updateTime')}: {currentOrder.currentLocation.updateTime}</div>
              </div>
            </div>

            {/* 轨迹线 */}
            <div className={styles.trackLine} />

            {/* 终点 */}
            <div className={styles.locationItem}>
              <div className={`${styles.locationIcon} ${styles.endIcon}`}>
                <EnvironmentOutlined />
              </div>
              <div className={styles.locationContent}>
                <div className={styles.locationTitle}>{t('orderTrace.endPoint')}</div>
                <div className={styles.locationName}>{currentOrder.endLocation.name}</div>
                <div className={styles.locationAddress}>{currentOrder.endLocation.address}</div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：地图 + 时间轴 */}
        <Col xs={24} lg={16}>
          {/* 地图（已去除外层冗余 Card） */}
          <div className={styles.mapCard}>
            <div className={styles.mapCardHeader}>
              <Space>
                <EnvironmentOutlined />
                <span>{t('orderTrace.title')} - 腾讯地图</span>
                {routeLoading && <Spin size="small" style={{ marginLeft: 4 }} />}
              </Space>
              <Space>
                <Tooltip title={playing ? '暂停回放' : '开始回放'}>
                  <Button
                    type={playing ? 'primary' : 'default'}
                    size="small"
                    icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => {
                      if (playProgress >= 100) setPlayProgress(0);
                      setPlaying(!playing);
                    }}
                    disabled={currentOrder.status === 'delivered' || currentOrder.track.length < 2}
                  >
                    {playing ? t('orderTrace.pause') : t('orderTrace.replay')}
                  </Button>
                </Tooltip>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => { setPlaying(false); setPlayProgress(0); }}
                  disabled={playProgress === 0}
                >
                  重置
                </Button>
              </Space>
            </div>
            <div style={{ position: 'relative' }}>
              <MapContainer
                height={560}
                markers={markers}
                tracks={displayTracks}
                trackColor="#1890ff"
                trackWidth={5}
                trackBorderWidth={2}
                trackBorderColor="rgba(255,255,255,0.6)"
                autoFitBounds={true}
                animatedPosition={animatedPosition}
                onMapClick={handleMapClick}
                onMarkerClick={handleMarkerClick}
                initialZoom={12}
                initialCenter={stableMapCenter}
              />
              {/* ★ 首次加载时显示遮罩，避免看到模拟轨迹闪烁 ★ */}
              {routeLoading && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 8, zIndex: 10,
                  borderRadius: 8,
                }}>
                  <Spin size="large" />
                  <span style={{ color: '#666', fontSize: 13 }}>正在获取真实路线...</span>
                </div>
              )}
              {/* ★ API 失败时的提示信息 ★ */}
              {!routeLoading && apiFailed && currentOrder.status !== 'pending' && currentOrder.status !== 'delivered' && (
                <div style={{
                  position: 'absolute', top: 8, left: 8, right: 8,
                  padding: '6px 12px', background: 'rgba(250,238,218,0.92)',
                  borderRadius: 6, fontSize: 12, color: '#854F0B',
                  zIndex: 10, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <WarningOutlined style={{ fontSize: 14 }} />
                  <span>无法加载驾车路线数据，仅显示起终点标记。请查看控制台获取错误详情。</span>
                  <Button type="link" size="small" style={{ color: '#854F0B', fontSize: 12, padding: 0, minWidth: 'auto', flexShrink: 0 }}
                    onClick={() => {
                      setRouteLoading(true);
                      setApiFailed(false);
                      const order = mockOrders.find(o => o.id === selectedOrderId);
                      if (!order) return;
                      const cacheKey = `${order.startLocation.lat.toFixed(4)},${order.startLocation.lng.toFixed(4)}-${order.endLocation.lat.toFixed(4)},${order.endLocation.lng.toFixed(4)}`;
                      delete routeCache.current[cacheKey];
                      // 重启 API 请求 (直接复现 useEffect 逻辑)
                      fetchDrivingRouteWithTimestamps(
                        order.startLocation.lat, order.startLocation.lng,
                        order.endLocation.lat, order.endLocation.lng,
                      )
                        .then(coords => {
                          routeCache.current[cacheKey] = coords;
                          setRealRouteTracks(coords);
                          setApiFailed(false);
                        })
                        .catch(() => {
                          setRealRouteTracks([]);
                          setApiFailed(true);
                        })
                        .finally(() => { setRouteLoading(false); });
                    }}
                  >重试</Button>
                </div>
              )}
            </div>
            {/* 播放进度条 */}
            <div className={styles.playProgressBar}>
              <div className={styles.playProgressFill} style={{ width: `${playProgress}%` }} />
            </div>
          </div>

          {/* 轨迹时间轴 */}
          <Card className={styles.timelineCard} size="small" title={t('orderTrace.transportRoute')}>
            <Timeline
              items={[
                {
                  color: 'green',
                  icon: <EnvironmentOutlined />,
                  children: (
                    <>
                      <div className={styles.timelineTitle}>{t('orderTrace.loaded')}</div>
                      <div className={styles.timelineTime}>出发 {currentOrder.orderDate}</div>
                      <div className={styles.timelineLocation}>{currentOrder.startLocation.name}</div>
                    </>
                  ),
                },
                ...(currentOrder.status === 'transit' || currentOrder.status === 'delivered'
                  ? [
                      {
                        color: 'blue',
                        icon: <CarOutlined />,
                        children: (
                          <>
                            <div className={styles.timelineTitle}>{t('orderTrace.inTransit')}</div>
                            <div className={styles.timelineTime}>
                              已行驶 {currentOrder.distance.toFixed(1)} km · 进度 {currentOrder.progress}%
                            </div>
                            <div className={styles.timelineLocation}>
                              {currentOrder.currentLocation.lat.toFixed(4)}, {currentOrder.currentLocation.lng.toFixed(4)}
                            </div>
                          </>
                        ),
                      },
                    ]
                  : []),
                ...(currentOrder.status === 'delivered'
                  ? [
                      {
                        color: 'green',
                        icon: <CheckCircleOutlined />,
                        children: (
                          <>
                            <div className={styles.timelineTitle}>{t('orderTrace.delivered')}</div>
                            <div className={styles.timelineTime}>预计 {currentOrder.estimatedTime}</div>
                            <div className={styles.timelineLocation}>{currentOrder.endLocation.name}</div>
                          </>
                        ),
                      },
                    ]
                  : currentOrder.status !== 'pending'
                  ? [
                      {
                        color: 'gray',
                        icon: <ClockCircleOutlined />,
                        children: (
                          <>
                            <div className={styles.timelineTitle}>预计到达</div>
                            <div className={styles.timelineTime}>{currentOrder.estimatedTime}</div>
                            <div className={styles.timelineLocation}>{currentOrder.endLocation.name}</div>
                          </>
                        ),
                      },
                    ]
                  : []),
              ] as any[]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderTrace;
