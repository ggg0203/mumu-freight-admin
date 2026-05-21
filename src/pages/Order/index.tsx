/**
 * ★★★ 订单管理页面 ★★★
 *
 * 功能：
 * 1. 订单列表展示（Table 组件）
 * 2. 分页查询
 * 3. 订单状态筛选
 * 4. 关键词搜索
 * 5. 创建订单弹窗（起点/终点/货物类型/重量/联系人/司机分配）
 * 6. 导出 Excel
 * 7. 订单状态流转（待处理 → 运输中 → 已完成 / 已取消）
 * 8. AI 智能填单（自然语言描述 → 自动填充表单）
 */

import { useState, useRef, useEffect } from 'react';
import {
  Card, Table, Tag, Space, Input, Select, Button, Modal, Form,
  InputNumber, message, Row, Col, Collapse, Alert, Typography,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, DownloadOutlined, UploadOutlined,
  ArrowRightOutlined, CheckCircleOutlined, CloseCircleOutlined,
  RobotOutlined, SendOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import type { OrderInfo } from '@/types/api';
import { formatMoney, formatDate, formatOrderStatus, formatOrderStatusColor } from '@/utils/format';
import ExcelImport from '@/components/ExcelImport';
import { useAuditLogStore } from '@/stores/auditLogStore';
import { getCityNames, getGoodsTypes } from '@/shared-data';
import { orderApi } from '@/api';
import { useRealtime } from '@/hooks/useRealtime';
import { wsService } from '@/services/websocket';
import { aiFillOrder } from './aiFillOrder';
import { recommendDrivers } from './aiDriverRecommend';
import type { DriverRecommend } from './aiDriverRecommend';
import styles from './index.module.css';

// ==================== 常量 ====================

const statuses = ['pending', 'processing', 'completed', 'cancelled'] as const;
const goodsTypes = getGoodsTypes();
const cities = getCityNames();
const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '陈二'];
const defaultDrivers = [
  { name: '王大勇', phone: '13810000000' }, { name: '刘强', phone: '13810000731' },
  { name: '陈明', phone: '13810001462' }, { name: '赵刚', phone: '13810002193' },
  { name: '孙伟', phone: '13810002924' }, { name: '周磊', phone: '13810003655' },
  { name: '吴浩', phone: '13810004386' }, { name: '郑宇', phone: '13810005117' },
  { name: '冯达', phone: '13810005848' }, { name: '蒋斌', phone: '13810006579' },
];

// ==================== 组件 ====================

