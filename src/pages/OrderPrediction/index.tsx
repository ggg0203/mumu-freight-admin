/**
 * ★★★ 智能订单预测 ★★★
 *
 * 功能：
 * 1. 基于历史数据的趋势预测算法（简单线性回归）
 * 2. 可切换周/月/季度预测周期
 * 3. 折线图展示历史数据 + 预测曲线（虚线）
 * 4. 置信区间带（半透明区域）
 * 5. 顶部统计卡片（当前值、预测值、增长率、准确率）
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Segmented, Statistic, theme } from 'antd';
import {
  RiseOutlined, FallOutlined, ArrowUpOutlined, ArrowDownOutlined,
  LineChartOutlined, RadarChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import styles from './index.module.css';

// ==================== 预测算法 ====================

/** 简单线性回归：根据历史数据预测未来 N 个周期 */
const linearRegression = (
  data: number[],
  predictCount: number,
): { slope: number; intercept: number; predictions: number[] } => {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, predictions: Array(predictCount).fill(data[0] || 0) };

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = data[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const predictions = Array.from({ length: predictCount }, (_, i) => {
    const val = slope * (n + i) + intercept;
    return Math.max(0, Math.round(val));
  });

  return { slope, intercept, predictions };
};

/** 计算预测准确率（基于最近几期数据的拟合程度） */
const calcAccuracy = (data: number[], predictions: number[]): number => {
  if (data.length < 2) return 85;
  // 用前 70% 的数据预测后 30%，看误差
  const splitIdx = Math.floor(data.length * 0.7);
  if (splitIdx < 2) return 85;

  const trainData = data.slice(0, splitIdx);
  const actualData = data.slice(splitIdx);
  const { predictions: testPreds } = linearRegression(trainData, actualData.length);

  if (actualData.length === 0) return 85;

  const errors = actualData.map((actual, i) => {
    const pred = testPreds[i];
    return actual > 0 ? Math.abs(pred - actual) / actual : 0;
  });
  const mape = errors.reduce((s, e) => s + e, 0) / errors.length;
  // 准确率 = (1 - MAPE) * 100
  return Math.max(0, Math.min(100, Math.round((1 - mape) * 100)));
};

// ==================== Mock 数据 ====================

/** 周数据（过去 12 周） */
const WEEKLY_DATA = [1280, 1350, 1420, 1380, 1510, 1480, 1620, 1580, 1750, 1820, 1780, 1950];
const WEEK_LABELS = ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周', '第9周', '第10周', '第11周', '第12周'];

/** 月数据（过去 12 个月） */
const MONTHLY_DATA = [2850, 3120, 2980, 3450, 3680, 3520, 3890, 4120, 3950, 4380, 4650, 4890];
const MONTH_LABELS = ['3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月'];

/** 季度数据（过去 8 个季度） */
const QUARTERLY_DATA = [7820, 8560, 9230, 10150, 11200, 12450, 13580, 14820];
const QUARTER_LABELS = ['23Q1', '23Q2', '23Q3', '23Q4', '24Q1', '24Q2', '24Q3', '24Q4'];

type PeriodType = 'week' | 'month' | 'quarter';

const PERIOD_CONFIG: Record<PeriodType, { data: number[]; labels: string[]; predictCount: number; unit: string }> = {
  week: { data: WEEKLY_DATA, labels: WEEK_LABELS, predictCount: 4, unit: '单' },
  month: { data: MONTHLY_DATA, labels: MONTH_LABELS, predictCount: 3, unit: '单' },
  quarter: { data: QUARTERLY_DATA, labels: QUARTER_LABELS, predictCount: 2, unit: '单' },
};

// ==================== 组件 ====================

