/**
 * ★★★ 数据可视化大屏 ★★★
 *
 * 全屏展示，实时数据，酷炫动效
 * 用于比赛演示、大屏展示场景
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import MapContainer from '@/components/MapContainer';
import styles from './index.module.css';

// ==================== 工具函数 ====================

/** 数字动画组件 */
const AnimatedNumber: React.FC<{ value: number; suffix?: string; decimals?: number }> = ({ value, suffix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value]);

  return <span>{display.toFixed(decimals)}{suffix}</span>;
};

// ==================== Mock 数据生成器 ====================

const generateStats = () => ({
  totalOrders: 12580 + Math.floor(Math.random() * 200 - 100),
  totalRevenue: 3860000 + Math.floor(Math.random() * 50000 - 25000),
  activeDrivers: 268 + Math.floor(Math.random() * 10 - 5),
  coveredCities: 52 + Math.floor(Math.random() * 3 - 1),
  growthOrders: (12.5 + Math.random() * 3 - 1.5).toFixed(1),
  growthRevenue: (8.3 + Math.random() * 2 - 1).toFixed(1),
  growthDrivers: (3.2 + Math.random() * 2 - 1).toFixed(1),
  growthCities: (5.0 + Math.random() * 1 - 0.5).toFixed(1),
});

const generateOrderTrend = () => {
  const base = [1250, 1380, 1520, 1480, 1650, 1720, 1580, 1820, 1950, 2100, 2280, 2450];
  return base.map(v => v + Math.floor(Math.random() * 200 - 100));
};

const generateCityData = () => [
  { value: 420 + Math.floor(Math.random() * 50), name: '北京' },
  { value: 380 + Math.floor(Math.random() * 50), name: '上海' },
  { value: 320 + Math.floor(Math.random() * 40), name: '深圳' },
  { value: 290 + Math.floor(Math.random() * 40), name: '广州' },
  { value: 210 + Math.floor(Math.random() * 30), name: '杭州' },
  { value: 180 + Math.floor(Math.random() * 30), name: '成都' },
  { value: 150 + Math.floor(Math.random() * 20), name: '武汉' },
  { value: 120 + Math.floor(Math.random() * 20), name: '南京' },
];

const generateCargoTypes = () => [
  { value: 35 + Math.floor(Math.random() * 5), name: '日用百货' },
  { value: 25 + Math.floor(Math.random() * 5), name: '电子产品' },
  { value: 18 + Math.floor(Math.random() * 3), name: '食品生鲜' },
  { value: 12 + Math.floor(Math.random() * 3), name: '建材家居' },
  { value: 10 + Math.floor(Math.random() * 2), name: '医疗器械' },
];

const generateDriverRanking = () => [
  { name: '张师傅', value: 98 + Math.floor(Math.random() * 5) },
  { name: '李师傅', value: 92 + Math.floor(Math.random() * 5) },
  { name: '王师傅', value: 87 + Math.floor(Math.random() * 5) },
  { name: '赵师傅', value: 83 + Math.floor(Math.random() * 5) },
  { name: '刘师傅', value: 78 + Math.floor(Math.random() * 5) },
  { name: '陈师傅', value: 74 + Math.floor(Math.random() * 5) },
  { name: '杨师傅', value: 69 + Math.floor(Math.random() * 5) },
  { name: '周师傅', value: 65 + Math.floor(Math.random() * 5) },
];

const generateRealTimeOrders = () => {
  const names = ['王小明', '李大力', '张建国', '赵四海', '刘华强', '陈志远', '杨一帆', '周明远'];
  const cities = ['北京', '上海', '深圳', '广州', '杭州', '成都', '武汉', '南京'];
  const statuses: Array<'success' | 'processing' | 'warning'> = ['success', 'processing', 'warning'];
  const count = 8 + Math.floor(Math.random() * 5);

  return Array.from({ length: count }, (_, i) => ({
    id: `YD${Date.now().toString(36).toUpperCase()}${i}`,
    customer: names[Math.floor(Math.random() * names.length)],
    from: cities[Math.floor(Math.random() * cities.length)],
    to: cities[Math.floor(Math.random() * cities.length)],
    amount: Math.floor(Math.random() * 500 + 50),
    status: statuses[Math.floor(Math.random() * statuses.length)],
  }));
};

// ==================== 全国配送标注点 ====================

