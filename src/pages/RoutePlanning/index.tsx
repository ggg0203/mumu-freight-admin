/**
 * ★★★ 智能路线规划 ★★★
 *
 * 基于腾讯地图 WebService API (v1)
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Row, Col, Button, Select, Space, Tag,
  message, Spin, Alert, Divider, Statistic,
} from 'antd';
import {
  CarOutlined, SwapOutlined, AimOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { loadTencentMapSDK } from '@/utils/tmapLoader';
import { decodePolyline } from '@/utils/drivingRouteUtils';
import styles from './index.module.css';

const MAP_KEY = '7SZBZ-2FXK7-GXEX4-POKDI-CCD7F-CJFCX';

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const presetLocations: Location[] = [
  { name: '北京朝阳区仓库', address: '北京市朝阳区望京SOHO', lat: 39.996480, lng: 116.477540 },
  { name: '北京海淀区客户', address: '北京市海淀区中关村', lat: 40.038740, lng: 116.320210 },
  { name: '上海浦东新区仓库', address: '上海市浦东新区张江高科', lat: 31.215450, lng: 121.608230 },
  { name: '上海静安区客户', address: '上海市静安区南京西路', lat: 31.228520, lng: 121.451230 },
  { name: '广州天河区仓库', address: '广州市天河区珠江新城', lat: 23.119562, lng: 113.321234 },
  { name: '广州越秀区客户', address: '广州市越秀区北京路', lat: 23.129746, lng: 113.265432 },
  { name: '深圳南山区仓库', address: '深圳市南山区科技园', lat: 22.536220, lng: 113.954230 },
  { name: '深圳福田区客户', address: '深圳市福田区市民中心', lat: 22.543487, lng: 114.062430 },
];


const RoutePlanning: React.FC = () => {
  const { t } = useTranslation();
  const [fromLocation, setFromLocation] = useState(presetLocations[0]);
  const [toLocation, setToLocation] = useState(presetLocations[1]);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 保存旧图层实例以在重新规划时清理
  const routeMarkersRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  // 加载 SDK
  useEffect(() => {
    let mounted = true;
    loadTencentMapSDK()
      .then(() => { if (mounted) setSdkReady(true); })
      .catch(() => { if (mounted) message.error(t('routePlanning.planFailed')); });
    return () => { mounted = false; };
  }, []);

  // ★★★ SDK 就绪时初始化地图（只一次）★★★
  useEffect(() => {
    if (!sdkReady || !containerRef.current || mapRef.current) return;
    console.log('[RoutePlanning] Initializing map');
    const TMap = window.TMap!;

    const centerLat = (fromLocation.lat + toLocation.lat) / 2;
    const centerLng = (fromLocation.lng + toLocation.lng) / 2;

    const map = new TMap.Map(containerRef.current, {
      center: new TMap.LatLng(centerLat, centerLng),
      zoom: 11,
      control: { zoom: true, scale: true },
    });

    mapRef.current = map;
    console.log('[RoutePlanning] Map initialized');
  }, [sdkReady]);

  // ★★★ routeResult 变化时画路线（先清理旧图层）★★★
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeResult || !window.TMap) return;
    console.log('[RoutePlanning] Drawing route, distance:', routeResult.distance);

    const TMap = window.TMap!;

    // ★ 清理旧图层：将旧实例从地图上移除 ★
    if (routeMarkersRef.current) {
      try { routeMarkersRef.current.setMap?.(null); } catch { /* ignore */ }
      routeMarkersRef.current = null;
    }
    if (routePolylineRef.current) {
      try { routePolylineRef.current.setMap?.(null); } catch { /* ignore */ }
      routePolylineRef.current = null;
    }

    // 1. 画起点终点
    const startSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.3 0 14c0 7.7 14 22 14 22s14-14.3 14-22C28 6.3 21.7 0 14 0z" fill="#52c41a"/><circle cx="14" cy="13" r="5" fill="white"/></svg>`;
    const endSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.3 0 14c0 7.7 14 22 14 22s14-14.3 14-22C28 6.3 21.7 0 14 0z" fill="#ff4d4f"/><circle cx="14" cy="13" r="5" fill="white"/></svg>`;

    const markers = new TMap.MultiMarker({
      map,
      styles: {
        start: new TMap.MarkerStyle({ width: 28, height: 36, anchor: { x: 14, y: 36 }, src: 'data:image/svg+xml;base64,' + btoa(startSvg) }),
        end: new TMap.MarkerStyle({ width: 28, height: 36, anchor: { x: 14, y: 36 }, src: 'data:image/svg+xml;base64,' + btoa(endSvg) }),
      },
      geometries: [
        { id: 'start', styleId: 'start', position: new TMap.LatLng(fromLocation.lat, fromLocation.lng), properties: {} },
        { id: 'end', styleId: 'end', position: new TMap.LatLng(toLocation.lat, toLocation.lng), properties: {} },
      ],
    });
    routeMarkersRef.current = markers; // ★ 保存实例以便下次清理

    // 2. 画路线
    try {
      const decoded = decodePolyline(routeResult.polyline);
      if (decoded.length >= 2) {
        const path = decoded.map(p => new TMap.LatLng(p.lat, p.lng));
        console.log('[RoutePlanning] Polyline decoded:', decoded.length, 'points');

        const polyline = new TMap.MultiPolyline({
          map,
          styles: {
            route: new (TMap.PolylineStyle as any)({ color: '#1890ff', width: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', lineCap: 'round', lineJoin: 'round' }),
          },
          geometries: [{ id: 'route', styleId: 'route', paths: path }],
        });
        routePolylineRef.current = polyline; // ★ 保存实例以便下次清理

        // 自适应
        const bounds = new TMap.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        map.fitBounds(bounds, { padding: 60 });
        console.log('[RoutePlanning] Route drawn, fitBounds called');
        return;
      }
    } catch (e) {
      console.warn('[RoutePlanning] Polyline draw failed:', e);
    }

    // 降级：只 fit 起终点
    const bounds = new TMap.LatLngBounds();
    bounds.extend(new TMap.LatLng(fromLocation.lat, fromLocation.lng));
    bounds.extend(new TMap.LatLng(toLocation.lat, toLocation.lng));
    map.fitBounds(bounds, { padding: 60 });
  }, [routeResult]);

  /** 规划路线 */
  const planRoute = async () => {
    setLoading(true);
    setRouteResult(null);

    try {
      const resp = await fetch(`/mapapi/?from=${fromLocation.lat},${fromLocation.lng}&to=${toLocation.lat},${toLocation.lng}&key=${MAP_KEY}`);
      const data = await resp.json();

      if (data.status !== 0) {
        message.error(t('routePlanning.planFailed') + ': ' + (data.message || t('routePlanning.unknownError')));
        setLoading(false);
        return;
      }

      const route = data.result.routes[0];
      console.log('[RoutePlanning] API success:', route.distance + 'm', route.duration + 'min');
      setRouteResult(route);
    } catch (err) {
      console.error('[RoutePlanning] Fetch error:', err);
      message.error(`${t('routePlanning.requestFailed')}: ` + (err as Error).message);
    }
    setLoading(false);
  };

  const swapLocations = () => {
    setFromLocation(toLocation);
    setToLocation(fromLocation);
    setRouteResult(null);
  };

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}${t('routePlanning.hours')}${m}${t('routePlanning.minutes')}` : `${m}${t('routePlanning.minutes')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2><CarOutlined style={{ marginRight: 8 }} />{t('routePlanning.title')}</h2>
        <p className={styles.subtitle}>{t('routePlanning.desc')}</p>
      </div>
      <Row gutter={16}>
        <Col span={7}>
          <Card className={styles.controlCard} title={<><EnvironmentOutlined style={{ color: '#52c41a' }} /> {t('routePlanning.origin')}</>} size="small">
            <Select value={fromLocation.name} onChange={(_, opt: any) => setFromLocation(presetLocations.find(l => l.name === opt.value) || fromLocation)} style={{ width: '100%' }}>
              {presetLocations.map(l => <Select.Option key={l.name} value={l.name}>{l.name}</Select.Option>)}
            </Select>
          </Card>
          <div className={styles.swapBtn}>
            <Button type="dashed" shape="circle" icon={<SwapOutlined />} onClick={swapLocations} size="large" />
          </div>
          <Card className={styles.controlCard} title={<><EnvironmentOutlined style={{ color: '#ff4d4f' }} /> {t('routePlanning.destination')}</>} size="small">
            <Select value={toLocation.name} onChange={(_, opt: any) => setToLocation(presetLocations.find(l => l.name === opt.value) || toLocation)} style={{ width: '100%' }}>
              {presetLocations.map(l => <Select.Option key={l.name} value={l.name}>{l.name}</Select.Option>)}
            </Select>
          </Card>
          <Button type="primary" block size="large" icon={<AimOutlined />} onClick={planRoute} loading={loading} disabled={!sdkReady || loading} className={styles.planBtn}>
            {!sdkReady ? t('routePlanning.loadingMap') : t('routePlanning.startPlanning')}
          </Button>
          {!sdkReady && <Alert message={t('routePlanning.loadingMap')} type="info" showIcon style={{ marginTop: 8 }} />}

          {routeResult && (
            <Card className={styles.resultCard} size="small">
              <div className={styles.resultHeader}>
                <CarOutlined style={{ color: '#1890ff' }} />
                <span>{t('routePlanning.planningResult')}</span>
                <Tag color="blue">{t('routePlanning.drivingRoute')}</Tag>
              </div>
              <Row gutter={8} style={{ marginTop: 12 }}>
                <Col span={12}><Statistic title={t('routePlanning.totalDistance')} value={(routeResult.distance / 1000).toFixed(1)} suffix="km" valueStyle={{ color: '#1890ff', fontSize: 20 }} /></Col>
                <Col span={12}><Statistic title={t('routePlanning.estimatedTime')} value={formatDuration(routeResult.duration)} valueStyle={{ color: '#52c41a', fontSize: 20 }} /></Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <div className={styles.routeSteps}>
                <div className={styles.stepItem}>
                  <div className={styles.stepDot} style={{ background: '#52c41a' }} />
                  <div className={styles.stepContent}>
                    <div className={styles.stepTitle}>{fromLocation.name}</div>
                    <div className={styles.stepDesc}>{fromLocation.address}</div>
                  </div>
                </div>
                {routeResult.steps?.slice(0, 8).map((step: any, i: number) => (
                  <div key={i} className={styles.stepItem}>
                    <div className={styles.stepLine} />
                    <div className={styles.stepContent}>
                      <div className={styles.stepTitle}>{step.instruction || step.act_desc || ''}</div>
                      <div className={styles.stepDesc}>{(step.distance / 1000).toFixed(1)}km{step.road_name ? ` · ${step.road_name}` : ''}</div>
                    </div>
                  </div>
                ))}
                <div className={styles.stepItem}>
                  <div className={styles.stepDot} style={{ background: '#ff4d4f' }} />
                  <div className={styles.stepContent}>
                    <div className={styles.stepTitle}>{toLocation.name}</div>
                    <div className={styles.stepDesc}>{toLocation.address}</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </Col>

        <Col span={17}>
          <Card className={styles.mapCard}>
            <div
              ref={containerRef}
              id="routeMap"
              className={styles.mapContainer}
              style={{ height: 600 }}
            >
              {!sdkReady && (
                <div className={styles.mapPlaceholder}>
                  <Spin size="large" style={{ marginBottom: 16 }} />
                  <p>{t('routePlanning.loadingMap')}</p>
                </div>
              )}
              {sdkReady && !routeResult && (
                <div className={styles.mapPlaceholder}>
                  <CarOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
                  <p>{t('routePlanning.noResultTitle')}</p>
                  <p style={{ color: '#999', fontSize: 13 }}>{t('routePlanning.noResultDesc')}</p>
                </div>
              )}
              {loading && (
                <div className={styles.mapLoading}>
                  <Spin size="large" />
                  <p>{t('routePlanning.planning')}</p>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RoutePlanning;
