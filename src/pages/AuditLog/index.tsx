/**
 * ★★★ 操作审计日志页面 ★★★
 *
 * 功能：
 * 1. 记录所有增删改操作（操作人 + 时间 + 变更详情）
 * 2. 可按时间范围、操作人、模块、操作类型筛选
 * 3. 详细的变更内容展示
 * 4. 操作结果标签（成功/失败）
 * 5. 清晰的分页列表
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Tag, Space, Select, DatePicker, Input, Row, Col, Statistic, Button } from 'antd';
import {
  SearchOutlined, ReloadOutlined, PlusCircleOutlined,
  EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, UserOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { auditLogApi } from '@/api';
import type { AuditAction } from '@/stores/auditLogStore';
import styles from './index.module.css';

const { RangePicker } = DatePicker;

/** 模块值（用于筛选和数据匹配，保留中文以匹配 Mock 数据） */
const MODULE_VALUES = ['订单管理', '用户管理', '菜单管理', '角色管理', '部门管理', '司机管理'];

/** 模块值 → 翻译键映射 */
const MODULE_KEY_MAP: Record<string, string> = {
  '订单管理': 'orderManagement',
  '用户管理': 'userManagement',
  '菜单管理': 'menuManagement',
  '角色管理': 'roleManagement',
  '部门管理': 'deptManagement',
  '司机管理': 'driverManagement',
};

