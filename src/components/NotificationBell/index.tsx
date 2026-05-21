/**
 * ★★★ 通知铃铛组件 ★★★
 *
 * 显示在导航栏右侧
 * 含未读角标 + 通知下拉列表
 */

import { useState } from 'react';
import { Badge, Popover, List, Button, Empty, Tag, Space, message } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  CarOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/stores/notificationStore';
import type { NotificationItem } from '@/stores/notificationStore';
import styles from './index.module.css';

/** 通知类型配置 */
const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  order: { icon: <ShoppingCartOutlined />, color: '#1890ff' },
  driver: { icon: <CarOutlined />, color: '#52c41a' },
  warning: { icon: <WarningOutlined />, color: '#fa8c16' },
  system: { icon: <InfoCircleOutlined />, color: '#722ed1' },
};

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllRead, removeNotification, clearAll } = useNotificationStore();

  const handleMarkAllRead = () => {
    markAllRead();
    message.success(t('notification.markedAllRead'));
  };

  const handleClearAll = () => {
    clearAll();
    message.success(t('notification.clearedAll'));
  };

  const content = (
    <div className={styles.dropdown}>
      {/* 头部操作 */}
      <div className={styles.dropdownHeader}>
        <span className={styles.dropdownTitle}>{t('notification.title')}</span>
        <Space size={4}>
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            {t('notification.markAllRead')}
          </Button>
          <Button type="link" size="small" icon={<DeleteOutlined />} onClick={handleClearAll} disabled={notifications.length === 0}>
            {t('notification.clearAll')}
          </Button>
        </Space>
      </div>

      {/* 通知列表 */}
      {notifications.length === 0 ? (
        <Empty description={t('notification.noNotifications')} style={{ padding: '24px 0' }} />
      ) : (
        <div className={styles.notifList}>
          {notifications.slice(0, 20).map((item: NotificationItem) => {
            const cfg = typeConfig[item.type] || typeConfig.system;
            return (
              <div
                key={item.id}
                className={`${styles.notifItem} ${!item.read ? styles.unread : ''}`}
                onClick={() => markAsRead(item.id)}
              >
                <div className={styles.notifIcon} style={{ background: cfg.color + '15', color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div className={styles.notifBody}>
                  <div className={styles.notifTitle}>{item.title}</div>
                  <div className={styles.notifContent}>{item.content}</div>
                  <div className={styles.notifFooter}>
                    <span className={styles.notifTime}>{item.time}</span>
                    {!item.read && <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{t('notification.new')}</Tag>}
                  </div>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); removeNotification(item.id); }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      overlayClassName={styles.popover}
    >
      <Badge count={unreadCount} overflowCount={99} size="small" offset={[-2, 2]}>
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer', padding: '4px' }} />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
