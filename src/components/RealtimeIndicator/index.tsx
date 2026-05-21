/**
 * ★★★ RealtimeIndicator - 实时连接状态指示灯 ★★★
 *
 * 显示在 NavHeader 右上角，绿色呼吸灯表示连接正常，
 * 红色表示断开连接。点击可查看最近事件日志。
 */

import { useState, useRef, useEffect } from 'react';
import { Tooltip, Badge, Popover, List, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useRealtime } from '@/hooks/useRealtime';
import type { RealtimeEvent } from '@/services/websocket';
import styles from './index.module.css';

const { Text } = Typography;

/** 事件类型 → 中文标签 */
const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  'order.created': { label: '新订单', color: 'green' },
  'order.updated': { label: '订单更新', color: 'blue' },
  'driver.status': { label: '司机状态', color: 'orange' },
};

const RealtimeIndicator: React.FC = () => {
  const { connected, eventLog } = useRealtime();

  const content = (
    <div style={{ width: 280, maxHeight: 300, overflow: 'auto' }}>
      {eventLog.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#999', fontSize: 12 }}>
          暂无事件
        </div>
      ) : (
        <List
          size="small"
          dataSource={eventLog}
          renderItem={(event: RealtimeEvent) => {
            const info = EVENT_LABELS[event.type] || { label: event.type, color: 'default' };
            const time = new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
            return (
              <List.Item style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                  <Tag color={info.color} style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>
                    {info.label}
                  </Tag>
                  <Text style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.data?.orderNo || event.data?.name || event.type}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{time}</Text>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={<span style={{ fontSize: 13 }}>实时事件中心</span>}
      trigger="click"
      placement="bottomRight"
    >
      <div className={styles.indicator}>
        <div className={connected ? styles.dotOnline : styles.dotOffline} />
        <span className={connected ? styles.labelOnline : styles.labelOffline}>
          {connected ? 'LIVE' : 'OFF'}
        </span>
      </div>
    </Popover>
  );
};

export default RealtimeIndicator;