const OrderPrediction: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodType>('month');
  const { token } = theme.useToken();
  // 当前周期的中文标签（用于注入翻译变量 {period}）
  const periodLabel = t(`orderPrediction.${period}`);

  // 根据当前周期计算预测数据
  const predictionResult = useMemo(() => {
    const config = PERIOD_CONFIG[period];
    const { predictions } = linearRegression(config.data, config.predictCount);
    const accuracy = calcAccuracy(config.data, predictions);
    const lastValue = config.data[config.data.length - 1];
    const predictedTotal = predictions.reduce((s, v) => s + v, 0);
    const growthRate = lastValue > 0 ? ((predictions[0] - lastValue) / lastValue * 100) : 0;
    return { predictions, accuracy, lastValue, predictedTotal, growthRate };
  }, [period]);

  // ECharts 配置
  const chartOption = useMemo(() => {
    const config = PERIOD_CONFIG[period];
    const isDark = token.colorBgLayout === '#141414';

    // 历史数据 + 预测数据拼接
    const allLabels = [...config.labels, ...config.labels.slice(-1).map(() => t('orderPrediction.predictLabel')).concat(
      Array.from({ length: config.predictCount - 1 }, () => '')
    )];

    // 预测数据：前面填充空值对齐 xLabels（历史区间不显示预测线）
    const padFront = config.data.length;
    const predictSeries = [
      ...Array(padFront).fill(null),
      ...predictionResult.predictions,
    ];

    // 置信区间：历史值无误差，预测值有 ±10% 区间（去掉中间 null 分隔避免多一个数据点撑开右侧）
    const confidenceUpper = [
      ...config.data,
      ...predictionResult.predictions.map(v => Math.round(v * 1.1)),
    ];
    const confidenceLower = [
      ...config.data,
      ...predictionResult.predictions.map(v => Math.round(v * 0.9)),
    ];

    const textColor = isDark ? '#e8e8e8' : '#333';
    const gridColor = isDark ? '#333' : '#e8e8e8';

    // x 轴标签 = 历史标签 + 预测标签
    const xLabels = [...config.labels];
    for (let i = 0; i < config.predictCount; i++) {
      xLabels.push(`${t('orderPrediction.predictLabel')}${i + 1}`);
    }

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? '#444' : '#ddd',
        textStyle: { color: textColor, fontSize: 12 },
        formatter: (params: any[]) => {
          let html = `<div style="font-weight:600;margin-bottom:4px;">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            if (p.value !== null && p.value !== undefined) {
              html += `<div style="display:flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color}"></span>
                ${p.seriesName}: <strong>${p.value.toLocaleString()} ${t('orderPrediction.unitOrders')}</strong>
              </div>`;
            }
          });
          return html;
        },
      },
      legend: {
        data: [t('orderPrediction.history'), t('orderPrediction.prediction'), t('orderPrediction.confidenceInterval')],
        top: 0,
        textStyle: { color: textColor, fontSize: 12 },
      },
      grid: { left: 50, right: 20, top: 40, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: t('orderPrediction.orders'),
        nameTextStyle: { color: textColor, fontSize: 11 },
        axisLine: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: (v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)} ${t('orderPrediction.unitTenThousand')}` : v.toLocaleString(),
        },
        splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      },
      series: [
        {
          name: t('orderPrediction.confidenceInterval'),
          type: 'line',
          data: confidenceUpper,
          lineStyle: { opacity: 0 },
          stack: 'confidence',
          symbol: 'none',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.20)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
              ],
            },
          },
        },
        {
          name: t('orderPrediction.confidenceInterval'),
          type: 'line',
          data: confidenceLower,
          lineStyle: { opacity: 0 },
          stack: 'confidence',
          symbol: 'none',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.20)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
              ],
            },
          },
        },
        {
          name: t('orderPrediction.history'),
          type: 'line',
          data: config.data,
          smooth: true,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 3, color: '#1677ff' },
          itemStyle: { color: '#1677ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.15)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.01)' },
              ],
            },
          },
        },
        {
          name: t('orderPrediction.prediction'),
          type: 'line',
          data: predictSeries,
          smooth: true,
          showSymbol: true,
          symbol: 'diamond',
          symbolSize: 10,
          lineStyle: { width: 3, color: '#ff6b35', type: 'dashed' },
          itemStyle: { color: '#ff6b35' },
        },
      ],
    };
  }, [period, predictionResult, token]);

  const config = PERIOD_CONFIG[period];
  const trendIcon = predictionResult.growthRate >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
  const trendColor = predictionResult.growthRate >= 0 ? '#52c41a' : '#ff4d4f';
  const trendPrefix = predictionResult.growthRate >= 0 ? <RiseOutlined /> : <FallOutlined />;

  return (
    <div className={styles.container}>
      {/* 顶部描述 */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <LineChartOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
            {t('orderPrediction.title')}
          </h2>
          <p className={styles.description}>
            {t('orderPrediction.desc')}
          </p>
        </div>
        <Segmented
          value={period}
          onChange={(val) => setPeriod(val as PeriodType)}
          options={[
            { value: 'week', label: <span><RadarChartOutlined /> {t('orderPrediction.week')}</span> },
            { value: 'month', label: <span><LineChartOutlined /> {t('orderPrediction.month')}</span> },
            { value: 'quarter', label: <span><LineChartOutlined /> {t('orderPrediction.quarter')}</span> },
          ]}
        />
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col span={8}>
          <Card className={styles.statCard} hoverable>
            <Statistic
              title={t('orderPrediction.lastPeriodOrders', { period: periodLabel })}
              value={predictionResult.lastValue}
              suffix={t('orderPrediction.unitOrders')}
              valueStyle={{ color: '#1677ff', fontSize: 28 }}
            />
            <div className={styles.statSub}>
              {t('orderPrediction.currentPeriodData')}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className={styles.statCard} hoverable>
            <Statistic
              title={t('orderPrediction.predictedPeriodOrders', { period: periodLabel })}
              value={predictionResult.predictions[0]}
              suffix={t('orderPrediction.unitOrders')}
              valueStyle={{ color: '#ff6b35', fontSize: 28 }}
            />
            <div className={styles.statSub}>
              {t('orderPrediction.predictGrowth')}{' '}
              <span style={{ color: trendColor, fontWeight: 600 }}>
                {trendIcon} {Math.abs(predictionResult.growthRate).toFixed(1)}%
              </span>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className={styles.statCard} hoverable>
            <Statistic
              title={t('orderPrediction.predictionAccuracy')}
              value={predictionResult.accuracy}
              suffix={t('orderPrediction.unitPercent')}
              prefix={trendPrefix}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
            />
            <div className={styles.statSub}>
              {t('orderPrediction.accuracyLabel')}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表 */}
      <Card className={styles.chartCard}>
        <ReactECharts option={chartOption} style={{ height: 420 }} />
      </Card>

      {/* 算法说明 */}
      <Card className={styles.algorithmCard} title={t('orderPrediction.algorithmDescription')}>
        <Row gutter={[24, 16]}>
          <Col span={6}>
            <div className={styles.algItem}>
              <div className={styles.algIcon}>📊</div>
              <div className={styles.algTitle}>{t('orderPrediction.linearRegression')}</div>
              <div className={styles.algDesc}>
                {t('orderPrediction.linearRegressionDesc')}
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div className={styles.algItem}>
              <div className={styles.algIcon}>🎯</div>
              <div className={styles.algTitle}>{t('orderPrediction.confidenceInterval')}</div>
              <div className={styles.algDesc}>
                {t('orderPrediction.confidenceDesc')}
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div className={styles.algItem}>
              <div className={styles.algIcon}>🔄</div>
              <div className={styles.algTitle}>{t('orderPrediction.multiPeriodSwitch')}</div>
              <div className={styles.algDesc}>
                {t('orderPrediction.multiPeriodSwitchDesc')}
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div className={styles.algItem}>
              <div className={styles.algIcon}>📈</div>
              <div className={styles.algTitle}>{t('orderPrediction.autoEvaluation')}</div>
              <div className={styles.algDesc}>
                {t('orderPrediction.autoEvaluationDesc')}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default OrderPrediction;