const AuditLog: React.FC = () => {
  const { t } = useTranslation();

  const [logs, setLogs] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);

  // ★★★ 从 API 加载审计日志 ★★★
  const loadLogs = async (p = 1) => {
    try {
      const res = await auditLogApi.getLogList({
        page: p, pageSize: 15, module: moduleFilter,
        action: actionFilter, operator: operatorFilter, keyword: searchText,
      });
      setLogs(res.data?.list || []);
      setTotalLogs(res.data?.total || 0);
    } catch {}
  };
  useEffect(() => { loadLogs(); }, []);

  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined);
  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>(undefined);
  const [operatorFilter, setOperatorFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // 提取独特的值用于筛选下拉
  const operators = useMemo(() => [...new Set(logs.map((l) => l.operator))], [logs]);

  // 筛选
  const filteredLogs = logs;
  /* 原筛选逻辑移至 API 端
  const _filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 关键词
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!log.target.toLowerCase().includes(q) && !log.detail.toLowerCase().includes(q)) {
          return false;
        }
      }
      // 模块
      if (moduleFilter && log.module !== moduleFilter) return false;
      // 操作类型
      if (actionFilter && log.action !== actionFilter) return false;
      // 操作人
      if (operatorFilter && log.operator !== operatorFilter) return false;
      // 时间范围
      if (dateRange) {
        if (log.time < dateRange[0] || log.time > dateRange[1]) return false;
      }
          return true;
    });
  }, [logs, searchText, moduleFilter, actionFilter, operatorFilter, dateRange]);
  */

  // 统计
  const stats = useMemo(() => {
    const total = totalLogs;
    const success = filteredLogs.filter((l) => l.result === 'success').length;
    const fail = total - success;
    const creates = filteredLogs.filter((l) => l.action === 'create').length;
    const updates = filteredLogs.filter((l) => l.action === 'update').length;
    const deletes = filteredLogs.filter((l) => l.action === 'delete').length;
    return { total, success, fail, creates, updates, deletes };
  }, [filteredLogs]);

  const columns = [
    {
      title: t('auditLog.columns.time'),
      dataIndex: 'time',
      key: 'time',
      width: 170,
      render: (v: string) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#999', fontSize: 12 }} />
          <span>{v}</span>
        </Space>
      ),
    },
    {
      title: t('auditLog.columns.operator'),
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
      render: (v: string) => (
        <Space>
          <UserOutlined style={{ color: '#1677ff' }} />
          <span>{v}</span>
        </Space>
      ),
    },
    {
      title: t('auditLog.columns.module'),
      dataIndex: 'module',
      key: 'module',
      width: 110,
      render: (v: string) => (
        <Tag icon={<AppstoreOutlined />} color="default">{v}</Tag>
      ),
    },
    {
      title: t('auditLog.columns.actionType'),
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (v: string) => {
        // 根据中文 action 字符串匹配图标和颜色
        let icon: React.ReactNode = <PlusCircleOutlined />;
        let color = 'green';
        if (v.includes('创建') || v.includes('新增')) { icon = <PlusCircleOutlined />; color = 'green'; }
        else if (v.includes('编辑') || v.includes('更新') || v.includes('修改')) { icon = <EditOutlined />; color = 'blue'; }
        else if (v.includes('删除')) { icon = <DeleteOutlined />; color = 'red'; }
        else if (v.includes('查询') || v.includes('查看')) { icon = <SearchOutlined />; color = 'default'; }
        else if (v.includes('导出')) { icon = <ReloadOutlined />; color = 'purple'; }
        return <Tag icon={icon} color={color}>{v}</Tag>;
      },
    },
    {
      title: t('auditLog.columns.target'),
      dataIndex: 'target',
      key: 'target',
      width: 200,
      ellipsis: true,
    },
    {
      title: t('auditLog.columns.detail'),
      dataIndex: 'detail',
      key: 'detail',
      width: 300,
      ellipsis: true,
    },
    {
      title: t('auditLog.columns.ip'),
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: t('auditLog.columns.result'),
      dataIndex: 'result',
      key: 'result',
      width: 80,
      render: (v: 'success' | 'fail') => (
        v === 'success'
          ? <Tag icon={<CheckCircleOutlined />} color="success">{t('auditLog.status.success')}</Tag>
          : <Tag icon={<CloseCircleOutlined />} color="error">{t('auditLog.status.fail')}</Tag>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col span={4}>
          <Card className={styles.statCard} size="small">
            <Statistic title={t('auditLog.stat.currentFilter')} value={stats.total} suffix={t('auditLog.stat.suffix')} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className={styles.statCard} size="small">
            <Statistic title={t('auditLog.stat.creates')} value={stats.creates} valueStyle={{ color: '#52c41a', fontSize: 22 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className={styles.statCard} size="small">
            <Statistic title={t('auditLog.stat.updates')} value={stats.updates} valueStyle={{ color: '#1677ff', fontSize: 22 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className={styles.statCard} size="small">
            <Statistic title={t('auditLog.stat.deletes')} value={stats.deletes} valueStyle={{ color: '#ff4d4f', fontSize: 22 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className={styles.statCard} size="small">
            <Statistic title={t('auditLog.stat.success')} value={stats.success} suffix={`/ ${stats.total}`} valueStyle={{ color: '#52c41a', fontSize: 22 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className={styles.statCard} size="small">
            <Statistic title={t('auditLog.stat.fail')} value={stats.fail} valueStyle={{ color: stats.fail > 0 ? '#ff4d4f' : '#999', fontSize: 22 }} />
          </Card>
        </Col>
      </Row>

      {/* 筛选区 */}
      <Card className={styles.filterCard} size="small">
        <Row gutter={[12, 12]} align="middle">
          <Col>
            <Input
              placeholder={t('auditLog.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder={t('auditLog.filter.module')}
              value={moduleFilter}
              onChange={setModuleFilter}
              allowClear
              style={{ width: 130 }}
              options={MODULE_VALUES.map((m) => ({ value: m, label: t(`auditLog.${MODULE_KEY_MAP[m]}`) }))}
            />
          </Col>
          <Col>
            <Select
              placeholder={t('auditLog.filter.actionType')}
              value={actionFilter}
              onChange={setActionFilter}
              allowClear
              style={{ width: 110 }}
              options={[
                { value: 'create', label: <><PlusCircleOutlined /> {t('auditLog.action.create')}</> },
                { value: 'update', label: <><EditOutlined /> {t('auditLog.action.update')}</> },
                { value: 'delete', label: <><DeleteOutlined /> {t('auditLog.action.delete')}</> },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder={t('auditLog.filter.operator')}
              value={operatorFilter}
              onChange={setOperatorFilter}
              allowClear
              style={{ width: 120 }}
              options={operators.map((o) => ({ value: o, label: o }))}
            />
          </Col>
          <Col flex="auto">
            <RangePicker
              showTime
              onChange={(_, dateStrings) => {
                if (dateStrings[0] && dateStrings[1]) {
                  setDateRange([dateStrings[0], dateStrings[1]]);
                } else {
                  setDateRange(null);
                }
              }}
              style={{ width: 340 }}
            />
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText('');
                setModuleFilter(undefined);
                setActionFilter(undefined);
                setOperatorFilter(undefined);
                setDateRange(null);
              }}
            >
              {t('auditLog.reset')}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 日志表格 */}
      <Card className={styles.tableCard}>
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => t('auditLog.pagination.total', { count: totalLogs }),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default AuditLog;
