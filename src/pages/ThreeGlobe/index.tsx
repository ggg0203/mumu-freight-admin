/**
 * ★★★ 3D 全国货运网络页面 ★★★
 *
 * 展示 3D 地球上的全国货运网络：
 * - 3D 地球（NASA 纹理 + 大气效果）
 * - 城市发光标记（带脉冲动画）
 * - 飞行路线弧线 + 粒子流光
 * - 点击城市查看详情
 * - 缩放滑块控制（替代鼠标滚轮）
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Statistic, Tag, Table, Slider, Button, Tooltip } from 'antd';
import {
  RiseOutlined, EnvironmentOutlined, CarOutlined, DollarOutlined,
  ShoppingCartOutlined, ArrowUpOutlined, ZoomInOutlined, ZoomOutOutlined,
} from '@ant-design/icons';
import Globe3D from '@/components/Globe3D';
import type { Globe3DRef } from '@/components/Globe3D';
import { cityData, type CityInfo } from '@/data/cityData';
import styles from './index.module.css';

const ALT_MIN = 0.5;
const ALT_MAX = 8;
const ALT_DEFAULT = 2.5;

const ThreeGlobe: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCity, setSelectedCity] = useState<CityInfo | null>(null);
  const [zoomAlt, setZoomAlt] = useState(ALT_DEFAULT);
  const globeRef = useRef<Globe3DRef>(null);

  // 统计汇总
  const totalOrders = cityData.reduce((sum, c) => sum + c.orderCount, 0);
  const totalRevenue = cityData.reduce((sum, c) => sum + c.revenue, 0);
  const totalDrivers = cityData.reduce((sum, c) => sum + c.driverCount, 0);
  const avgGrowth = cityData.length > 0 ? cityData.reduce((sum, c) => sum + c.growth, 0) / cityData.length : 0;
  const topCity = cityData.length > 0 ? [...cityData].sort((a, b) => b.orderCount - a.orderCount)[0] : null;

  // 城市点击
  const handleCityClick = useCallback((city: CityInfo) => {
    setSelectedCity(city);
  }, []);

  // ==================== 缩放控制 ====================

  const handleZoomIn = () => {
    globeRef.current?.zoomIn();
    // 同步滑块状态
    const newAlt = globeRef.current?.getAltitude() ?? zoomAlt;
    setZoomAlt(newAlt);
  };

  const handleZoomOut = () => {
    globeRef.current?.zoomOut();
    const newAlt = globeRef.current?.getAltitude() ?? zoomAlt;
    setZoomAlt(newAlt);
  };

  const handleSliderChange = (value: number) => {
    setZoomAlt(value);
    globeRef.current?.setZoom(value);
  };

  // ==================== Top 城市排行表格 ====================

  const rankColumns = [
    {
      title: t('threeGlobe.rank'),
      key: 'rank',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => (
        <span className={styles.rank}>
          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
        </span>
      ),
    },
    { title: t('threeGlobe.city'), dataIndex: 'name', key: 'name', width: 80 },
    {
      title: t('threeGlobe.orderCount'),
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      sorter: (a: CityInfo, b: CityInfo) => a.orderCount - b.orderCount,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: t('threeGlobe.revenue'),
      dataIndex: 'revenue',
      key: 'revenue',
      width: 100,
      sorter: (a: CityInfo, b: CityInfo) => a.revenue - b.revenue,
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    {
      title: t('threeGlobe.drivers'),
      dataIndex: 'driverCount',
      key: 'driverCount',
      width: 70,
    },
    {
      title: t('threeGlobe.growth'),
      dataIndex: 'growth',
      key: 'growth',
      width: 80,
      render: (v: number) => (
        <span style={{ color: v > 8 ? '#52c41a' : '#faad14' }}>
          <ArrowUpOutlined /> {v}%
        </span>
      ),
    },
    {
      title: t('threeGlobe.hotCargo'),
      dataIndex: 'topGoods',
      key: 'topGoods',
      width: 90,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
  ];

  return (
    <div className={styles.container}>
      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col span={6}>
          <Card className={styles.statCard} hoverable>
            <Statistic
              title={t('threeGlobe.totalOrders')}
              value={totalOrders}
              prefix={<ShoppingCartOutlined style={{ color: '#1677ff' }} />}
              suffix={t('threeGlobe.unitOrders')}
              valueStyle={{ color: '#1677ff', fontSize: 28 }}
            />
            <div className={styles.statSub}>{t('threeGlobe.coveringRoutes', { count: cityData.length })}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.statCard} hoverable>
            <Statistic
              title={t('threeGlobe.totalRevenue')}
              value={totalRevenue}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              suffix={t('threeGlobe.unitTenThousand')}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
            />
            <div className={styles.statSub}>{t('threeGlobe.coveringRoutes', { growth: avgGrowth.toFixed(1) })}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.statCard} hoverable>
            <Statistic
              title={t('threeGlobe.activeDrivers')}
              value={totalDrivers}
              prefix={<CarOutlined style={{ color: '#faad14' }} />}
              suffix={t('threeGlobe.unitPeople')}
              valueStyle={{ color: '#faad14', fontSize: 28 }}
            />
            <div className={styles.statSub}>{t('threeGlobe.coveringRoutes')}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className={styles.statCard} hoverable>
            <Statistic
              title={t('threeGlobe.hottestCity')}
              value={topCity?.name ?? '-'}
              prefix={<EnvironmentOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 500 }}
            />
            <div className={styles.statSub}>
              {topCity ? t('threeGlobe.hottestCity', { count: topCity.orderCount.toLocaleString(), growth: topCity.growth }) : '-'}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主体区域：3D 地球 + 城市详情 */}
      <Row gutter={[16, 16]} style={{ flex: 1 }}>
        <Col span={16}>
          <div className={styles.globeWrapper}>
            <Card
              className={styles.globeCard}
              bodyStyle={{ padding: 0, height: '100%' }}
            >
              <Globe3D ref={globeRef} onCityClick={handleCityClick} />
            </Card>

            {/* 缩放控制面板（替代鼠标滚轮） */}
            <div className={styles.zoomPanel}>
              <Tooltip title={t('threeGlobe.zoomIn')}>
                <Button
                  className={styles.zoomBtn}
                  icon={<ZoomInOutlined />}
                  onClick={handleZoomIn}
                  size="small"
                />
              </Tooltip>
              <div className={styles.sliderWrapper}>
                <Slider
                  className={styles.zoomSlider}
                  vertical
                  min={ALT_MIN}
                  max={ALT_MAX}
                  step={0.05}
                  value={zoomAlt}
                  onChange={handleSliderChange}
                  tooltip={{ formatter: (v) => `${t('threeGlobe.zoom')} ${v?.toFixed(1)}x` }}
                />
              </div>
              <Tooltip title={t('threeGlobe.zoomOut')}>
                <Button
                  className={styles.zoomBtn}
                  icon={<ZoomOutOutlined />}
                  onClick={handleZoomOut}
                  size="small"
                />
              </Tooltip>
              <div className={styles.zoomLabel}>{zoomAlt.toFixed(1)}x</div>
            </div>
          </div>
        </Col>
        <Col span={8}>
          <Card
            title={
              selectedCity
                ? `${selectedCity.name} · ${t('threeGlobe.cityDetails')}`
                : t('threeGlobe.cityRanking')
            }
            className={styles.detailCard}
            extra={
              selectedCity ? (
                <Tag
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedCity(null)}
                >
                  {t('threeGlobe.backToRanking')}
                </Tag>
              ) : null
            }
          >
            {selectedCity ? (
              <div className={styles.cityDetail}>
                <div className={styles.cityHeader}>
                  <EnvironmentOutlined style={{ fontSize: 28, color: '#1677ff' }} />
                  <span className={styles.cityName}>{selectedCity.name}</span>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>{t('threeGlobe.orderCount')}</span>
                    <span className={styles.detailValue}>
                      {selectedCity.orderCount.toLocaleString()} {t('threeGlobe.unitOrders')}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>{t('threeGlobe.revenueLabel')}</span>
                    <span className={styles.detailValue}>
                      ¥{selectedCity.revenue.toLocaleString()} {t('threeGlobe.unitTenThousand')}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>{t('threeGlobe.driversLabel')}</span>
                    <span className={styles.detailValue}>
                      {selectedCity.driverCount} {t('threeGlobe.unitPeople')}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>{t('threeGlobe.growthLabel')}</span>
                    <span
                      className={styles.detailValue}
                      style={{ color: selectedCity.growth > 8 ? '#52c41a' : '#faad14' }}
                    >
                      <RiseOutlined /> {selectedCity.growth}%
                    </span>
                  </div>
                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>{t('threeGlobe.hotCargoLabel')}</span>
                    <Tag color="blue">{selectedCity.topGoods}</Tag>
                  </div>
                </div>

                <div className={styles.relatedTitle}>{t('threeGlobe.routesLabel')}</div>
                <div className={styles.routeList}>
                  {cityData
                    .filter((c) => c.id !== selectedCity.id && Math.random() > 0.6)
                    .slice(0, 4)
                    .map((c) => (
                      <div key={c.id} className={styles.routeItem}>
                        <span className={styles.routeCities}>
                          {selectedCity.name}
                          <ArrowUpOutlined
                            style={{ fontSize: 12, margin: '0 8px', color: '#1677ff' }}
                          />
                          {c.name}
                        </span>
                        <Tag color="green">{c.topGoods}</Tag>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <Table
                dataSource={[...cityData].sort((a, b) => b.orderCount - a.orderCount)}
                columns={rankColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ y: 420 }}
                onRow={(record) => ({
                  onClick: () => setSelectedCity(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ThreeGlobe;
