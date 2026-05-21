/**
 * ★★★ 拖拽订单看板页面 ★★★
 *
 * 功能：
 * 1. 四列看板：待处理 → 运输中 → 已完成 / 已取消
 * 2. HTML5 Drag & Drop 拖拽卡片到不同列
 * 3. 拖拽后自动更新订单状态
 * 4. 订单卡片展示关键信息
 * 5. 每列统计数量
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, Tag, Badge, message } from 'antd';
import {
  ClockCircleOutlined, LoadingOutlined, CheckCircleOutlined,
  CloseCircleOutlined, CarOutlined, UserOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { OrderInfo } from '@/types/api';
import { formatMoney, formatOrderStatus, formatOrderStatusColor } from '@/utils/format';
import styles from './index.module.css';

// ==================== 类型定义 ====================

type KanbanColumn = {
  key: OrderInfo['status'];
  title: string;
  color: string;
  icon: React.ReactNode;
  badges?: { status: string; count: number };
};

// ==================== Mock 数据（复用 Order 页面的缓存逻辑） ====================

// 复用 Order 页面的 orderCache
declare global {
  var orderCache: OrderInfo[] | null;
}

const getAllOrders = (): OrderInfo[] => {
  if (!globalThis.orderCache) {
    const statuses = ['pending', 'processing', 'completed', 'cancelled'] as const;
    const goodsTypes = ['电子产品', '食品生鲜', '日用百货', '机械设备', '化工原料'];
    const cities = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市'];
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '陈二'];
    const drivers = [
      { name: '王大力', phone: '13912345678' },
      { name: '刘师傅', phone: '13923456789' },
      { name: '陈师傅', phone: '13934567890' },
      { name: '赵司机', phone: '13945678901' },
      { name: '孙师傅', phone: '13956789012' },
    ];

    globalThis.orderCache = [];
    for (let i = 0; i < 30; i++) {
      globalThis.orderCache.push({
        id: i + 1,
        orderNo: `MUMU${String(20240101 + i)}`,
        customerName: names[i % names.length],
        customerPhone: `138${String(10000000 + i).slice(0, 8)}`,
        origin: cities[Math.floor(Math.random() * cities.length)],
        destination: cities[Math.floor(Math.random() * cities.length)],
        goodsType: goodsTypes[Math.floor(Math.random() * goodsTypes.length)],
        weight: Math.round(Math.random() * 5000 * 100) / 100,
        volume: Math.round(Math.random() * 100 * 100) / 100,
        amount: Math.round(Math.random() * 50000 * 100) / 100,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        driverName: i < 20 ? drivers[i % drivers.length].name : undefined,
        driverPhone: i < 20 ? drivers[i % drivers.length].phone : undefined,
        createTime: `2024-01-${String(1 + Math.floor(Math.random() * 15)).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
        updateTime: `2024-01-${String(1 + Math.floor(Math.random() * 15)).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
      });
    }
  }
  return globalThis.orderCache;
};

// ==================== 订单卡片组件 ====================

interface OrderCardProps {
  order: OrderInfo;
  onDragStart: (e: React.DragEvent, order: OrderInfo) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onDragStart }) => {
  return (
    <div
      className={styles.card}
      draggable
      onDragStart={(e) => onDragStart(e, order)}
    >
      {/* 卡片头部 */}
      <div className={styles.cardHeader}>
        <span className={styles.orderNo}>{order.orderNo}</span>
        <Tag color={formatOrderStatusColor(order.status)} style={{ margin: 0 }}>
          {formatOrderStatus(order.status)}
        </Tag>
      </div>

      {/* 路线信息 */}
      <div className={styles.route}>
        <span className={styles.city}>{order.origin}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.city}>{order.destination}</span>
      </div>

      {/* 货物信息 */}
      <div className={styles.goodsInfo}>
        <span className={styles.goodsType}>{order.goodsType}</span>
        <span className={styles.weight}>{order.weight} kg</span>
      </div>

      {/* 金额 */}
      <div className={styles.amount}>
        <DollarOutlined />
        <span>{formatMoney(order.amount)}</span>
      </div>

      {/* 客户和司机 */}
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <UserOutlined />
          <span>{order.customerName}</span>
        </div>
        {order.driverName && (
          <div className={styles.metaItem}>
            <CarOutlined />
            <span>{order.driverName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== 看板列组件 ====================

interface KanbanColumnProps {
  column: KanbanColumn;
  orders: OrderInfo[];
  onDrop: (orderId: number, newStatus: OrderInfo['status']) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, order: OrderInfo) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  orders,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragOver,
  onDragStart,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`${styles.column} ${isDragOver ? styles.columnDragOver : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const orderId = parseInt(e.dataTransfer.getData('orderId'), 10);
        if (!isNaN(orderId)) {
          onDrop(orderId, column.key);
        }
      }}
    >
      {/* 列标题 */}
      <div className={styles.columnHeader}>
        <div className={styles.columnTitle}>
          <span className={styles.columnIcon} style={{ color: column.color }}>
            {column.icon}
          </span>
          <span>{column.title}</span>
        </div>
        <Badge
          count={orders.length}
          style={{
            backgroundColor: column.color,
            boxShadow: 'none',
          }}
        />
      </div>

      {/* 卡片列表 */}
      <div className={styles.cardList}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onDragStart={onDragStart}
          />
        ))}
        {orders.length === 0 && (
          <div className={styles.emptyTip}>
            {t('orderKanban.dragHere')}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

const OrderKanban: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderInfo[]>(() => getAllOrders());
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // 看板列配置
  const columns = useMemo<KanbanColumn[]>(() => [
    { key: 'pending', title: t('orderKanban.pending'), color: '#faad14', icon: <ClockCircleOutlined /> },
    { key: 'processing', title: t('orderKanban.inTransit'), color: '#1677ff', icon: <LoadingOutlined /> },
    { key: 'completed', title: t('orderKanban.completed'), color: '#52c41a', icon: <CheckCircleOutlined /> },
    { key: 'cancelled', title: t('orderKanban.cancelled'), color: '#ff4d4f', icon: <CloseCircleOutlined /> },
  ], [t]);

  // 按状态分组订单
  const ordersByStatus = columns.reduce((acc, col) => {
    acc[col.key] = orders.filter((o) => o.status === col.key);
    return acc;
  }, {} as Record<OrderInfo['status'], OrderInfo[]>);

  // 统计数据
  const stats = {
    total: orders.length,
    pending: ordersByStatus.pending?.length || 0,
    processing: ordersByStatus.processing?.length || 0,
    completed: ordersByStatus.completed?.length || 0,
    cancelled: ordersByStatus.cancelled?.length || 0,
  };

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, order: OrderInfo) => {
    e.dataTransfer.setData('orderId', String(order.id));
    e.dataTransfer.effectAllowed = 'move';
    // 添加拖拽样式
    (e.target as HTMLElement).classList.add(styles.cardDragging);
  };

  // 拖拽结束
  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove(styles.cardDragging);
    setDragOverColumn(null);
  };

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  // 拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    // 只在真正离开列时清除
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null);
    }
  };

  // 放置订单
  const handleDrop = (orderId: number, newStatus: OrderInfo['status']) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // 检查状态是否变化
    if (order.status === newStatus) {
      message.info(t('orderKanban.alreadyInStatus'));
      setDragOverColumn(null);
      return;
    }

    // 更新订单状态
    const updatedOrders = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: newStatus,
            updateTime: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
          }
        : o
    );

    setOrders(updatedOrders);
    globalThis.orderCache = updatedOrders;

    message.success(
      t('orderKanban.movedTo', { no: order.orderNo, status: formatOrderStatus(newStatus) })
    );
    setDragOverColumn(null);
  };

  return (
    <div className={styles.kanban}>
      {/* 顶部统计 */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>{t('orderKanban.totalOrders')}</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={styles.statItem} style={{ color: '#faad14' }}>
          <ClockCircleOutlined />
          <span className={styles.statLabel}>{t('orderKanban.pending')}</span>
          <span className={styles.statValue}>{stats.pending}</span>
        </div>
        <div className={styles.statItem} style={{ color: '#1677ff' }}>
          <LoadingOutlined />
          <span className={styles.statLabel}>{t('orderKanban.inTransit')}</span>
          <span className={styles.statValue}>{stats.processing}</span>
        </div>
        <div className={styles.statItem} style={{ color: '#52c41a' }}>
          <CheckCircleOutlined />
          <span className={styles.statLabel}>{t('orderKanban.completed')}</span>
          <span className={styles.statValue}>{stats.completed}</span>
        </div>
        <div className={styles.statItem} style={{ color: '#ff4d4f' }}>
          <CloseCircleOutlined />
          <span className={styles.statLabel}>{t('orderKanban.cancelled')}</span>
          <span className={styles.statValue}>{stats.cancelled}</span>
        </div>
      </div>

      {/* 看板主体 */}
      <div className={styles.board}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            orders={ordersByStatus[column.key] || []}
            onDrop={handleDrop}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            isDragOver={dragOverColumn === column.key}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
    </div>
  );
};

export default OrderKanban;
