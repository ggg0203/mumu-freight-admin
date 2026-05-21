/**
 * ★★★ 工作台 Dashboard ★★★
 *
 * 根据课程截图实现：
 * 1. 用户信息卡片（头像/ID/邮箱/手机/岗位/状态/部门）
 * 2. 统计数字（司机数量/总流水/总订单/开通城市）
 * 3. 订单和流水走势折线图（ECharts）
 * 4. 司机分布（城市饼图 + 年龄环形图）
 * 5. 刷新按钮
 * 6. AI 数据洞察（基于百炼 qwen3.6-plus 智能分析）
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Row, Col, Button, Avatar, Divider, Modal, Spin, theme, Tag, Space } from 'antd';
import { ReloadOutlined, UserOutlined, ThunderboltOutlined, RobotOutlined, BulbOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/userStore';
import ReactECharts from 'echarts-for-react';
import { dashboardApi } from '@/api';
import type { DashboardStats } from '@/types/api';
import { generateDashboardInsight } from './aiInsight';
import { useRealtime } from '@/hooks/useRealtime';
import styles from './index.module.css';

// ==================== ECharts 配置（数据从 shared-data 计算）====================

const getTrendOption = (t: (key: string) => string, stats: DashboardStats) => ({
  tooltip: { trigger: 'axis' },
  legend: { data: [t('dashboard.orders'), t('dashboard.revenue')], top: 10 },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    data: stats.trendMonths,
    boundaryGap: false,
    axisLabel: { color: '#888' },
  },
  series: [
    {
      name: t('dashboard.orders'),
      type: 'line',
      smooth: true,
      data: stats.orderTrend,
      itemStyle: { color: '#1677ff' },
      lineStyle: { color: '#1677ff', width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(22,119,255,0.25)' },
            { offset: 1, color: 'rgba(22,119,255,0.02)' },
          ],
        },
      },
      symbol: 'circle',
      symbolSize: 6,
    },
    {
      name: t('dashboard.revenue'),
      type: 'line',
      smooth: true,
      data: stats.revenueTrend,
      itemStyle: { color: '#52c41a' },
      lineStyle: { color: '#52c41a', width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(82,196,26,0.25)' },
            { offset: 1, color: 'rgba(82,196,26,0.02)' },
          ],
        },
      },
      symbol: 'circle',
      symbolSize: 6,
      yAxisIndex: 1,
    },
  ],
  yAxis: [
    { type: 'value', name: t('dashboard.orders'), axisLabel: { color: '#888' } },
    { type: 'value', name: '营收(万元)', axisLabel: { color: '#888' } },
  ],
});

const getPieOption = (t: (key: string) => string, cityDistrib: { name: string; value: number }[]) => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
  legend: {
    orient: 'vertical',
    left: 'left',
    data: cityDistrib.map((d) => d.name),
    textStyle: { fontSize: 12 },
  },
  series: [
    {
      name: t('dashboard.driverCityDist'),
      type: 'pie',
      radius: '55%',
      center: ['55%', '55%'],
      data: cityDistrib,
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
        label: { fontSize: 13, fontWeight: 'bold' },
      },
    },
  ],
  title: { text: t('dashboard.driverCityDist'), left: 'center', top: 0, textStyle: { fontSize: 15 } },
});

const getDonutOption = (t: (key: string) => string, ageDistrib: { name: string; value: number }[]) => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
  legend: {
    orient: 'vertical',
    left: 'left',
    data: ageDistrib.map((d) => d.name),
    textStyle: { fontSize: 12 },
  },
  series: [
    {
      name: t('dashboard.driverAgeDist'),
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['55%', '55%'],
      data: ageDistrib,
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
        label: { fontSize: 13, fontWeight: 'bold' },
      },
    },
  ],
  title: { text: t('dashboard.driverAgeDist'), left: 'center', top: 0, textStyle: { fontSize: 15 } },
});

// ==================== 组件 ====================

const Dashboard: React.FC = () => {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const lastRefreshRef = useRef(0); // 节流

  // ★★★ 实时事件推送：静默刷新数据（最多 5 秒一次）★★★
  const { latestEvent } = useRealtime();
  const userInfo = useUserStore((s) => s.userInfo);

  useEffect(() => {
    if (!latestEvent) return;
    const now = Date.now();
    if (now - lastRefreshRef.current > 5000) {
      lastRefreshRef.current = now;
      setRefreshKey(k => k + 1);
    }
  }, [latestEvent]);

  // ★★★ AI 洞察状态 ★★★
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiError, setAiError] = useState('');

  // 从 API 获取 Dashboard 统计
  const [stats, setStats] = useState<DashboardStats>({
    driverCount: 0,
    totalRevenue: 0,
    totalOrders: 0,
    coveredCities: 0,
    revenueTrend: [],
    orderTrend: [],
    trendMonths: [],
    cityDistribution: [],
    ageDistribution: [],
  });

  useEffect(() => {
    dashboardApi.getStats().then((res) => {
      const apiStats = res.data;
      setStats({
        driverCount: apiStats.activeDrivers,
        totalRevenue: apiStats.monthlyRevenue,
        totalOrders: apiStats.totalOrders,
        coveredCities: 24,
        revenueTrend: apiStats.revenueTrend?.map((r: any) => r.amount / 10000) || [],
        orderTrend: apiStats.orderTrend?.map((r: any) => r.count) || [],
        trendMonths: apiStats.revenueTrend?.map((r: any) => r.date.slice(-2) + '月') || [],
        // ★★★ 模拟司机城市分布数据 ★★★
        cityDistribution: [
          { name: '北京', value: 126 },
          { name: '上海', value: 98 },
          { name: '广州', value: 87 },
          { name: '深圳', value: 76 },
          { name: '成都', value: 65 },
          { name: '杭州', value: 54 },
          { name: '武汉', value: 43 },
        ],
        // ★★★ 模拟司机年龄分布数据 ★★★
        ageDistribution: [
          { name: '20-25岁', value: 88 },
          { name: '26-30岁', value: 162 },
          { name: '31-35岁', value: 135 },
          { name: '36-40岁', value: 82 },
          { name: '40岁以上', value: 45 },
        ],
      });
    });
  }, [refreshKey]);

  const formatNumber = (n: number) => n.toLocaleString();

  /** 生成 AI 洞察 */
  const handleAIInsight = useCallback(async () => {
    setAiLoading(true);
    setAiContent('');
    setAiError('');
    const result = await generateDashboardInsight();
    if (result.success) {
      setAiContent(result.content);
    } else {
      setAiError(result.error || '未知错误');
    }
    setAiLoading(false);
  }, []);

  /** 打开 AI 洞察弹窗（自动触发分析） */
  const openAIInsight = useCallback(() => {
    setAiModalOpen(true);
    // 延迟一点触发分析，让弹窗先弹出
    setTimeout(() => handleAIInsight(), 300);
  }, [handleAIInsight]);

  // 渲染 AI 分析内容（支持简单 Markdown）
  const renderAIContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // 标题
      if (line.startsWith('## ')) {
        return <h3 key={i} style={{ margin: '16px 0 8px', fontSize: 16, fontWeight: 600 }}>{line.replace('## ', '')}</h3>;
      }
      // 空行
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
      // 列表项
      if (line.startsWith('- ')) {
        return <div key={i} style={{ paddingLeft: 16, marginBottom: 4, color: '#555', lineHeight: 1.8 }}>• {line.replace('- ', '')}</div>;
      }
      if (/^\d+\.\s/.test(line)) {
        return <div key={i} style={{ paddingLeft: 16, marginBottom: 4, color: '#555', lineHeight: 1.8 }}>{line}</div>;
      }
      // 普通文本（加粗等)
      return <div key={i} style={{ marginBottom: 4, color: '#333', lineHeight: 1.8 }}>{line}</div>;
    });
  };

  return (
    <div className={styles.dashboard}>
      {/* ★★★ 用户信息卡片 ★★★ */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div className={styles.welcome}>{t('dashboard.welcomeMessage')}</div>
        <div className={styles.userInfo}>
          <div className={styles.avatarWrap}>
            <Avatar size={80} src={userInfo?.avatar || undefined} icon={<UserOutlined />} />
          </div>
          <div className={styles.infoGrid}>
            <div>{t('dashboard.userId')}{userInfo?.nickname || userInfo?.username || '-'}</div>
            <div>{t('dashboard.userEmail')}{userInfo?.email || '-'}</div>
            <div>{t('dashboard.userStatus')}{userInfo?.status === 1 ? (t('userList.statusActive') || '在职') : (t('userList.statusInactive') || '离职')}</div>
            <div>{t('dashboard.userPhone')}{userInfo?.phone || '-'}</div>
            <div>{t('dashboard.position')}{userInfo?.role || '-'}</div>
            <div>{t('dashboard.department')}{userInfo?.role || '-'}</div>
          </div>
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <Row gutter={[0, 0]}>
          <Col span={6} style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ color: '#888', fontSize: 13 }}>{t('dashboard.driverCount')}</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: token.colorText, marginTop: 4 }}>{formatNumber(stats.driverCount)}</div>
          </Col>
          <Col span={6} style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ color: '#888', fontSize: 13 }}>{t('dashboard.totalRevenueLabel')}</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: token.colorText, marginTop: 4 }}>¥{formatNumber(Math.round(stats.totalRevenue))}</div>
          </Col>
          <Col span={6} style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ color: '#888', fontSize: 13 }}>{t('dashboard.totalOrdersLabel')}</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: token.colorText, marginTop: 4 }}>{formatNumber(stats.totalOrders)}</div>
          </Col>
          <Col span={6} style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ color: '#888', fontSize: 13 }}>{t('dashboard.coveredCitiesLabel')}</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: token.colorText, marginTop: 4 }}>{formatNumber(stats.coveredCities)}</div>
          </Col>
        </Row>
      </Card>

      {/* ★★★ AI 数据洞察入口 ★★★ */}
      <Card
        style={{
          borderRadius: 12, marginBottom: 16,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          cursor: 'pointer',
        }}
        styles={{ body: { padding: '20px 24px' } }}
        onClick={openAIInsight}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space align="center">
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                <RobotOutlined style={{ color: '#fff' }} />
              </div>
              <div style={{ marginLeft: 12 }}>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>AI 数据洞察</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
                  一键分析经营数据，智能发现趋势与建议
                </div>
              </div>
            </Space>
          </Col>
          <Col>
            <Tag color="rgba(255,255,255,0.3)" style={{
              borderRadius: 20, padding: '2px 16px',
              color: '#fff', fontSize: 13,
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              <BulbOutlined style={{ marginRight: 4 }} />查看分析
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* ★★★ 订单和流水走势图 ★★★ */}
      <Card
        title={t('dashboard.orderTrend')}
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{ background: token.colorPrimary }}
          >
            {t('dashboard.refresh')}
          </Button>
        }
        style={{ borderRadius: 12, marginBottom: 16 }}
      >
        <ReactECharts
          key={`trend-${refreshKey}`}
          option={getTrendOption(t, stats)}
          style={{ height: 360 }}
          notMerge
        />
      </Card>

      {/* ★★★ 司机分布（城市饼图 + 年龄环形图）★★★ */}
      <Card
        title={t('dashboard.driverDist')}
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{ background: token.colorPrimary }}
          >
            {t('dashboard.refresh')}
          </Button>
        }
        style={{ borderRadius: 12, marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <ReactECharts key={`pie-${refreshKey}`} option={getPieOption(t, stats.cityDistribution)} style={{ height: 360 }} notMerge />
          </Col>
          <Col span={12}>
            <ReactECharts key={`donut-${refreshKey}`} option={getDonutOption(t, stats.ageDistribution)} style={{ height: 360 }} notMerge />
          </Col>
        </Row>
      </Card>

      {/* ★★★ AI 数据洞察弹窗 ★★★ */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#667eea' }} />
            <span>AI 数据洞察</span>
          </Space>
        }
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        footer={null}
        width={680}
        destroyOnHidden
      >
        {/* 加载状态 */}
        {aiLoading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#888' }}>
              <RobotOutlined style={{ marginRight: 6 }} />
              正在分析经营数据...
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>
              基于百炼 qwen3.6-plus 实时分析
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {!aiLoading && aiError && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😅</div>
            <div style={{ color: '#ff4d4f', marginBottom: 8, whiteSpace: 'pre-line' }}>{aiError}</div>
            <Button type="primary" onClick={handleAIInsight} ghost style={{ marginTop: 8 }}>
              重新分析
            </Button>
          </div>
        )}

        {/* 分析结果 */}
        {!aiLoading && !aiError && aiContent && (
          <div style={{ padding: '8px 4px' }}>
            <div style={{
              background: '#f6f8fc', borderRadius: 8, padding: '12px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: '#666',
            }}>
              <BulbOutlined style={{ color: '#faad14' }} />
              基于 Dashboard 当前真实数据分析生成
            </div>
            <div>{renderAIContent(aiContent)}</div>
            <Divider style={{ margin: '16px 0 12px' }} />
            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleAIInsight}
                loading={aiLoading}
              >
                重新分析
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
