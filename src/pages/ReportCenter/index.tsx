/**
 * ★★★ 智能报表中心 ★★★
 *
 * 功能：
 * 1. 选择报表类型和时间范围
 * 2. 预览报表（含 ECharts 图表截图）
 * 3. 导出 PDF（含图表）
 * 4. 导出 Excel
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Row, Col, Button, DatePicker, Select, Space, Statistic,
  Table, message, Tag, Divider, Spin, Drawer, Input, Avatar, Tooltip,
} from 'antd';
import {
  FilePdfOutlined, FileExcelOutlined, ReloadOutlined,
  BarChartOutlined, PieChartOutlined, LineChartOutlined,
  ThunderboltOutlined, RobotOutlined, SendOutlined, CloseOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { askReportQuestion, getQuickQuestions } from './aiReportChat';
import { generateReportSummary } from './aiReportSummary';
import type { ChatMsg, ReportContext } from './aiReportChat';
import type { ReportSummaryContext } from './aiReportSummary';
import styles from './index.module.css';

const { RangePicker } = DatePicker;

// ==================== Mock 数据 ====================

const generateOrderData = () => {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  return {
    months,
    orders: months.map(() => Math.floor(Math.random() * 500 + 200)),
    revenue: months.map(() => Math.floor(Math.random() * 50000 + 10000)),
  };
};

const generateCityRank = () => [
  { city: '北京', orders: 1250, revenue: 485000, drivers: 86 },
  { city: '上海', orders: 1180, revenue: 452000, drivers: 78 },
  { city: '深圳', orders: 980, revenue: 386000, drivers: 65 },
  { city: '广州', orders: 920, revenue: 358000, drivers: 62 },
  { city: '杭州', orders: 650, revenue: 256000, drivers: 45 },
  { city: '成都', orders: 580, revenue: 228000, drivers: 40 },
  { city: '武汉', orders: 520, revenue: 205000, drivers: 36 },
  { city: '南京', orders: 480, revenue: 189000, drivers: 32 },
];

const generateCargoType = () => [
  { type: '日用百货', ratio: 30, amount: 450000 },
  { type: '电子产品', ratio: 22, amount: 330000 },
  { type: '食品生鲜', ratio: 18, amount: 270000 },
  { type: '建材家居', ratio: 15, amount: 225000 },
  { type: '医疗器械', ratio: 10, amount: 150000 },
  { type: '其他', ratio: 5, amount: 75000 },
];

type ReportType = 'operations' | 'finance' | 'drivers';

// ==================== 主组件 ====================

const ReportCenter: React.FC = () => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType>('operations');

  const reportTypeOptions = [
    { value: 'operations' as ReportType, label: t('report.type_operations'), icon: <LineChartOutlined /> },
    { value: 'finance' as ReportType, label: t('report.type_finance'), icon: <BarChartOutlined /> },
    { value: 'drivers' as ReportType, label: t('report.type_drivers'), icon: <PieChartOutlined /> },
  ];

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // ★★★ AI 对话状态 ★★★
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiListRef = useRef<HTMLDivElement>(null);

  // ★★★ AI 摘要状态 ★★★
  const [summaryContent, setSummaryContent] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // 自动滚动
  useEffect(() => {
    if (aiListRef.current) {
      aiListRef.current.scrollTop = aiListRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // 生成报表
  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      setReportData({
        orderData: generateOrderData(),
        cityRank: generateCityRank(),
        cargoType: generateCargoType(),
        generatedAt: new Date().toLocaleString('zh-CN'),
        reportType,
      });
      setGenerating(false);
      message.success(t('report.generationComplete'));
    }, 800);
  }, [reportType]);

  // ★★★ 构建摘要上下文并调用 AI ★★★
  const handleGenerateSummary = useCallback(async () => {
    if (!reportData) return;
    setSummaryLoading(true);
    setSummaryContent('');

    const ctx: ReportSummaryContext = {
      reportType: reportTypeOptions.find(o => o.value === reportType)?.label || reportType,
      totalOrders: reportData.cityRank.reduce((s: number, c: any) => s + c.orders, 0),
      totalRevenue: reportData.cityRank.reduce((s: number, c: any) => s + c.revenue, 0),
      activeDrivers: reportData.cityRank.reduce((s: number, c: any) => s + c.drivers, 0),
      coveredCities: reportData.cityRank.length,
      topCities: reportData.cityRank.map((c: any) => ({ name: c.city, value: c.orders })),
      monthTrend: { months: reportData.orderData.months, orders: reportData.orderData.orders },
      cargoDistribution: reportData.cargoType.map((c: any) => ({ type: c.type, ratio: c.ratio })),
      generatedAt: reportData.generatedAt,
    };

    const result = await generateReportSummary(ctx);
    if (result.success) {
      setSummaryContent(result.content);
    } else {
      setSummaryContent('');
      message.error(result.error || '生成失败');
    }
    setSummaryLoading(false);
  }, [reportData, reportType]);

  // 导出 PDF
  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    message.loading({ content: t('report.generatingPdf'), key: 'pdf' });

    try {
      // 截图报表区域
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`幕幕货运报表_${Date.now()}.pdf`);
      message.success({ content: t('report.pdfSuccess'), key: 'pdf' });
    } catch (err) {
      message.error({ content: t('report.pdfFailed') + (err as Error).message, key: 'pdf' });
    }
  }, []);

  // 导出 Excel
  const handleExportExcel = useCallback(() => {
    if (!reportData) return;
    message.loading({ content: t('report.generatingExcel'), key: 'xlsx' });

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: 城市排名
      const ws1 = XLSX.utils.json_to_sheet(reportData.cityRank.map((r: any) => ({
        [t('report.city')]: r.city,
        [t('report.orderCount')]: r.orders,
        [t('report.revenueYuan')]: r.revenue,
        [t('report.driverCount')]: r.drivers,
      })));
      XLSX.utils.book_append_sheet(wb, ws1, t('report.cityRanking'));

      // Sheet 2: 货物类型
      const ws2 = XLSX.utils.json_to_sheet(reportData.cargoType.map((c: any) => ({
        [t('report.cargoRatio')]: c.type,
        [t('report.ratio')]: c.ratio,
        [t('report.amountYuan')]: c.amount,
      })));
      XLSX.utils.book_append_sheet(wb, ws2, t('report.cargoRatio'));

      // Sheet 3: 月度趋势
      const ws3 = XLSX.utils.json_to_sheet(
        reportData.orderData.months.map((m: string, i: number) => ({
          [t('report.month')]: m,
          '订单数': reportData.orderData.orders[i],
          '营收(元)': reportData.orderData.revenue[i],
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws3, t('report.monthlyTrend'));

      XLSX.writeFile(wb, `幕幕货运报表_${Date.now()}.xlsx`);
      message.success({ content: t('report.excelSuccess'), key: 'xlsx' });
    } catch (err) {
      message.error({ content: t('report.excelFailed') + (err as Error).message, key: 'xlsx' });
    }
  }, [reportData]);

  // ★★★ 构建报表上下文供 AI 使用 ★★★
  const buildReportContext = useCallback((): ReportContext | null => {
    if (!reportData) return null;
    const { cityRank, cargoType, orderData } = reportData;
    return {
      reportType: reportTypeOptions.find(o => o.value === reportType)?.label || reportType,
      totalOrders: cityRank.reduce((s: number, c: any) => s + c.orders, 0),
      totalRevenue: cityRank.reduce((s: number, c: any) => s + c.revenue, 0),
      activeDrivers: cityRank.reduce((s: number, c: any) => s + c.drivers, 0),
      coveredCities: cityRank.length,
      topCity: cityRank[0]?.city || '',
      topCityOrders: cityRank[0]?.orders || 0,
      monthTrend: { months: orderData.months, orders: orderData.orders, revenue: orderData.revenue },
      cityRank,
      cargoType,
      generatedAt: reportData.generatedAt,
    };
  }, [reportData, reportType]);

  // ★★★ 发送 AI 对话消息 ★★★
  const handleAISend = useCallback(async (text?: string) => {
    const msg = (text || aiInput).trim();
    if (!msg || aiLoading) return;

    const ctx = buildReportContext();
    if (!ctx) {
      message.warning('请先生成报表');
      return;
    }

    const userMsg: ChatMsg = { role: 'user', text: msg };
    setAiMessages(prev => [...prev, userMsg]);
    if (!text) setAiInput('');
    setAiLoading(true);

    const result = await askReportQuestion(msg, ctx, aiMessages);
    const aiMsg: ChatMsg = {
      role: 'ai',
      text: result.success ? result.text : (result.error || '服务异常'),
    };
    setAiMessages(prev => [...prev, aiMsg]);
    setAiLoading(false);
  }, [aiInput, aiLoading, aiMessages, buildReportContext]);

  // ★★★ 打开 AI 对话（首次自动问候） ★★★
  const openAIDrawer = useCallback(() => {
    setAiDrawerOpen(true);
    if (aiMessages.length === 0) {
      setAiMessages([
        {
          role: 'ai',
          text: '你好！我是 **幕幕货运报表 AI 分析师** 🤖\n\n根据当前报表数据，你可以问我：\n• "总结一下运营情况"\n• "哪个城市订单最多？"\n• "营收趋势怎么样？"\n• "建议在哪个城市增加运力？"',
        },
      ]);
    }
  }, [aiMessages.length]);

  // 渲染 AI 消息
  const renderAIText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} style={{ fontWeight: 600, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>;
      }
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <div key={i} style={{ paddingLeft: 12, marginBottom: 2, color: '#555', lineHeight: 1.7 }}>• {line.replace(/^[-•]\s*/, '')}</div>;
      }
      return <div key={i} style={{ marginBottom: 2, lineHeight: 1.7 }}>{line}</div>;
    });
  };

  // ECharts 配置
  const trendOption = reportData ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['订单量', '营收'], top: 5 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: reportData.orderData.months },
    series: [
      {
        name: t('report.orderCount'),
        type: 'line',
        data: reportData.orderData.orders,
        smooth: true,
        itemStyle: { color: '#5470c6' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(84,112,198,0.3)' }, { offset: 1, color: 'rgba(84,112,198,0.02)' }] } },
      },
      {
        name: t('report.totalRevenue'),
        type: 'line',
        yAxisIndex: 1,
        data: reportData.orderData.revenue.map((v: number) => Math.round(v / 1000)),
        itemStyle: { color: '#91cc75' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(145,204,117,0.3)' }, { offset: 1, color: 'rgba(145,204,117,0.02)' }] } },
      },
    ],
    yAxis: [
      { type: 'value', name: t('report.orderCount') },
      { type: 'value', name: t('report.revenueYuan') },
    ],
  } : null;

  const cityOption = reportData ? {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: reportData.cityRank.map((c: any) => c.city) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: reportData.cityRank.map((c: any, i: number) => ({
        value: c.orders,
        itemStyle: { color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'][i] },
      })),
      barWidth: 20,
    }],
  } : null;

  const cargoOption = reportData ? {
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    series: [{
      type: 'pie',
      radius: ['30%', '55%'],
      data: reportData.cargoType.map((c: any, i: number) => ({
        value: c.ratio,
        name: c.type,
        itemStyle: { color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'][i] },
      })),
      label: { formatter: '{b}\n{d}%' },
    }],
  } : null;

  const tableColumns = [
    { title: t('report.city'), dataIndex: 'city', key: 'city' },
    { title: t('report.orderCount'), dataIndex: 'orders', key: 'orders', sorter: (a: any, b: any) => a.orders - b.orders },
    { title: t('report.revenueYuan'), dataIndex: 'revenue', key: 'revenue', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: t('report.driverCount'), dataIndex: 'drivers', key: 'drivers' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2><ThunderboltOutlined style={{ marginRight: 8 }} />{t('report.title')}</h2>
        <p className={styles.subtitle}>{t('report.desc')}</p>
      </div>

      {/* 控制区 */}
      <Card className={styles.controlCard}>
        <Row gutter={16} align="middle">
          <Col>
            <label className={styles.label}>{t('report.type')}</label>
            <Select value={reportType} onChange={setReportType} style={{ width: 150 }}>
              {reportTypeOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <label className={styles.label}>{t('report.dateRange')}</label>
            <RangePicker />
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleGenerate} loading={generating}>
                {t('report.generate')}
              </Button>
              <Button
                icon={<RobotOutlined />}
                onClick={openAIDrawer}
                disabled={!reportData}
                style={{ background: reportData ? 'linear-gradient(135deg, #667eea, #764ba2)' : undefined, borderColor: reportData ? '#764ba2' : undefined }}
                type={reportData ? 'primary' : 'default'}
              >
                AI 对话分析
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={handleExportPDF} disabled={!reportData}>
                {t('report.exportPdf')}
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} disabled={!reportData}>
                {t('report.exportExcel')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 报表预览 */}
      {generating && (
        <div className={styles.loadingWrap}>
          <Spin size="large" />
          <p>{t('report.generatingData')}</p>
        </div>
      )}

      {reportData && !generating && (
        <div ref={reportRef} className={styles.reportContent}>
          {/* 报表头 */}
          <div className={styles.reportHeader}>
            <h2>Mumu - {reportTypeOptions.find(o => o.value === reportType)?.label}</h2>
            <p>{t('report.generatedAt')}: {reportData.generatedAt} | {t('report.demoOnly')}</p>
          </div>

          {/* 汇总统计 */}
          <Row gutter={16} className={styles.summaryRow}>
            <Col span={6}><Card><Statistic title={t('report.totalOrders')} value={reportData.cityRank.reduce((s: number, c: any) => s + c.orders, 0)} suffix={t('report.unitOrders')} /></Card></Col>
            <Col span={6}><Card><Statistic title={t('report.totalRevenue')} value={Math.round(reportData.cityRank.reduce((s: number, c: any) => s + c.revenue, 0) / 10000)} suffix={t('report.unitTenThousand')} /></Card></Col>
            <Col span={6}><Card><Statistic title={t('report.activeDrivers')} value={reportData.cityRank.reduce((s: number, c: any) => s + c.drivers, 0)} suffix={t('report.unitPeople')} /></Card></Col>
            <Col span={6}><Card><Statistic title={t('report.coveredCities')} value={reportData.cityRank.length} suffix={t('report.unitCities')} /></Card></Col>
          </Row>

          {/* ★★★ AI 自动摘要 ★★★ */}
          <Card
            size="small"
            style={{ marginBottom: 16, borderRadius: 8 }}
            title={<span><RobotOutlined style={{ color: '#667eea', marginRight: 6 }} />AI 运营摘要</span>}
            extra={
              <Button
                type="primary"
                size="small"
                icon={summaryLoading ? undefined : <ThunderboltOutlined />}
                onClick={handleGenerateSummary}
                loading={summaryLoading}
                disabled={!!summaryContent}
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', fontSize: 12 }}
              >
                {summaryContent ? '已生成' : 'AI 生成摘要'}
              </Button>
            }
          >
            {summaryLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin />
                <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>AI 正在分析报表数据...</div>
              </div>
            ) : summaryContent ? (
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                {summaryContent.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return <h4 key={i} style={{ margin: '12px 0 6px', fontSize: 14, fontWeight: 600, color: '#333' }}>{line.replace('## ', '')}</h4>;
                  }
                  if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
                  if (line.startsWith('- ')) {
                    return <div key={i} style={{ paddingLeft: 12, marginBottom: 2, color: '#555' }}>• {line.replace('- ', '')}</div>;
                  }
                  return <div key={i} style={{ marginBottom: 2, color: '#444' }}>{line}</div>;
                })}
                <Divider style={{ margin: '12px 0 4px' }} />
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => { setSummaryContent(''); setTimeout(handleGenerateSummary, 100); }}
                  style={{ padding: 0 }}
                >
                  重新生成
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#aaa', fontSize: 13 }}>
                <BulbOutlined style={{ marginRight: 4 }} />
                点击「AI 生成摘要」自动分析报表数据，生成关键发现与建议
              </div>
            )}
          </Card>

          {/* 图表区 */}
          <Row gutter={16}>
            <Col span={12}>
              <Card title={t('report.monthlyOrderRevenue')} size="small" className={styles.chartCard}>
                <ReactECharts ref={chartRef} option={trendOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title={t('report.cityRanking')} size="small" className={styles.chartCard}>
                <ReactECharts option={cityOption} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Card title={t('report.cargoDistribution')} size="small" className={styles.chartCard}>
                <ReactECharts option={cargoOption} style={{ height: 260 }} />
              </Card>
            </Col>
            <Col span={16}>
              <Card title={t('report.cityOperations')} size="small" className={styles.chartCard}>
                <Table
                  dataSource={reportData.cityRank}
                  columns={tableColumns}
                  rowKey="city"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>

          <Divider />
          <div style={{ textAlign: 'center', color: '#999', fontSize: 12, padding: '8px 0' }}>
            {t('report.reportFooter')}
          </div>
        </div>
      )}

      {/* ★★★ AI 对话抽屉 ★★★ */}
      <Drawer
        title={
          <Space>
            <RobotOutlined style={{ color: '#667eea' }} />
            <span>AI 报表分析师</span>
          </Space>
        }
        placement="right"
        width={420}
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Input.TextArea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="输入你的问题..."
              rows={2}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleAISend();
                }
              }}
              disabled={aiLoading}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleAISend()}
              loading={aiLoading}
              disabled={!aiInput.trim()}
              style={{ height: 'auto', alignSelf: 'flex-end', background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}
            />
          </div>
        }
        destroyOnHidden
      >
        {/* 消息列表 */}
        <div ref={aiListRef} style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {aiMessages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: 8,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
            }}>
              {msg.role === 'ai' && (
                <Avatar icon={<RobotOutlined />} size={28} style={{ backgroundColor: '#667eea', flexShrink: 0 }} />
              )}
              <div style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.6,
                background: msg.role === 'user' ? '#667eea' : '#f0f2f5',
                color: msg.role === 'user' ? '#fff' : '#333',
              }}>
                {msg.role === 'ai' ? renderAIText(msg.text) : msg.text}
              </div>
            </div>
          ))}

          {/* 快捷提问 */}
          {aiMessages.length <= 1 && !aiLoading && (
            <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                <BulbOutlined style={{ marginRight: 4 }} />试试提问：
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {getQuickQuestions().map((q, i) => (
                  <Tag
                    key={i}
                    style={{ cursor: 'pointer', padding: '2px 10px', borderRadius: 12 }}
                    onClick={() => {
                      setAiInput(q);
                      setTimeout(() => handleAISend(q), 100);
                    }}
                  >
                    {q}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* 加载中 */}
          {aiLoading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Avatar icon={<RobotOutlined />} size={28} style={{ backgroundColor: '#667eea', flexShrink: 0 }} />
              <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f0f2f5' }}>
                <Spin size="small" />
                <span style={{ marginLeft: 8, fontSize: 13, color: '#888' }}>分析中...</span>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default ReportCenter;
