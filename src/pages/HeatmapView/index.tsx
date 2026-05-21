/**
 * ★★★ 配送热力分布图 ★★★
 *
 * 基于 ECharts 中国地图 + 热力图
 * 展示全国各城市订单配送密度
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Select, Spin, Statistic, Tag } from 'antd';
import { HeatMapOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import styles from './index.module.css';

// ==================== 模拟配送热点数据 ====================

const hotCities = [
  { name: '北京', value: [116.46, 39.92, 1250], level: 'high' },
  { name: '上海', value: [121.48, 31.22, 1180], level: 'high' },
  { name: '深圳', value: [114.07, 22.62, 980], level: 'high' },
  { name: '广州', value: [113.23, 23.16, 920], level: 'high' },
  { name: '杭州', value: [120.19, 30.26, 650], level: 'high' },
  { name: '成都', value: [104.06, 30.67, 580], level: 'medium' },
  { name: '武汉', value: [114.31, 30.52, 520], level: 'medium' },
  { name: '南京', value: [118.78, 32.04, 480], level: 'medium' },
  { name: '重庆', value: [106.54, 29.59, 420], level: 'medium' },
  { name: '西安', value: [108.93, 34.26, 380], level: 'medium' },
  { name: '青岛', value: [120.33, 36.07, 350], level: 'medium' },
  { name: '长沙', value: [112.98, 28.19, 320], level: 'medium' },
  { name: '天津', value: [117.19, 39.13, 290], level: 'low' },
  { name: '苏州', value: [120.62, 31.32, 260], level: 'low' },
  { name: '郑州', value: [113.65, 34.76, 230], level: 'low' },
  { name: '东莞', value: [113.75, 23.04, 210], level: 'low' },
  { name: '佛山', value: [113.11, 23.05, 190], level: 'low' },
  { name: '合肥', value: [117.27, 31.86, 170], level: 'low' },
  { name: '福州', value: [119.30, 26.08, 150], level: 'low' },
  { name: '昆明', value: [102.71, 25.04, 130], level: 'low' },
  { name: '大连', value: [121.62, 38.92, 120], level: 'low' },
  { name: '沈阳', value: [123.43, 41.80, 110], level: 'low' },
  { name: '厦门', value: [118.10, 24.46, 100], level: 'low' },
  { name: '济南', value: [117.00, 36.65, 95], level: 'low' },
  { name: '南宁', value: [108.33, 22.84, 85], level: 'low' },
  { name: '贵阳', value: [106.71, 26.57, 75], level: 'low' },
  { name: '兰州', value: [103.73, 36.03, 60], level: 'low' },
  { name: '哈尔滨', value: [126.63, 45.75, 55], level: 'low' },
  { name: '海口', value: [110.35, 20.02, 45], level: 'low' },
  { name: '乌鲁木齐', value: [87.68, 43.77, 35], level: 'low' },
];

// 热力随机点（在全国范围内生成更多随机点）
const generateHeatPoints = () => {
  const points: number[][] = [];
  hotCities.forEach(city => {
    const count = Math.floor(city.value[2] / 10);
    for (let i = 0; i < count; i++) {
      points.push([
        city.value[0] + (Math.random() - 0.5) * 0.8,
        city.value[1] + (Math.random() - 0.5) * 0.6,
        Math.floor(Math.random() * 50 + 10),
      ]);
    }
  });
  return points;
};

// ==================== 主组件 ====================

const HeatmapView: React.FC = () => {
  const { t } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewType, setViewType] = useState<'heatmap' | 'scatter' | 'both'>('both');
  const chartRef = useRef<any>(null);

  // 加载中国地图 GeoJSON
  useEffect(() => {
    fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
      .then(res => res.json())
      .then(geoJson => {
        echarts.registerMap('china', geoJson as any);
        setMapLoaded(true);
      })
      .catch(() => {
        // 如果 CDN 加载失败，使用备用数据
        setMapLoaded(false);
      });
  }, []);

  // 热力散点颜色映射
  const colorMap: Record<string, string> = {
    high: '#ff4d4f',
    medium: '#fa8c16',
    low: '#52c41a',
  };

  // ECharts 配置
  const getOption = () => {
    const heatPoints = generateHeatPoints();

    const series: any[] = [];

    if (viewType === 'scatter' || viewType === 'both') {
      series.push({
        name: t('heatmap.cityOrderVolume'),
        type: 'scatter',
        coordinateSystem: 'geo',
        data: hotCities.map(c => ({
          name: c.name,
          value: [...c.value.slice(0, 2), c.value[2]],
        })),
        symbolSize: (val: number[]) => Math.max(8, Math.min(30, val[2] / 40)),
        label: {
          formatter: '{b}',
          position: 'right',
          show: true,
          color: '#333',
          fontSize: 11,
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
        itemStyle: {
          shadowBlur: 4,
          shadowColor: 'rgba(0,0,0,0.2)',
          color: (params: any) => colorMap[hotCities[params.dataIndex]?.level] || '#1677ff',
        },
      });
    }

    if (viewType === 'heatmap' || viewType === 'both') {
      series.push({
        name: t('heatmap.deliveryDensity'),
        type: 'heatmap',
        coordinateSystem: 'geo',
        data: heatPoints,
        blurSize: 25,
        pointSize: 8,
        maxOpacity: 0.6,
        minOpacity: 0.05,
      });
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesName === t('heatmap.cityOrderVolume')) {
            return `<strong>${params.name}</strong><br/>${t('heatmap.tooltipOrderVolume')}: <strong>${params.value[2]}</strong> ${t('heatmap.unitOrders')}`;
          }
          return `${t('heatmap.tooltipDeliveryDensity')}: ${params.value?.[2] || 'N/A'}`;
        },
      },
      visualMap: {
        min: 0,
        max: 150,
        calculable: true,
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027'],
        },
        textStyle: { color: '#666' },
        left: 'left',
        bottom: 20,
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [104, 35],
        label: { show: false },
        itemStyle: {
          areaColor: '#e8edf4',
          borderColor: '#bcc5d3',
          borderWidth: 1,
        },
        emphasis: {
          itemStyle: { areaColor: '#d4dce8' },
          label: { show: false },
        },
      },
      series,
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2><HeatMapOutlined style={{ marginRight: 8 }} />{t('heatmap.title')}</h2>
        <p className={styles.subtitle}>{t('heatmap.desc')}</p>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('heatmap.monitoredCities')} value={hotCities.length} suffix={t('heatmap.unitCities')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('heatmap.monthlyAvgOrders')} value={12580} suffix={t('heatmap.unitOrders')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('heatmap.heatmapSamples')} value={generateHeatPoints().length} suffix={t('heatmap.unitSamples')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Select value={viewType} onChange={setViewType} style={{ width: '100%' }}>
              <Select.Option value="both">{t('heatmap.heatmapScatter')}</Select.Option>
              <Select.Option value="heatmap">{t('heatmap.heatmapOnly')}</Select.Option>
              <Select.Option value="scatter">{t('heatmap.scatterOnly')}</Select.Option>
            </Select>
          </Card>
        </Col>
      </Row>

      <Card className={styles.mapCard}>
        {!mapLoaded ? (
          <div className={styles.loading}>
            <Spin size="large" />
            <p>{t('heatmap.loadingMap')}</p>
          </div>
        ) : (
          <ReactECharts
            ref={chartRef}
            option={getOption()}
            style={{ height: 650 }}
            notMerge
            opts={{ renderer: 'canvas' }}
          />
        )}
      </Card>

      {/* 热力图例 */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>{t('heatmap.densityLabel')}</span>
        <span className={styles.legendGradient}>
          <span style={{ background: '#313695' }} />
          <span style={{ background: '#4575b4' }} />
          <span style={{ background: '#74add1' }} />
          <span style={{ background: '#abd9e9' }} />
          <span style={{ background: '#ffffbf' }} />
          <span style={{ background: '#fee090' }} />
          <span style={{ background: '#fdae61' }} />
          <span style={{ background: '#f46d43' }} />
          <span style={{ background: '#d73027' }} />
        </span>
        <span className={styles.legendLabel}>{t('heatmap.low')}</span>
        <span className={styles.legendLabel} style={{ marginLeft: 0 }}>{t('heatmap.high')}</span>

        <span style={{ margin: '0 20px' }} />
        <span className={styles.legendLabel}>{t('heatmap.scatterLabel')}</span>
        <Tag color="#ff4d4f">{t('heatmap.highDensity')}</Tag>
        <Tag color="#fa8c16">{t('heatmap.midDensity')}</Tag>
        <Tag color="#52c41a">{t('heatmap.lowDensity')}</Tag>
      </div>
    </div>
  );
};

export default HeatmapView;
