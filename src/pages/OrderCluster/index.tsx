/**
 * ★★★ 订单聚合页面 ★★★
 *
 * 功能：
 * 1. 用 ECharts 散点图模拟城市订单分布
 * 2. 统计不同城市订单数量
 * 3. 展示订单热点区域
 */

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Statistic, Space } from 'antd';
import { ShoppingCartOutlined, RiseOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { computeCityOrderStats, computeMonthlyTrend, getOrders } from '@/shared-data';
import styles from './index.module.css';

// ==================== 实时计算数据 ====================

const getStats = () => {
  const cityOrderData = computeCityOrderStats();
  const totalOrders = cityOrderData.reduce((sum, c) => sum + c.count, 0);
  const avgOrders = cityOrderData.length > 0 ? Math.round(totalOrders / cityOrderData.length) : 0;
  const monthlyTrend = computeMonthlyTrend();
  const topCity = cityOrderData.length > 0 ? cityOrderData.sort((a, b) => b.count - a.count)[0].city : '-';
  return { cityOrderData, totalOrders, avgOrders, monthlyTrend, topCity };
};

// ==================== 组件 ====================

const OrderCluster: React.FC = () => {
  const { t } = useTranslation();
  const chartRef = useRef<ReactECharts>(null);
  const { cityOrderData, totalOrders, avgOrders, monthlyTrend, topCity } = getStats();

  // 散点图配置 - 模拟城市订单分布
  const scatterOption = {
    title: {
      text: t('orderCluster.heatmapTitle'),
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number[] }) => {
        const city = cityOrderData.find(
          (d) => d.lng === params.value[0] && d.lat === params.value[1]
        );
        return city
          ? `<strong>${city.city}</strong><br/>${t('orderCluster.tooltipOrders')}：<span style="color:#1677ff;font-weight:600">${city.count.toLocaleString()}</span> ${t('orderCluster.unitOrders')}`
          : '';
      },
    },
    grid: { left: 30, right: 30, top: 80, bottom: 30 },
    xAxis: {
      type: 'value',
      min: 100,
      max: 125,
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 20,
      max: 42,
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'cartesian2d',
        data: cityOrderData.map((d) => ({
          value: [d.lng, d.lat, d.count],
          name: d.city,
        })),
        symbolSize: (val: number[]) => Math.max(12, Math.min(60, val[2] / 20)),
        itemStyle: {
          color: {
            type: 'radial',
            x: 0.5,
            y: 0.5,
            r: 0.5,
            colorStops: [
              { offset: 0, color: 'rgba(22, 119, 255, 0.8)' },
              { offset: 1, color: 'rgba(22, 119, 255, 0.2)' },
            ],
          },
          shadowBlur: 10,
          shadowColor: 'rgba(22, 119, 255, 0.3)',
        },
        label: {
          show: true,
          formatter: (params: { name: string }) => params.name,
          position: 'top',
          fontSize: 11,
          color: '#333',
        },
      },
    ],
  };

  // 订单趋势折线图
  const trendOption = {
    title: {
      text: t('orderCluster.monthlyTrend'),
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}<br/>${t('orderCluster.tooltipOrders')}：<span style="color:#1677ff;font-weight:600">${params[0].value.toLocaleString()}</span> ${t('orderCluster.unitOrders')}`,
    },
    grid: { left: 50, right: 20, top: 60, bottom: 30 },
    xAxis: {
      type: 'category',
      data: monthlyTrend.map((d) => d.month),
      axisLabel: { fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        type: 'line',
        data: monthlyTrend.map((d) => d.count),
        smooth: true,
        lineStyle: { color: '#1677ff', width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
              { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
            ],
          },
        },
        itemStyle: { color: '#1677ff' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  };

  // 饼图 - 城市订单占比
  const pieData = cityOrderData.slice(0, 8);
  const pieOption = {
    title: {
      text: t('orderCluster.orderRatio'),
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) =>
        `${params.name}<br/>${t('orderCluster.tooltipOrders')}：<span style="color:#1677ff;font-weight:600">${params.value.toLocaleString()}</span> ${t('orderCluster.unitOrders')}（${params.percent}%）`,
    },
    series: [
      {
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['50%', '55%'],
        data: pieData.map((d) => ({ name: d.city, value: d.count })),
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 11,
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' },
        },
      },
    ],
  };

  return (
    <div className={styles.wrap}>
      {/* 顶部统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }} hoverable>
            <Statistic
              title={t('orderCluster.totalOrders')}
              value={totalOrders}
              prefix={<ShoppingCartOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }} hoverable>
            <Statistic
              title={t('orderCluster.coveredCities')}
              value={cityOrderData.length}
              suffix={t('orderCluster.unitCities')}
              prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }} hoverable>
            <Statistic
              title={t('orderCluster.avgOrders')}
              value={avgOrders}
              prefix={<RiseOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }} hoverable>
            <Statistic
              title={t('orderCluster.hottestCity')}
              value={topCity}
              prefix={<TeamOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16}>
        <Col span={24} style={{ marginBottom: 16 }}>
          <Card style={{ borderRadius: 12 }}>
            <ReactECharts ref={chartRef} option={scatterOption} style={{ height: 460 }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={14}>
          <Card style={{ borderRadius: 12 }}>
            <ReactECharts option={trendOption} style={{ height: 380 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card style={{ borderRadius: 12 }}>
            <ReactECharts option={pieOption} style={{ height: 380 }} />
          </Card>
        </Col>
      </Row>

      {/* 城市订单明细表 */}
      <Card
        title={t('orderCluster.cityDetails')}
        style={{ borderRadius: 12, marginTop: 16 }}
      >
        <Row gutter={[16, 12]}>
          {cityOrderData.map((city) => (
            <Col span={8} key={city.city}>
              <Card size="small" hoverable style={{ borderRadius: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500 }}>{city.city}</span>
                  <Space>
                    <EnvironmentOutlined style={{ color: '#1677ff' }} />
                    <span style={{ color: '#1677ff', fontWeight: 600, fontSize: 16 }}>
                      {city.count.toLocaleString()}
                    </span>
                    <span style={{ color: '#999' }}>{t('orderCluster.unitOrders')}</span>
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default OrderCluster;
