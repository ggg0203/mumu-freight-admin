/**
 * ★★★ 驾车路线规划工具函数 ★★★
 *
 * 通过腾讯地图 WebService API (v1) 获取真实道路级驾车路线
 * 共享给 RoutePlanning（路线规划）和 OrderTrace（运单追踪）使用
 */

const MAP_KEY = '7SZBZ-2FXK7-GXEX4-POKDI-CCD7F-CJFCX';

/** API 基础地址：生产环境直连（CORS），开发环境走 Vite 代理 */
const API_BASE = import.meta.env.DEV
  ? '/mapapi/?'
  : 'https://apis.map.qq.com/ws/direction/v1/driving/?';

/** 差分解码 polyline：将平铺的差值数组解码为坐标点数组 */
export const decodePolyline = (raw: number[]): { lat: number; lng: number }[] => {
  const pts: { lat: number; lng: number }[] = [];
  if (raw.length < 2) return pts;
  let lat = raw[0], lng = raw[1];
  pts.push({ lat, lng });
  for (let i = 2; i < raw.length - 1; i += 2) {
    lat += raw[i] / 1000000;
    lng += raw[i + 1] / 1000000;
    pts.push({ lat, lng });
  }
  return pts;
};

/**
 * 通过 HTTP WebService API 获取真实驾车路线轨迹
 *
 * 内部通过 Vite 代理 /mapapi/ → https://apis.map.qq.com/ws/direction/v1/driving
 *
 * @returns 沿真实道路的坐标点数组（无时间戳）
 */
export const fetchDrivingRoute = async (
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<{ lat: number; lng: number }[]> => {
  const url = `${API_BASE}from=${fromLat},${fromLng}&to=${toLat},${toLng}&key=${MAP_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();

  if (data.status !== 0) {
    console.warn(`[drivingRoute] API error for (${fromLat},${fromLng})→(${toLat},${toLng}):`, data.message);
    throw new Error(data.message || '路线规划失败');
  }

  const route = data.result.routes[0];
  if (!route?.polyline) {
    console.warn(`[drivingRoute] No polyline for (${fromLat},${fromLng})→(${toLat},${toLng})`);
    throw new Error('未找到路线数据');
  }

  return decodePolyline(route.polyline);
};

/**
 * 获取带时间戳的真实驾车路线轨迹
 * 每条轨迹点间隔约 1 分钟
 */
export const fetchDrivingRouteWithTimestamps = async (
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<Array<{ lat: number; lng: number; timestamp: number }>> => {
  const coords = await fetchDrivingRoute(fromLat, fromLng, toLat, toLng);
  const now = Date.now();
  return coords.map((pt, i) => ({
    lat: pt.lat,
    lng: pt.lng,
    timestamp: now - (coords.length - i) * 60000,
  }));
};
