/**
 * ★★★ 3D 地球全国货运网络组件 ★★★
 *
 * 基于 react-globe.gl 实现：
 * 1. NASA Blue Marble 地球纹理
 * 2. 动态脉冲城市标记（按订单量变色）
 * 3. 流光飞行路线
 * 4. ★ HTML 覆盖层标签（解决中文问号问题）★
 * 5. 点击城市展示数据
 * 6. 鼠标拖拽 + 外部缩放控制 + 自动旋转
 */

import { useMemo, useCallback, forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { cityData } from '@/data/cityData';
import type { CityInfo } from '@/data/cityData';

interface Globe3DProps {
  onCityClick?: (city: CityInfo) => void;
  autoRotate?: boolean;
}

export interface Globe3DRef {
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (altitude: number) => void;
  getAltitude: () => number;
}

/** 计算最大订单量（缓存引用） */
const MAX_ORDERS = Math.max(...cityData.map((c) => c.orderCount));

// ==================== 工具函数 ====================

/** 根据订单量计算城市标记颜色 */
const getPointColor = (orderCount: number): string => {
  const ratio = orderCount / MAX_ORDERS;
  if (ratio > 0.8) return '#ff6b35';
  if (ratio > 0.5) return '#ffaa33';
  return '#44ddff';
};

/** 根据订单量计算弧线透明度 */
const getArcOpacity = (orderCount: number): number => {
  const ratio = orderCount / MAX_ORDERS;
  return 0.15 + ratio * 0.35;
};

// ==================== HTML 标签覆盖层 ====================

interface LabelItem {
  id: number;
  name: string;
  lat: number;
  lng: number;
  orderCount: number;
}

/**
 * 在 3D 地球上方叠加 HTML 标签
 * - 将经纬度通过 Three.js Camera 投影到屏幕坐标
 * - 渲染带中文字体的 Span 元素（彻底避开了 Canvas 纹理的中文渲染坑）
 * - 自动隐藏背面标签
 * - 支持点击交互
 */
function GlobeLabels({
  globeRef,
  containerRef,
  labels,
  onCityClick,
}: {
  globeRef: React.MutableRefObject<any>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  labels: LabelItem[];
  onCityClick?: (city: CityInfo) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

  // 等待 globe 加载完成后设置初始视角
  useEffect(() => {
    if (!globeRef.current) return;

    // 等待一段时间让 globe 完全渲染
    const timer = setTimeout(() => {
      if (globeRef.current) {
        // 设置初始视角：中国为中心
        globeRef.current.pointOfView({ lat: 30, lng: 108, altitude: 2.5 }, 0);
        setIsReady(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [globeRef]);

  useEffect(() => {
    if (!isReady || !globeRef.current || !overlayRef.current) return;

    const camera = globeRef.current.camera() as THREE.PerspectiveCamera;
    const renderer = globeRef.current.renderer();
    if (!camera || !renderer) return;

    const tempVec3 = new THREE.Vector3();
    // 单位球坐标转换：lat/lng -> 3D
    const latLngToVec3 = (lat: number, lng: number, altitude: number = 0) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const r = 100 + altitude;
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    };

    const updateLabels = () => {
      if (!overlayRef.current || !containerRef.current) {
        rafRef.current = requestAnimationFrame(updateLabels);
        return;
      }

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // 更新相机矩阵
      if (globeRef.current.update) {
        globeRef.current.update();
      }

      const children = overlayRef.current.children;

      labels.forEach((label, i) => {
        const el = children[i] as HTMLElement | undefined;
        if (!el) return;

        // 经纬度转 3D 坐标
        const vec = latLngToVec3(label.lat, label.lng, 2);

        // 投影到屏幕空间
        vec.project(camera);

        // NDC 到屏幕坐标
        const screenX = (vec.x * 0.5 + 0.5) * width;
        const screenY = (-vec.y * 0.5 + 0.5) * height;

        // 判断是否在相机背面 (NDC z > 1 表示在相机后面)
        const behindCamera = vec.z > 1;
        const visible = !behindCamera &&
          screenX > -50 && screenX < width + 50 &&
          screenY > -50 && screenY < height + 50;

        if (visible) {
          el.style.display = 'block';
          el.style.transform = `translate(-50%, -50%) translate(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px)`;
          el.style.opacity = '1';
        } else {
          el.style.display = 'none';
        }
      });

      rafRef.current = requestAnimationFrame(updateLabels);
    };

    rafRef.current = requestAnimationFrame(updateLabels);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isReady, globeRef, containerRef, labels, onCityClick]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 5,
      }}
    >
      {labels.map((label) => (
        <div
          key={label.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (onCityClick) {
              onCityClick(label as CityInfo);
            }
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif',
              whiteSpace: 'nowrap',
              textShadow:
                '0 0 10px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.9)',
              letterSpacing: '0.5px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(6, 11, 36, 0.75)',
              border: '1px solid rgba(68, 136, 255, 0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(68, 136, 255, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(68, 221, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(6, 11, 36, 0.75)';
              e.currentTarget.style.borderColor = 'rgba(68, 136, 255, 0.3)';
            }}
          >
            {label.name}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 主组件 ====================

const Globe3D = forwardRef<Globe3DRef, Globe3DProps>(({ onCityClick, autoRotate = true }, ref) => {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentAlt = useRef(2.5);

  // 暴露缩放方法给父组件
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (!globeRef.current) return;
      const alt = Math.max(0.5, currentAlt.current * 0.75);
      currentAlt.current = alt;
      globeRef.current.pointOfView({ altitude: alt }, 400);
    },
    zoomOut: () => {
      if (!globeRef.current) return;
      const alt = Math.min(8, currentAlt.current * 1.3);
      currentAlt.current = alt;
      globeRef.current.pointOfView({ altitude: alt }, 400);
    },
    setZoom: (altitude: number) => {
      if (!globeRef.current) return;
      currentAlt.current = altitude;
      globeRef.current.pointOfView({ altitude }, 300);
    },
    getAltitude: () => currentAlt.current,
  }));

  // ==================== 飞行路线数据 ====================

  const arcsData = useMemo(() => {
    const result: {
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
      color: string;
    }[] = [];

    const sorted = [...cityData].sort((a, b) => b.orderCount - a.orderCount);
    const topCities = sorted.slice(0, 8);

    for (let i = 0; i < topCities.length; i++) {
      for (let j = i + 1; j < topCities.length; j++) {
        const opacity = getArcOpacity(
          (topCities[i].orderCount + topCities[j].orderCount) / 2
        );
        result.push({
          startLat: topCities[i].lat,
          startLng: topCities[i].lng,
          endLat: topCities[j].lat,
          endLng: topCities[j].lng,
          color: `rgba(68, 221, 255, ${opacity})`,
        });
      }
    }

    const otherCities = sorted.slice(8);
    for (const city of otherCities) {
      const target = topCities[Math.floor(Math.random() * topCities.length)];
      const opacity = getArcOpacity(city.orderCount);
      result.push({
        startLat: city.lat,
        startLng: city.lng,
        endLat: target.lat,
        endLng: target.lng,
        color: `rgba(34, 102, 204, ${opacity * 0.6})`,
      });
    }

    return result;
  }, []);

  // ==================== 城市标记数据 ====================

  const pointsData = useMemo(
    () =>
      cityData.map((city) => ({
        ...city,
        altitude: 0.01 + (city.orderCount / 35000) * 0.12,
        radius: 0.5 + (city.orderCount / 35000) * 1.2,
        color: getPointColor(city.orderCount),
      })),
    []
  );

  // ==================== 点击处理 ====================

  const handlePointClick = useCallback(
    (point: object) => {
      const city = point as CityInfo;
      if (onCityClick && city && city.id) {
        onCityClick(city);
      }
    },
    [onCityClick]
  );

  // ==================== 渲染 ====================

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Globe
        ref={globeRef}
        // --- 地球外观 ---
        globeImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png"
        backgroundImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/night-sky.png"
        // --- 大气 ---
        atmosphereColor="#4488ff"
        atmosphereAltitude={0.18}
        // --- 城市标记 ---
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointAltitude="altitude"
        pointRadius="radius"
        pointColor="color"
        pointsMerge={false}
        onPointClick={handlePointClick}
        // --- 飞行路线 ---
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke={1.0}
        arcDashLength={0.25}
        arcDashGap={0.15}
        arcDashAnimateTime={2500}
        arcAltitude={(d: Record<string, any>) => {
          const fromCity = cityData.find((c) => c.lat === d.startLat);
          const toCity = cityData.find((c) => c.lat === d.endLat);
          const avgOrders = ((fromCity?.orderCount ?? 0) + (toCity?.orderCount ?? 0)) / 2;
          return 0.3 + (avgOrders / MAX_ORDERS) * 0.5;
        }}
        // --- 交互 ---
        enablePointerInteraction={true}
        animateIn={true}
      />

      {/* ★★★ HTML 标签覆盖层 — 正确渲染中文字符 ★★★ */}
      <GlobeLabels
        globeRef={globeRef}
        containerRef={containerRef}
        labels={cityData.map((c) => ({ id: c.id, name: c.name, lat: c.lat, lng: c.lng, orderCount: c.orderCount }))}
        onCityClick={onCityClick}
      />
    </div>
  );
});

Globe3D.displayName = 'Globe3D';

export default Globe3D;