const deliveryMarkers = [
  { lat: 39.9042, lng: 116.4074, title: '北京总仓', color: 'red' as const },
  { lat: 31.2304, lng: 121.4737, title: '上海分仓', color: 'blue' as const },
  { lat: 22.5431, lng: 114.0579, title: '深圳分仓', color: 'blue' as const },
  { lat: 23.1291, lng: 113.2644, title: '广州分仓', color: 'blue' as const },
  { lat: 30.2741, lng: 120.1551, title: '杭州分仓', color: 'blue' as const },
  { lat: 30.5728, lng: 104.0668, title: '成都分仓', color: 'blue' as const },
  { lat: 30.5928, lng: 114.3055, title: '武汉分仓', color: 'blue' as const },
  { lat: 32.0603, lng: 118.7969, title: '南京分仓', color: 'blue' as const },
  { lat: 34.3416, lng: 108.9398, title: '西安分仓', color: 'blue' as const },
  { lat: 29.5630, lng: 106.5516, title: '重庆分仓', color: 'blue' as const },
  { lat: 36.0611, lng: 120.3826, title: '青岛分仓', color: 'blue' as const },
  { lat: 22.5388, lng: 113.9088, title: '佛山分仓', color: 'blue' as const },
];

// ==================== ECharts 主题色 ====================

const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

// ==================== 主组件 ====================

const BigScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(generateStats);
  const [orderTrend, setOrderTrend] = useState(generateOrderTrend);
  const [cityData, setCityData] = useState(generateCityData);
  const [cargoData, setCargoData] = useState(generateCargoTypes);
  const [driverData, setDriverData] = useState(generateDriverRanking);
  const [orders, setOrders] = useState(generateRealTimeOrders);
  const [currentTime, setCurrentTime] = useState('');
  const [scrollIndex, setScrollIndex] = useState(0);

  // 时钟
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // 自动刷新数据
  useEffect(() => {
    const timer = setInterval(() => {
      setStats(generateStats());
      setOrderTrend(generateOrderTrend());
      setCityData(generateCityData());
      setCargoData(generateCargoTypes());
      setDriverData(generateDriverRanking());
      setOrders(generateRealTimeOrders());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 订单滚动
  useEffect(() => {
    if (orders.length <= 5) return;
    const timer = setInterval(() => {
      setScrollIndex(prev => (prev + 1) % orders.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [orders.length]);

  // 月份标签
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 订单趋势图配置
  const trendOption = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(20,30,50,0.9)', borderColor: '#1677ff', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)', type: 'dashed' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)' },
    },
    series: [{
      name: t('screen.orderVolume'),
      type: 'line',
      data: orderTrend,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#5470c6', width: 3 },
      itemStyle: { color: '#5470c6' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(84,112,198,0.4)' },
            { offset: 1, color: 'rgba(84,112,198,0.02)' },
          ],
        },
      },
    }],
  };

  // 城市排名柱状图
  const cityOption = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(20,30,50,0.9)', borderColor: '#91cc75', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: cityData.map(d => d.name),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)', type: 'dashed' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)' },
    },
    series: [{
      type: 'bar',
      data: cityData.map((d, i) => ({
        value: d.value,
        itemStyle: { color: colors[i % colors.length], borderRadius: [4, 4, 0, 0] },
      })),
      barWidth: 24,
    }],
  };

  // 货物类型饼图
  const cargoOption = {
    tooltip: { trigger: 'item', backgroundColor: 'rgba(20,30,50,0.9)', borderColor: '#fac858', textStyle: { color: '#fff' }, formatter: '{b}: {c}% ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['30%', '55%'],
      center: ['50%', '50%'],
      roseType: 'area',
      data: cargoData.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      label: { color: 'rgba(255,255,255,0.7)', formatter: '{b}\n{d}%' },
      labelLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
    }],
  };

  // 司机排行榜条形图
  const driverOption = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(20,30,50,0.9)', borderColor: '#73c0de', textStyle: { color: '#fff' } },
    grid: { left: '20%', right: '10%', top: '5%', bottom: '5%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)', type: 'dashed' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)' },
    },
    yAxis: {
      type: 'category',
      data: [...driverData].sort((a, b) => a.value - b.value).map(d => d.name),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      axisLabel: { color: 'rgba(255,255,255,0.7)' },
    },
    series: [{
      type: 'bar',
      data: [...driverData].sort((a, b) => a.value - b.value).map((d, i) => ({
        value: d.value,
        itemStyle: {
          color: i >= driverData.length - 3 ? '#fac858' : '#5470c6',
          borderRadius: [0, 6, 6, 0],
        },
      })),
      barWidth: 14,
    }],
  };

  // 地图组件（使用 useMemo 避免每5秒刷新）
  const mapView = useMemo(() => (
    <div style={{ height: 300, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer
        height={300}
        markers={deliveryMarkers}
        initialCenter={{ lat: 33, lng: 112 }}
        initialZoom={4}
        autoFitBounds={true}
      />
    </div>
  ), []);
  const getStatusTag = (status: string) => {
    const map: Record<string, { text: string; className: string }> = {
      success: { text: t('screen.delivered'), className: styles.tagSuccess },
      processing: { text: t('screen.inTransit'), className: styles.tagProcessing },
      warning: { text: t('screen.pendingPickup'), className: styles.tagWarning },
    };
    const s = map[status] || { text: status, className: '' };
    return <span className={`${styles.statusTag} ${s.className}`}>{s.text}</span>;
  };

  return (
    <div className={styles.screen}>
      {/* ★★★ 顶部标题栏 ★★★ */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />}
            onClick={() => navigate(-1)}
            style={{ marginRight: 4 }}
          />
          <span className={styles.headerLine} />
          <span className={styles.headerTitle}>{t('screen.title')}</span>
          <span className={styles.headerLine} />
        </div>
        <div className={styles.headerCenter}>{t('screen.desc')}</div>
        <div className={styles.headerRight}>{currentTime}</div>
      </header>

      {/* ★★★ 核心指标卡片 ★★★ */}
      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(84,112,198,0.2)', color: '#5470c6' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div className={styles.statBody}>
            <div className={styles.statLabel}>{t('screen.totalOrders')}</div>
            <div className={styles.statValue}>
              <AnimatedNumber value={stats.totalOrders} />单
            </div>
            <div className={`${styles.statGrowth} ${Number(stats.growthOrders) >= 0 ? styles.up : styles.down}`}>
              ↑ {stats.growthOrders}%
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(145,204,117,0.2)', color: '#91cc75' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className={styles.statBody}>
            <div className={styles.statLabel}>{t('screen.totalRevenue')}</div>
            <div className={styles.statValue}>
              ¥<AnimatedNumber value={Math.round(stats.totalRevenue / 10000)} />{t('screen.unitMillion')}
            </div>
            <div className={`${styles.statGrowth} ${Number(stats.growthRevenue) >= 0 ? styles.up : styles.down}`}>
              ↑ {stats.growthRevenue}%
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(250,200,88,0.2)', color: '#fac858' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className={styles.statBody}>
            <div className={styles.statLabel}>{t('screen.activeDrivers')}</div>
            <div className={styles.statValue}>
              <AnimatedNumber value={stats.activeDrivers} />{t('screen.unitPeople')}
            </div>
            <div className={`${styles.statGrowth} ${Number(stats.growthDrivers) >= 0 ? styles.up : styles.down}`}>
              ↑ {stats.growthDrivers}%
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(115,192,222,0.2)', color: '#73c0de' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div className={styles.statBody}>
            <div className={styles.statLabel}>{t('screen.coveredCities')}</div>
            <div className={styles.statValue}>
              <AnimatedNumber value={stats.coveredCities} />{t('screen.unitCities')}
            </div>
            <div className={`${styles.statGrowth} ${Number(stats.growthCities) >= 0 ? styles.up : styles.down}`}>
              ↑ {stats.growthCities}%
            </div>
          </div>
        </div>
      </section>

      {/* ★★★ 中间行：订单趋势 + 地图 ★★★ */}
      <Row gutter={16} className={styles.chartRow}>
        <Col span={10}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span className={styles.titleDot} style={{ background: '#5470c6' }} />
              {t('screen.orderTrend')}
            </div>
            <ReactECharts option={trendOption} style={{ height: 300 }} notMerge />
          </div>
        </Col>
        <Col span={14}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span className={styles.titleDot} style={{ background: '#91cc75' }} />
              {t('screen.distributionPoints')}
            </div>
            {mapView}
          </div>
        </Col>
      </Row>

      {/* ★★★ 底部行 ★★★ */}
      <Row gutter={16} className={styles.chartRow}>
        <Col span={6}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span className={styles.titleDot} style={{ background: '#fac858' }} />
              {t('screen.cityRank')}
            </div>
            <ReactECharts option={cityOption} style={{ height: 240 }} notMerge />
          </div>
        </Col>
        <Col span={5}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span className={styles.titleDot} style={{ background: '#ee6666' }} />
              {t('screen.cargoType')}
            </div>
            <ReactECharts option={cargoOption} style={{ height: 240 }} notMerge />
          </div>
        </Col>
        <Col span={7}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span className={styles.titleDot} style={{ background: '#73c0de' }} />
              {t('screen.realtimeOrders')}
            </div>
            <div className={styles.orderList}>
              {orders.slice(scrollIndex % orders.length, (scrollIndex % orders.length) + 5).map((order, i) => (
                <div key={order.id} className={styles.orderItem} style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className={styles.orderId}>{order.id.slice(-8)}</span>
                  <span className={styles.orderRoute}>{order.from} → {order.to}</span>
                  <span className={styles.orderAmount}>¥{order.amount}</span>
                  {getStatusTag(order.status)}
                </div>
              ))}
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>
              <span className={styles.titleDot} style={{ background: '#3ba272' }} />
              {t('screen.driverRank')}
            </div>
            <ReactECharts option={driverOption} style={{ height: 240 }} notMerge />
          </div>
        </Col>
      </Row>

      {/* ★★★ 底部装饰线 ★★★ */}
      <footer className={styles.footer}>
        <div className={styles.footerLine} />
        <div className={styles.footerText}>{t('screen.footer')}</div>
      </footer>
    </div>
  );
};

export default BigScreen;