const Order: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrdersState] = useState<OrderInfo[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const idSeq = useRef(100);

  // ★★★ 从 API 加载订单 ★★★
  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getOrderList({ page, pageSize, status: statusFilter, keyword: searchText });
      setOrdersState(res.data?.list || []);
      setTotalOrders(res.data?.total || 0);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { loadOrders(); }, []);

  // ★★★ 实时推送：订单数据变化时刷新列表 ★★★
  const { latestEvent } = useRealtime();
  useEffect(() => {
    if (latestEvent && (latestEvent.type === 'order.created' || latestEvent.type === 'order.updated')) {
      loadOrders();
    }
  }, [latestEvent]);

  // ★★★ AI 智能填单状态 ★★★
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ★★★ AI 司机推荐状态 ★★★
  const [driverRecs, setDriverRecs] = useState<DriverRecommend[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // 更新订单 state 并同步到共享数据层
  const updateOrders = (updater: OrderInfo[] | ((prev: OrderInfo[]) => OrderInfo[])) => {
    setOrdersState((prev) => {
      return typeof updater === 'function' ? updater(prev) : updater;
    });
  };

  // 筛选
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      !searchText ||
      order.orderNo.includes(searchText) ||
      (order.customerName && order.customerName.includes(searchText)) ||
      (order.customerPhone && order.customerPhone.includes(searchText));
    const matchStatus = !statusFilter || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // 分页
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  // 刷新
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  // 新增订单
  const handleAdd = () => {
    form.resetFields();
    setAiInput('');
    form.setFieldsValue({ status: 'pending' });
    setModalVisible(true);
  };

  // ★★★ AI 智能填单 ★★★
  const handleAIFill = async () => {
    if (!aiInput.trim()) {
      message.warning('请先描述订单信息');
      return;
    }
    setAiLoading(true);
    const result = await aiFillOrder(aiInput);
    setAiLoading(false);

    if (result.success && result.fields) {
      const fields = result.fields;
      const setValues: Record<string, any> = {};

      if (fields.origin) setValues.origin = fields.origin;
      if (fields.destination) setValues.destination = fields.destination;
      if (fields.goodsType) setValues.goodsType = fields.goodsType;
      if (fields.weight) setValues.weight = fields.weight;
      if (fields.amount) setValues.amount = fields.amount;
      if (fields.customerName) setValues.customerName = fields.customerName;
      if (fields.customerPhone) setValues.customerPhone = fields.customerPhone;

      form.setFieldsValue(setValues);
      message.success(`AI 已自动填充 ${Object.keys(setValues).length} 个字段`);
    } else {
      message.error(result.error || 'AI 填单失败，请重试');
    }
  };

  // ★★★ AI 智能推荐司机 ★★★
  const handleAIRecommendDriver = async () => {
    const values = form.getFieldsValue();
    if (!values.origin || !values.destination || !values.goodsType || !values.weight) {
      message.warning('请先填写起点、终点、货物类型和重量，AI 才能推荐司机');
      return;
    }
    setRecLoading(true);
    setDriverRecs([]);
    const result = await recommendDrivers({
      origin: values.origin,
      destination: values.destination,
      goodsType: values.goodsType,
      weight: values.weight,
    });
    setRecLoading(false);
    if (result.success && result.recommendations.length > 0) {
      setDriverRecs(result.recommendations);
      message.success(`AI 已推荐 ${result.recommendations.length} 位司机`);
    } else {
      message.warning(result.error || 'AI 暂未找到合适的司机');
    }
  };

  // 保存订单
  const handleOk = () => {
    form.validateFields().then(async (values) => {
      const driver = values.driverId !== undefined ? defaultDrivers[values.driverId] : undefined;
      const newOrder: OrderInfo = {
        id: idSeq.current++,
        orderNo: `MUMU${String(20240101 + idSeq.current)}`,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        origin: values.origin,
        destination: values.destination,
        goodsType: values.goodsType,
        weight: values.weight,
        volume: 0,
        amount: values.amount,
        status: 'pending',
        driverName: driver?.name,
        driverPhone: driver?.phone,
        createTime: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
        updateTime: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
      };
      try { await orderApi.createOrder(newOrder); } catch {}
      loadOrders();
      // ★★★ 反向通知：用户创建新订单 → 触发 WebSocket 事件 + 消息通知 ★★★
      wsService.emitWithNotification('order.created', newOrder, {
        type: 'order',
        title: '新订单通知',
        content: `您创建了一笔新订单 #${newOrder.orderNo}，来自 ${newOrder.customerName}`,
      });
      // ★★★ 记录审计日志 ★★★
      useAuditLogStore.getState().pushLog({
        operator: t('nav.nickname'),
        module: t('order.title'),
        action: 'create',
        target: `订单 ${newOrder.orderNo}`,
        detail: `新增订单，客户：${newOrder.customerName}，${newOrder.origin}→${newOrder.destination}，金额：¥${newOrder.amount.toLocaleString()}`,
        ip: '192.168.1.100',
        result: 'success',
      });
      message.success(t('order.createdSuccess'));
      setModalVisible(false);
    });
  };

  // 导出 Excel
  const handleExport = () => {
    const exportData = filteredOrders.map((o) => ({
      'orderNo': o.orderNo,
      'customerName': o.customerName,
      'customerPhone': o.customerPhone,
      'origin': o.origin,
      'destination': o.destination,
      'goodsType': o.goodsType,
      'weight': o.weight,
      'amount': o.amount,
      'status': formatOrderStatus(o.status),
      'driver': o.driverName || '',
      'driverPhone': o.driverPhone || '',
      'createTime': o.createTime,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('order.exportSheetName'));
    XLSX.writeFile(wb, `${t('order.exportFileName')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success(`已导出 ${exportData.length} 条订单数据`);
  };

  // 状态流转（手动变更 → 自动触发 WebSocket 事件 + 消息通知）
  const handleStatusChange = async (id: number, newStatus: OrderInfo['status']) => {
    const oldOrder = orders.find((o) => o.id === id);
    try { await orderApi.updateOrderStatus(id, newStatus); } catch {}
    loadOrders();
    // ★★★ 反向通知：手动修改订单状态 → 触发 WebSocket 事件 + 消息通知 ★★★
    if (oldOrder) {
      const statusLabels: Record<string, string> = {
        pending: '待处理',
        processing: '运输中',
        completed: '已完成',
        cancelled: '已取消',
      };
      const updated = { ...oldOrder, status: newStatus };
      wsService.emitWithNotification('order.updated', updated, {
        type: 'order',
        title: '订单状态变更',
        content: `订单 ${oldOrder.orderNo} 状态已变更为「${statusLabels[newStatus] || newStatus}」`,
      });
    }
    message.success(`${t('order.statusUpdated')}「${formatOrderStatus(newStatus)}」`);
  };

  // 可执行的操作按钮
  const renderStatusActions = (record: OrderInfo) => {
    switch (record.status) {
      case 'pending':
        return (
          <Space>
            <Button
              type="link" size="small"
              icon={<ArrowRightOutlined />}
              style={{ color: '#1677ff' }}
              onClick={() => handleStatusChange(record.id, 'processing')}
            >
              {t('order.accept')}
            </Button>
            <Button
              type="link" size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleStatusChange(record.id, 'cancelled')}
            >
              {t('order.cancel')}
            </Button>
          </Space>
        );
      case 'processing':
        return (
          <Space>
            <Button
              type="link" size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => handleStatusChange(record.id, 'completed')}
            >
              {t('order.complete')}
            </Button>
            <Button
              type="link" size="small"
              icon={<CloseCircleOutlined />}
              style={{ color: '#faad14' }}
              onClick={() => handleStatusChange(record.id, 'cancelled')}
            >
              {t('order.cancel')}
            </Button>
          </Space>
        );
      default:
        return null;
    }
  };

  // 表格列
  const columns = [
    { title: t('order.orderNo'), dataIndex: 'orderNo', key: 'orderNo', width: 180 },
    { title: t('order.customer'), dataIndex: 'customerName', key: 'customerName', width: 90 },
    {
      title: t('order.route'),
      key: 'route',
      width: 200,
      render: (_: unknown, record: OrderInfo) => (
        <span>
          {record.origin}
          <span style={{ color: '#1677ff', margin: '0 6px' }}>→</span>
          {record.destination}
        </span>
      ),
    },
    { title: t('order.goodsType'), dataIndex: 'goodsType', key: 'goodsType', width: 90 },
    {
      title: t('order.weight'),
      dataIndex: 'weight',
      key: 'weight',
      width: 80,
      render: (weight: number) => `${weight} kg`,
    },
    {
      title: t('order.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (amount: number) => <span style={{ fontWeight: 500 }}>{formatMoney(amount)}</span>,
    },
    {
      title: t('order.status'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={formatOrderStatusColor(status)}>{formatOrderStatus(status)}</Tag>
      ),
    },
    { title: t('order.driver'), dataIndex: 'driverName', key: 'driverName', width: 80 },
    {
      title: t('order.createTime'),
      dataIndex: 'createTime',
      key: 'createTime',
      width: 170,
      render: (date: string) => formatDate(date),
    },
    {
      title: t('order.action'),
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: OrderInfo) => renderStatusActions(record),
    },
  ];

  return (
    <div className={styles.order}>
      {/* 搜索与操作区域 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space wrap>
              <Input
                placeholder={t('order.searchPlaceholder')}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                style={{ width: 240 }}
                allowClear
              />
              <Select
                placeholder={t('order.statusPlaceholder')}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                style={{ width: 140 }}
                allowClear
                options={[
                  { value: 'pending', label: t('order.status_pending') },
                  { value: 'processing', label: t('order.status_transit') },
                  { value: 'completed', label: t('order.status_delivered') },
                  { value: 'cancelled', label: t('order.status_cancelled') },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>{t('order.refresh')}</Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                {t('order.createOrder')}
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                {t('order.exportExcel')}
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
                {t('order.importExcel')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 订单表格 */}
      <Card style={{ borderRadius: 12 }}>
        <Table
          dataSource={paginatedOrders}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total: totalOrders,
            showSizeChanger: true,
            showTotal: (total: number) => {
              const countStr = String(total);
              return t('order.totalLabel').replace('{count}', countStr);
            },
            onChange: (p: number, ps: number) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 创建订单弹窗 */}
      <Modal
        title={
          <Space>
            <span>{t('order.createOrder')}</span>
          </Space>
        }
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        okText={t('order.confirm')}
        cancelText={t('order.modalCancel')}
        width={720}
        destroyOnHidden
      >
        {/* ★★★ AI 智能填单区域 ★★★ */}
        <Alert
          type="info"
          icon={<RobotOutlined />}
          showIcon
          message={
            <div>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>
                <ThunderboltOutlined style={{ color: '#667eea', marginRight: 4 }} />
                AI 智能填单 — 用自然语言一键填充表单
              </div>
              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <Input.TextArea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder='例：从深圳发一批电子设备到广州，总重2吨，联系人张三'
                    rows={2}
                    style={{ fontSize: 13 }}
                  />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleAIFill}
                    loading={aiLoading}
                    style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}
                  >
                    AI 填充
                  </Button>
                </Col>
              </Row>
              {aiLoading && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  <RobotOutlined spin style={{ marginRight: 4 }} />
                  正在解析订单描述...
                </div>
              )}
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} style={{ marginTop: 16 }}>
          <Form.Item label={t('order.customerName')} name="customerName" rules={[{ required: true, message: t('order.customerNameReq') }]}>
            <Input placeholder={t('order.customerNameReq')} />
          </Form.Item>
          <Form.Item label={t('order.customerPhone')} name="customerPhone" rules={[{ required: true, message: t('order.customerPhoneReq') }]}>
            <Input placeholder={t('order.customerPhoneReq')} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('order.origin')} name="origin" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}
                rules={[{ required: true, message: t('order.originReq') }]}
              >
                <Select placeholder={t('order.cityPlaceholder')} options={cities.map((c) => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('order.destination')} name="destination" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}
                rules={[{ required: true, message: t('order.destinationReq') }]}
              >
                <Select placeholder={t('order.cityPlaceholder')} options={cities.map((c) => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('order.goodsType')} name="goodsType" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}
                rules={[{ required: true, message: t('order.goodsTypeReq') }]}
              >
                <Select placeholder={t('order.typePlaceholder')} options={goodsTypes.map((g) => ({ value: g, label: g }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('order.weightKg')} name="weight" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}
                rules={[{ required: true, message: t('order.weightReq') }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder={t('order.weightReq')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={t('order.freight')} name="amount" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}
                rules={[{ required: true, message: t('order.freightReq') }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder={t('order.freightReq')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('order.assignDriver')} name="driverId" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                <Select placeholder={t('order.driverPlaceholder')} allowClear
                  options={defaultDrivers.map((d, i) => ({ value: i, label: `${d.name}（${d.phone}）` }))}
                />
              </Form.Item>
              {/* ★★★ AI 推荐司机 ★★★ */}
              <div style={{ paddingLeft: '41.67%', marginTop: -12, marginBottom: 8 }}>
                <Button
                  type="link"
                  size="small"
                  icon={<RobotOutlined />}
                  onClick={handleAIRecommendDriver}
                  loading={recLoading}
                  style={{ fontSize: 12, color: '#667eea', padding: 0 }}
                >
                  {recLoading ? 'AI 推荐中...' : 'AI 智能推荐司机'}
                </Button>
                {driverRecs.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>🤖 AI 推荐：</div>
                    <Space wrap size={[4, 4]}>
                      {driverRecs.map((rec, i) => (
                        <Tag
                          key={i}
                          style={{ cursor: 'pointer', borderRadius: 12, padding: '0 8px' }}
                          color="#667eea"
                          onClick={() => {
                            const found = defaultDrivers.findIndex(d => d.name === rec.name);
                            if (found >= 0) {
                              form.setFieldsValue({ driverId: found });
                              setDriverRecs([]);
                            }
                          }}
                        >
                          {rec.name} ⭐{rec.score}
                          <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>{rec.reason}</span>
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ★★★ Excel 批量导入弹窗 ★★★ */}
      <ExcelImport
        type="order"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={(data) => {
          // 将导入的数据转换为 OrderInfo 格式并追加到列表
          const newOrders: OrderInfo[] = data.map((item, idx) => ({
            id: Date.now() + idx,
            orderNo: `IMP${String(Date.now()).slice(-6)}${String(idx + 1).padStart(3, '0')}`,
            customerName: item.customerName || '',
            customerPhone: item.customerPhone || '',
            origin: item.origin || '',
            destination: item.destination || '',
            goodsType: item.goodsType || '',
            weight: Number(item.weight) || 0,
            volume: Number(item.volume) || 0,
            amount: Number(item.amount) || 0,
            status: 'pending',
            driverName: item.driverName || undefined,
            driverPhone: item.driverPhone || undefined,
            createTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
            updateTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
          }));
          // 追加到现有订单列表（最新在前）
          updateOrders((prev) => [...newOrders, ...prev]);
          // ★★★ 记录审计日志 ★★★
          useAuditLogStore.getState().pushLog({
            operator: t('nav.nickname'),
            module: t('order.title'),
            action: 'create',
            target: `批量导入 ${newOrders.length} 条订单`,
            detail: `通过 Excel 批量导入 ${newOrders.length} 条订单数据`,
            ip: '192.168.1.100',
            result: 'success',
          });
          message.success(t('order.importSuccess').replace('{count}', String(newOrders.length)));
        }}
      />
    </div>
  );
};

export default Order;
