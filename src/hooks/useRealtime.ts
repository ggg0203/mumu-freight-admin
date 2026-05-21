/**
 * ★★★ useRealtime - 实时事件订阅 Hook ★★★
 *
 * 封装 WebSocket 服务的 React Hook，
 * 提供 connected 状态和最新事件信息。
 */

import { useState, useEffect, useRef } from 'react';
import { wsService } from '@/services/websocket';
import type { RealtimeEvent, RealtimeEventType } from '@/services/websocket';

export interface UseRealtimeOptions {
  /** 要订阅的事件类型，默认全部 */
  events?: RealtimeEventType[];
  /** 事件回调 */
  onEvent?: (event: RealtimeEvent) => void;
}

export interface UseRealtimeReturn {
  /** 连接状态 */
  connected: boolean;
  /** 最新接收到的事件 */
  latestEvent: RealtimeEvent | null;
  /** 所有事件列表（最多保留 20 条） */
  eventLog: RealtimeEvent[];
  /** 手动重新连接 */
  reconnect: () => void;
}

/**
 * 订阅实时事件
 *
 * @example
 * ```tsx
 * const { connected, latestEvent } = useRealtime({
 *   onEvent: (e) => {
 *     if (e.type === 'order.created') refreshOrders();
 *   },
 * });
 * ```
 */
export const useRealtime = (options?: UseRealtimeOptions): UseRealtimeReturn => {
  const [connected, setConnected] = useState(wsService.isConnected);
  const [latestEvent, setLatestEvent] = useState<RealtimeEvent | null>(null);
  const [eventLog, setEventLog] = useState<RealtimeEvent[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // 确保已连接
    if (!wsService.isConnected) {
      wsService.connect();
      setConnected(true);
    }

    // 订阅事件
    const unsub = wsService.onAny((event) => {
      setLatestEvent(event);
      setEventLog(prev => [event, ...prev].slice(0, 20));
      optionsRef.current?.onEvent?.(event);
    });

    return () => {
      unsub();
    };
  }, []);

  const reconnect = () => {
    wsService.disconnect();
    wsService.connect();
    setConnected(true);
  };

  return { connected, latestEvent, eventLog, reconnect };
};

export default useRealtime;
