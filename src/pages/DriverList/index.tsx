/**
 * ★★★ 司机列表页面 ★★★
 *
 * 功能：
 * 1. 搜索（司机姓名 / 手机号 / 城市 / 状态）
 * 2. 司机列表展示（头像、姓名、手机号、城市、车牌号、评分、接单数、状态、注册时间）
 * 3. 查看详情弹窗
 * 4. 编辑状态
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Input, Select, Space, Modal, Tag,
  Popconfirm, message, Avatar, Rate, Descriptions, Badge, Row, Col,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, UserOutlined,
  CarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DriverItem } from '@/shared-data';
import { driverApi } from '@/api';
import { useRealtime } from '@/hooks/useRealtime';
import { wsService } from '@/services/websocket';
import styles from './index.module.css';

const cityOptions = [
  '北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市',
  '南京市', '西安市', '重庆市', '天津市', '苏州市', '长沙市', '郑州市', '青岛市',
];

// ==================== 组件 ====================

const DriverList: React.FC = () => {
  const { t } = useTranslation();
  const statusOptions = [
    { value: '空闲', label: t('driverList.status.idle') },
    { value: '运输中', label: t('driverList.status.transporting') },
    { value: '离线', label: t('driverList.status.offline') },
  ];
  const [driversState, setDriversState] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchCity, setSearchCity] = useState<string | undefined>(undefined);
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<DriverItem | null>(null);

  // ★★★ 从 API 加载司机列表 ★★★
  const loadDrivers = async () => {
    setLoading(true);
    try {
      const res = await driverApi.getDriverList();
      setDriversState(res.data || []);
    } catch (e) {
      console.error('加载司机列表失败:', e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadDrivers(); }, []);

  // ★★★ 实时推送：司机状态变化时重新加载 ★★★
  const { latestEvent } = useRealtime();
  useEffect(() => {
    if (latestEvent && latestEvent.type === 'driver.status') {
      loadDrivers();
    }
  }, [latestEvent]);

  // 同步更新 state 与共享数据层
  const updateDrivers = (updater: (prev: DriverItem[]) => DriverItem[]) => {
    setDriversState((prev) => {
      const next = updater(prev);
      setDrivers(next);
      return next;
    });
  };

  // 筛选
  const filteredDrivers = driversState.filter((d) => {
    const matchName = !searchName || d.name.includes(searchName);
    const matchPhone = !searchPhone || d.phone.includes(searchPhone);
    const matchCity = !searchCity || d.city === searchCity;
    const matchStatus = !searchStatus || d.status === searchStatus;
    return matchName && matchPhone && matchCity && matchStatus;
  });

  // 查看详情
  const handleViewDetail = (driver: DriverItem) => {
    setCurrentDriver(driver);
    setDetailVisible(true);
  };

  // 编辑状态（手动变更 → 调用 API + 触发 WebSocket 事件）
  const handleStatusChange = async (driverId: number, newStatus: string) => {
    const driver = driversState.find((d) => d.id === driverId);
    if (!driver) return;
    const oldStatus = driver.status;

    try {
      await driverApi.updateDriverStatus(driverId, newStatus);
      setDriversState((prev) => prev.map((d) =>
        d.id === driverId ? { ...d, status: newStatus as DriverItem['status'] } : d
      ));
    } catch {
      message.error('更新状态失败');
      return;
    }

    const updated = { ...driver, status: newStatus as DriverItem['status'] };
    wsService.emitWithNotification('driver.status', updated, {
      type: 'driver',
      title: '司机状态变更',
      content: `司机 ${driver.name} 状态由「${oldStatus}」变更为「${newStatus}」`,
    });
    message.success(t('driverList.message.statusChanged', { status: newStatus }));
  };

  // 重置搜索
  const handleReset = () => {
    setSearchName('');
    setSearchPhone('');
    setSearchCity(undefined);
    setSearchStatus(undefined);
    message.success(t('driverList.message.resetSuccess'));
  };

  // 搜索
  const handleSearch = () => {
    if (filteredDrivers.length === 0) {
      message.info(t('driverList.message.noMatch'));
    } else {
      message.success(t('driverList.message.searchResult', { count: filteredDrivers.length }));
    }
  };

  // 状态 Tag
  const renderStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      '空闲': { color: 'green', text: t('driverList.status.idle') },
      '运输中': { color: 'blue', text: t('driverList.status.transporting') },
      '离线': { color: 'default', text: t('driverList.status.offline') },
    };
    const { color, text } = map[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  // 表格列
  const columns: ColumnsType<DriverItem> = [
    { title: t('driverList.columns.id'), dataIndex: 'id', key: 'id', width: 70 },
    {
      title: t('driverList.columns.avatar'), dataIndex: 'avatar', key: 'avatar', width: 60,
      render: (_, record) => (
        <Avatar size={36} src={record.avatar || undefined} icon={<UserOutlined />} />
      ),
    },
    { title: t('driverList.columns.name'), dataIndex: 'name', key: 'name', width: 90 },
    { title: t('driverList.columns.phone'), dataIndex: 'phone', key: 'phone', width: 130 },
    { title: t('driverList.columns.city'), dataIndex: 'city', key: 'city', width: 100 },
    { title: t('driverList.columns.plateNumber'), dataIndex: 'plateNumber', key: 'plateNumber', width: 110 },
    {
      title: t('driverList.columns.rating'), dataIndex: 'rating', key: 'rating', width: 140,
      render: (rating: number) => (
        <Space>
          <Rate disabled allowHalf value={rating} style={{ fontSize: 14 }} />
          <span style={{ fontSize: 12, color: '#999' }}>{rating}</span>
        </Space>
      ),
    },
    { title: t('driverList.columns.orderCount'), dataIndex: 'orderCount', key: 'orderCount', width: 80, align: 'center' },
    {
      title: t('driverList.columns.status'), dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => renderStatusTag(status),
    },
    { title: t('driverList.columns.registerTime'), dataIndex: 'registerTime', key: 'registerTime', width: 170 },
    {
      title: t('driverList.columns.action'), key: 'action', width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            {t('driverList.detailBtn')}
          </Button>
          <Select
            size="small"
            value={record.status}
            onChange={(value) => handleStatusChange(record.id, value)}
            style={{ width: 80 }}
            options={statusOptions}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrap}>
      {/* 搜索区域 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col>
            <Space>
              <span>{t('driverList.search.nameLabel')}：</span>
              <Input
                placeholder={t('driverList.search.namePlaceholder')}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                style={{ width: 140 }}
                allowClear
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span>{t('driverList.search.phoneLabel')}：</span>
              <Input
                placeholder={t('driverList.search.phonePlaceholder')}
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                style={{ width: 140 }}
                allowClear
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span>{t('driverList.search.cityLabel')}：</span>
              <Select
                placeholder={t('driverList.search.cityPlaceholder')}
                value={searchCity}
                onChange={setSearchCity}
                style={{ width: 130 }}
                allowClear
                options={cityOptions.map((c) => ({ value: c, label: c }))}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span>{t('driverList.search.statusLabel')}：</span>
              <Select
                placeholder={t('driverList.search.statusPlaceholder')}
                value={searchStatus}
                onChange={setSearchStatus}
                style={{ width: 110 }}
                allowClear
                options={statusOptions}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>{t('driverList.search.searchBtn')}</Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>{t('driverList.search.resetBtn')}</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 列表 */}
      <Card
        title={
          <Space>
            <CarOutlined />
            <span>{t('driverList.listTitle')}</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          rowKey="id"
          dataSource={filteredDrivers}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => t('driverList.totalLabel', { count: total }) }}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={t('driverList.detailTitle')}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setCurrentDriver(null);
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {currentDriver && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{currentDriver.name}</div>
                <Space>
                  <Badge status={currentDriver.status === '空闲' ? 'success' : currentDriver.status === '运输中' ? 'processing' : 'default'} />
                  <span>{currentDriver.status}</span>
                </Space>
              </div>
            </div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('driverList.detail.id')}>{currentDriver.id}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.phone')}>{currentDriver.phone}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.city')}>{currentDriver.city}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.plateNumber')}>{currentDriver.plateNumber}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.rating')}>
                <Rate disabled allowHalf value={currentDriver.rating} style={{ fontSize: 14 }} />
                <span style={{ marginLeft: 8 }}>{currentDriver.rating}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.orderCount')}>{currentDriver.orderCount}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.age')}>{currentDriver.age}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.experience')}>{currentDriver.yearsOfExperience} {t('driverList.detail.yearUnit')}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.idCard')}>{currentDriver.idCard}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.address')} span={2}>{currentDriver.address}</Descriptions.Item>
              <Descriptions.Item label={t('driverList.detail.registerTime')} span={2}>{currentDriver.registerTime}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DriverList;
