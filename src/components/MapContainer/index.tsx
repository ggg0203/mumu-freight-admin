/**
 * ★★★ 腾讯地图容器组件 ★★★
 *
 * 基于腾讯地图 JavaScript API GL (v1.exp)
 * 命名空间: TMap
 * 坐标系: GCJ-02 (纬度, 经度)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Spin, message, Button, Space, Tooltip, Alert } from 'antd';
import {
  AimOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { loadTencentMapSDK, resetSDKLoad } from '@/utils/tmapLoader';
import styles from './index.module.css';

const TENCENT_MAP_KEY = '7SZBZ-2FXK7-GXEX4-POKDI-CCD7F-CJFCX';

export interface MarkerPoint {
  lng: number;
  lat: number;
  title?: string;
  description?: string;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange';
  draggable?: boolean;
}

export interface TrackPoint {
  lng: number;
  lat: number;
  timestamp?: number;
}

export interface MapContainerProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  height?: string | number;
  mapType?: 'normal' | 'satellite';
  markers?: MarkerPoint[];
  tracks?: TrackPoint[];
  trackColor?: string;
  trackWidth?: number;
  trackBorderWidth?: number;
  trackBorderColor?: string;
  autoFitBounds?: boolean;
  /** 轨迹回放动画：当前播放进度对应的车辆位置（传null则隐藏动画标记） */
  animatedPosition?: { lat: number; lng: number } | null;
  onMarkerClick?: (marker: MarkerPoint, index: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onMapReady?: (map: any) => void;
}

interface MarkerData {
  id: string;
  point: MarkerPoint;
  geometry: any;
}

/** 加载 SDK（带 service 库支持路线规划） */
const loadMapSDK = () => loadTencentMapSDK('service');

const MapContainer: React.FC<MapContainerProps> = ({
  className = '',
  initialCenter = { lat: 39.984154, lng: 116.307490 },
  initialZoom = 12,
  height = 500,
  mapType = 'normal',
  markers = [],
  tracks = [],
  trackColor = '#1890ff',
  trackWidth = 4,
  trackBorderWidth = 0,
  trackBorderColor = '',
  autoFitBounds = true,
  animatedPosition = null,
  onMarkerClick,
  onMapClick,
  onMapReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const polylineLayerRef = useRef<any>(null);
  const markersDataRef = useRef<MarkerData[]>([]);
  const animMarkerRef = useRef<any>(null); // 动画车辆标注

  // ★ 用 ref 存储回调函数，避免 initMap 的 stale closure ★
  const onMapClickRef = useRef(onMapClick);
  const onMapReadyRef = useRef(onMapReady);
  const onMarkerClickRef = useRef(onMarkerClick);
  onMapClickRef.current = onMapClick;
  onMapReadyRef.current = onMapReady;
  onMarkerClickRef.current = onMarkerClick;

  const [sdkStatus, setSdkStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [sdkError, setSdkError] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);

  // ★ 稳定化初始配置：用 ref 存储首次传入的值，避免父组件 re-render 导致 map 被销毁重建 ★
  const stableCenterRef = useRef(initialCenter);
  const stableZoomRef = useRef(initialZoom);
  const stableMapTypeRef = useRef(mapType);

  /** 初始化地图 */
  const initMap = useCallback(() => {
    if (!containerRef.current) return;
    if (!window.TMap) {
      console.warn('[MapContainer] TMap not ready');
      return;
    }

    if (mapRef.current) {
      try { mapRef.current.destroy(); } catch { /* ignore */ }
      mapRef.current = null;
    }

    const container = containerRef.current;
    const TMap = window.TMap;
    const center = stableCenterRef.current;
    const zoom = stableZoomRef.current;
    const type = stableMapTypeRef.current;

    try {
      const map = new TMap.Map(container, {
        center: new TMap.LatLng(center.lat, center.lng),
        zoom,
        mapStyleId: type === 'satellite' ? 'satellite' : 'default',
        baseMap: type === 'satellite'
          ? { type: 'satellite', features: ['base', 'building', 'label'] }
          : { type: 'vector', features: ['base', 'building2d', 'label'] },
        pitch: 0,
        rotation: 0,
        draggable: true,
        scrollwheel: true,
        doubleClickZoom: true,
        control: {
          zoom: true,
          scale: true,
          mapType: false,
          rotate: false,
        },
      });

      // 更新 stable ref（仅在首次初始化时铺设事件，确保回调最新）
      onMapReadyRef.current?.(map);
      setMapReady(true);
      setSdkStatus('loaded');

      // 地图点击（使用 ref 避免 stale closure）
      const clickHandler = (evt: any) => {
        if (evt && evt.latLng && onMapClickRef.current) {
          onMapClickRef.current(evt.latLng.getLat(), evt.latLng.getLng());
        }
      };
      map.on('click', clickHandler);

      mapRef.current = map;
    } catch (err) {
      console.error('[MapContainer] init failed:', err);
      setSdkError('地图初始化失败: ' + (err as Error).message);
      setSdkStatus('error');
    }
    // 仅依赖稳定 ref，不追踪变化的 props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 加载 SDK 并初始化（仅执行一次） */
  useEffect(() => {
    let mounted = true;
    loadMapSDK()
      .then(() => {
        if (!mounted) return;
        setSdkStatus('loaded');
        requestAnimationFrame(() => { if (mounted) initMap(); });
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setSdkError(err.message);
        setSdkStatus('error');
      });

    return () => {
      mounted = false;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch { /* ignore */ }
        mapRef.current = null;
      }
    };
  }, [initMap]); // initMap 稳定（空依赖），所以本 effect 只执行一次

  /** 标注功能 */
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    clearAllMarkers();
    if (markers.length > 0) drawMarkers(markers);
  }, [markers, mapReady]);

  /** 轨迹功能 */
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    clearTrack();
    if (tracks.length > 1) drawTrack(tracks);
  }, [tracks, mapReady]);

  /** 动画车辆位置更新 */
  useEffect(() => {
    if (!mapRef.current || !mapReady || !window.TMap) return;

    if (!animatedPosition) {
      // 隐藏动画标记
      if (animMarkerRef.current) {
        animMarkerRef.current.setMap(null);
        animMarkerRef.current = null;
      }
      return;
    }

    const TMap = window.TMap;

    if (!animMarkerRef.current) {
      // 创建车辆标记
      const size = new TMap.MarkerStyle({
        width: 28,
        height: 28,
        anchor: { x: 14, y: 14 },
        src: `data:image/svg+xml;base64,${btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="#1890ff" stroke="#fff" stroke-width="2"/>
            <path d="M9 14 L13 10 L13 13 L19 13 L19 15 L13 15 L13 18 Z" fill="white"/>
          </svg>`
        )}`,
      });

      animMarkerRef.current = new TMap.MultiMarker({
        map: mapRef.current,
        styles: { car: size },
        geometries: [{
          id: 'anim_car',
          styleId: 'car',
          position: new TMap.LatLng(animatedPosition.lat, animatedPosition.lng),
        }],
      });
    } else {
      // 更新位置
      animMarkerRef.current.updateGeometries([{
        id: 'anim_car',
        styleId: 'car',
        position: new TMap.LatLng(animatedPosition.lat, animatedPosition.lng),
      }]);

      // 同时移动地图中心跟随
      mapRef.current.setCenter(new TMap.LatLng(animatedPosition.lat, animatedPosition.lng));
    }
  }, [animatedPosition, mapReady]);

  /** 绘制标注点 */
  const drawMarkers = useCallback((points: MarkerPoint[]) => {
    if (!mapRef.current || !window.TMap) return;
    const TMap = window.TMap;

    const colorMap: Record<string, string> = {
      blue: '#1890ff', red: '#ff4d4f', green: '#52c41a',
      purple: '#722ed1', orange: '#fa8c16',
    };

    // 动态生成样式
    const styles: Record<string, any> = {};
    for (const [key, color] of Object.entries(colorMap)) {
      styles[`s_${key}`] = new TMap.MarkerStyle({
        width: 26, height: 34,
        anchor: { x: 13, y: 34 },
        src: `data:image/svg+xml;base64,${btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
            <path d="M13 0C5.8 0 0 5.8 0 13c0 7.2 13 21 13 21s13-13.8 13-21C26 5.8 20.2 0 13 0z" fill="${color}"/>
            <circle cx="13" cy="12" r="4.5" fill="white"/>
          </svg>`
        )}`,
      });
    }

    const geometries = points.map((p, i) => ({
      id: `m_${i}`,
      styleId: `s_${p.color || 'blue'}`,
      position: new TMap.LatLng(p.lat, p.lng),
      properties: { title: p.title || '', index: i },
    }));

    const markerLayer = new TMap.MultiMarker({
      map: mapRef.current,
      styles,
      geometries,
    });

    markerLayer.on('click', (evt: any) => {
      const idx = evt?.geometry?.properties?.index;
      if (idx !== undefined && onMarkerClickRef.current) onMarkerClickRef.current(points[idx], idx);
      if (evt?.geometry) showInfoWindow(evt.geometry.position, points[evt.geometry.properties.index]);
    });

    markerLayerRef.current = markerLayer;
    markersDataRef.current = points.map((p, i) => ({ id: `m_${i}`, point: p, geometry: geometries[i] }));
  }, []); // 使用 ref 访问 onMarkerClick，无需依赖

  /** 显示信息窗口 */
  const showInfoWindow = useCallback((position: any, point: MarkerPoint) => {
    if (!mapRef.current || !window.TMap) return;
    const TMap = window.TMap;

    // 关闭旧的 infoWindow
    if ((showInfoWindow as any)._iw) {
      (showInfoWindow as any)._iw.destroy();
    }

    const info = new TMap.InfoWindow({
      map: mapRef.current,
      position,
      content: `
        <div style="padding: 8px; max-width: 250px; font-size: 13px;">
          ${point.title ? `<div style="font-weight:bold;margin-bottom:4px;">${point.title}</div>` : ''}
          ${point.description ? `<div style="color:#666;font-size:12px;">${point.description}</div>` : ''}
          <div style="color:#999;font-size:11px;margin-top:4px;">
            ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
          </div>
        </div>
      `,
      offset: { x: 0, y: -35 },
    });

    (showInfoWindow as any)._iw = info;
  }, []);

  /** 清除所有标注 */
  const clearAllMarkers = useCallback(() => {
    if (markerLayerRef.current) {
      markerLayerRef.current.setMap(null);
      markerLayerRef.current = null;
    }
    markersDataRef.current = [];
  }, []);

  /** 绘制轨迹 */
  const drawTrack = useCallback((points: TrackPoint[]) => {
    if (!mapRef.current || !window.TMap || points.length < 2) return;
    const TMap = window.TMap;

    const path = points.map(p => new TMap.LatLng(p.lat, p.lng));

    const polylineLayer = new TMap.MultiPolyline({
      map: mapRef.current,
      styles: {
        style_line: new (TMap.PolylineStyle as any)({
          color: trackColor,
          width: trackWidth,
          borderWidth: trackBorderWidth,
          borderColor: trackBorderColor,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      },
      geometries: [{
        id: 'track_1',
        styleId: 'style_line',
        paths: path,
      }],
    });

    polylineLayerRef.current = polylineLayer;
  }, [trackColor, trackWidth, trackBorderWidth, trackBorderColor]);

  /** 清除轨迹 */
  const clearTrack = useCallback(() => {
    if (polylineLayerRef.current) {
      polylineLayerRef.current.setMap(null);
      polylineLayerRef.current = null;
    }
  }, []);

  /** 适应所有标注 + 轨迹点 */
  const fitBounds = useCallback((pts: Array<{ lat: number; lng: number }>) => {
    if (!mapRef.current || !window.TMap || pts.length === 0) return;
    const TMap = window.TMap;

    const bounds = new TMap.LatLngBounds();
    pts.forEach(p => bounds.extend(new TMap.LatLng(p.lat, p.lng)));
    mapRef.current.fitBounds(bounds, { padding: 50 });
  }, []);

  /** 自动适应（同时包含 markers + tracks） */
  useEffect(() => {
    if (!mapReady || !autoFitBounds) return;

    const allPoints: Array<{ lat: number; lng: number }> = [];
    markers.forEach(m => allPoints.push(m));
    tracks.forEach(t => allPoints.push(t));

    if (allPoints.length > 1) {
      fitBounds(allPoints);
    }
  }, [mapReady, autoFitBounds, markers, tracks]);

  /** 定位 */
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      message.warning('浏览器不支持定位');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mapRef.current) return;
        const center = new window.TMap.LatLng(pos.coords.latitude, pos.coords.longitude);
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(15);
        message.success(`已定位 (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      () => message.error('定位失败，请检查权限'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /** 重试 */
  const handleRetry = useCallback(() => {
    resetSDKLoad();
    setSdkStatus('loading');
    setSdkError('');

    loadMapSDK()
      .then(() => {
        setSdkStatus('loaded');
        requestAnimationFrame(() => initMap());
      })
      .catch((err: Error) => {
        setSdkError(err.message);
        setSdkStatus('error');
      });
  }, [initMap]);

  /** 重新加载 */
  const handleReload = useCallback(() => {
    setMapReady(false);
    if (mapRef.current) {
      try { mapRef.current.destroy(); } catch { /* ignore */ }
      mapRef.current = null;
    }
    clearAllMarkers();
    clearTrack();
    initMap();
  }, [initMap, clearAllMarkers, clearTrack]);

  if (sdkStatus === 'error') {
    return (
      <div className={`${styles.mapCard} ${className}`}>
        <Alert
          message="地图加载失败"
          description={sdkError}
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" onClick={handleRetry}>重新加载</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={`${styles.mapWrapper} ${className}`}>
      {/* 工具栏 */}
      <div className={styles.mapToolbar}>
        <Tooltip title="定位当前位置">
          <Button type="text" icon={<AimOutlined />} onClick={handleLocate} disabled={!mapReady} />
        </Tooltip>
        <Tooltip title="清除标注和轨迹">
          <Button type="text" icon={<DeleteOutlined />} disabled={!mapReady}
            onClick={() => { clearAllMarkers(); clearTrack(); message.success('已清除'); }} />
        </Tooltip>
        <Tooltip title="重新加载地图">
          <Button type="text" icon={<ReloadOutlined />} onClick={handleReload} disabled={!mapReady} />
        </Tooltip>
      </div>
      <div
        ref={containerRef}
        className={styles.mapContainer}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        {sdkStatus === 'loading' && (
          <div className={styles.loadingMask}>
            <Spin size="large" />
            <span className={styles.loadingText}>地图加载中...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapContainer;
// 类型已在定义处通过 export 导出，无需重复导出
// export type { MarkerPoint, TrackPoint, MapContainerProps };
