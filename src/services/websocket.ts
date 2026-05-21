/**
 * ★★★ WebSocket 实时推送服务（真实后端版 + Mock 回退）★★★
 *
 * 通过 WebSocket 连接 Python FastAPI 后端，接收实时推送。
 * 当后端不可用时，自动切换到 Mock 引擎（开发/演示模式）。
 *
 * 事件类型：
 * - order.created: 新订单创建
 * - order.updated: 订单状态变更
 * - driver.status: 司机状态变更
 */

import { useNotificationStore } from '@/stores/notificationStore';
import type { NotificationType } from '@/stores/notificationStore';

// ==================== 事件类型 ====================

export type RealtimeEventType = 'order.created' | 'order.updated' | 'driver.status';

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: any;
  timestamp: number;
}

type EventCallback = (event: RealtimeEvent) => void;

// ==================== Mock 数据工厂 ====================

const ORDER_STATUSES = ['待取货', '运输中', '已到达', '已签收'];
const DRIVER_STATUSES = ['空闲', '接单中', '运输中', '休息中'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function genMockEvent(): RealtimeEvent {
  // ★★★ Mock 模式只推送订单事件，避免产生不存在的司机名 ★★★
  const type = randomItem<RealtimeEventType>(['order.created', 'order.updated']);
  let data: any = {};

  if (type === 'order.created') {
    data = {
      orderNo: randomId('ORD'),
      from: randomItem(['北京', '上海', '广州', '深圳', '杭州', '成都']),
      to: randomItem(['武汉', '西安', '南京', '重庆', '天津', '苏州']),
      weight: Math.floor(Math.random() * 1000) + 100,
      status: '待取货',
    };
  } else {
    data = {
      orderNo: randomId('ORD'),
      from: randomItem(['北京', '上海', '广州', '深圳', '杭州', '成都']),
      to: randomItem(['武汉', '西安', '南京', '重庆', '天津', '苏州']),
      weight: Math.floor(Math.random() * 1000) + 100,
      status: randomItem(ORDER_STATUSES),
    };
  }

  return { type, data, timestamp: Date.now() };
}

// ==================== 服务单例 ====================

class WebSocketService {
  private connected = false;
  private ws: WebSocket | null = null;
  private listeners = new Map<RealtimeEventType, Set<EventCallback>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private mockTimer: ReturnType<typeof setInterval> | null = null;
  private mockMode = false;
  private connectionCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private WS_URL = 'ws://localhost:8080/ws';

  /** 是否已连接（真实或 Mock） */
  get isConnected(): boolean {
    return this.connected;
  }

  /** 是否为 Mock 模式 */
  get isMockMode(): boolean {
    return this.mockMode;
  }

  /** 连接真实 WebSocket，超时后自动切换 Mock */
  connect(): void {
    if (this.connected) return;
    this.mockMode = false;

    try {
      this.ws = new WebSocket(this.WS_URL);

      // ★★★ 3秒超时，超时则切换到 Mock 模式 ★★★
      this.connectionCheckTimer = setTimeout(() => {
        if (!this.connected) {
          console.log('[WS] 后端未响应（3秒超时），自动切换到 Mock 模式');
          this.enableMockMode();
        }
      }, 3000);

      this.ws.onopen = () => {
        // 取消超时检查
        if (this.connectionCheckTimer) {
          clearTimeout(this.connectionCheckTimer);
          this.connectionCheckTimer = null;
        }
        // 关闭 Mock 引擎
        this.disableMockMode();
        this.connected = true;
        console.log('[WS] 已连接真实后端');
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type && msg.data) {
            this.dispatch(msg.type as RealtimeEventType, msg.data);
            // 自动添加通知
            const { addNotification } = useNotificationStore.getState();
            const notifTitle: Record<string, string> = {
              'order.created': '新订单通知',
              'order.updated': '订单状态变更',
              'driver.status': '司机状态变更',
            };
            const notifType: Record<string, NotificationType> = {
              'order.created': 'order',
              'order.updated': 'order',
              'driver.status': 'driver',
            };
            if (notifTitle[msg.type]) {
              addNotification({
                type: notifType[msg.type] || 'system',
                title: notifTitle[msg.type],
                content: msg.data?.orderNo
                  ? `${notifTitle[msg.type]} - ${msg.data.orderNo}`
                  : msg.data?.name
                    ? `${notifTitle[msg.type]} - ${msg.data.name}`
                    : notifTitle[msg.type],
              });
            }
          }
        } catch (e) {
          console.error('[WS] 消息解析失败:', e);
        }
      };
      this.ws.onclose = () => {
        this.connected = false;
        console.log('[WS] 连接断开，5秒后重连...');
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        // 错误时立即触发超时逻辑
        if (this.connectionCheckTimer) {
          clearTimeout(this.connectionCheckTimer);
          this.connectionCheckTimer = null;
        }
        console.warn('[WS] 连接错误，切换到 Mock 模式');
        this.enableMockMode();
      };
    } catch (e) {
      console.warn('[WS] 创建连接失败，自动切换到 Mock 模式:', e);
      this.enableMockMode();
    }
  }

  /** 启用 Mock 模式 */
  private enableMockMode(): void {
    if (this.mockMode) return; // 防止重复启动
    this.mockMode = true;
    this.connected = true; // Mock 也算"已连接"

    // 关闭已有的 WS 连接
    if (this.ws) {
      try { this.ws.close(); } catch (_) { /* ignore */ }
      this.ws = null;
    }
    // 取消重连
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    console.log('[WS] Mock 引擎已启动（每 5-10 秒随机推送事件）');

    // 每 5-10 秒随机推送一个事件
    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 5000;
      this.mockTimer = setTimeout(() => {
        const event = genMockEvent();
        this.dispatch(event.type, event.data);
        // 自动添加通知
        const { addNotification } = useNotificationStore.getState();
        const notifTitle: Record<string, string> = {
          'order.created': '新订单通知',
          'order.updated': '订单状态变更',
          'driver.status': '司机状态变更',
        };
        const notifType: Record<string, NotificationType> = {
          'order.created': 'order',
          'order.updated': 'order',
          'driver.status': 'driver',
        };
        addNotification({
          type: notifType[event.type] || 'system',
          title: notifTitle[event.type],
          content: event.data?.orderNo
            ? `${notifTitle[event.type]} - ${event.data.orderNo}`
            : event.data?.name
              ? `${notifTitle[event.type]} - ${event.data.name}`
              : notifTitle[event.type],
        });
        console.log(`[WS Mock] 推送事件: ${event.type}`, event.data);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  /** 禁用 Mock 模式 */
  private disableMockMode(): void {
    if (!this.mockMode) return;
    this.mockMode = false;
    if (this.mockTimer) {
      clearTimeout(this.mockTimer);
      this.mockTimer = null;
    }
    console.log('[WS] Mock 引擎已停止');
  }

  /** 断开 */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.mockTimer) {
      clearTimeout(this.mockTimer);
      this.mockTimer = null;
    }
    if (this.connectionCheckTimer) {
      clearTimeout(this.connectionCheckTimer);
      this.connectionCheckTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.mockMode = false;
    console.log('[WS] 已断开');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.connected) {
        console.log('[WS] 尝试重连...');
        this.connect();
      }
    }, 5000);
  }

  /** 订阅事件 */
  on(type: RealtimeEventType, cb: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(cb);
    return () => {
      this.listeners.get(type)?.delete(cb);
    };
  }

  /** 订阅全部事件（便捷方法） */
  onAny(cb: EventCallback): () => void {
    const types: RealtimeEventType[] = ['order.created', 'order.updated', 'driver.status'];
    const unsubs = types.map(t => this.on(t, cb));
    return () => unsubs.forEach(fn => fn());
  }

  /** 发射事件 */
  emit(type: RealtimeEventType, data: any): void {
    this.dispatch(type, data);
  }

  /** 发射事件 + 同步推送通知 */
  emitWithNotification(
    type: RealtimeEventType,
    data: any,
    notif: { type: NotificationType; title: string; content: string },
  ): void {
    this.dispatch(type, data);
    const { addNotification } = useNotificationStore.getState();
    addNotification(notif);
  }

  /** 内部派发事件 */
  private dispatch(type: RealtimeEventType, data: any): void {
    const event: RealtimeEvent = { type, data, timestamp: Date.now() };
    const cbs = this.listeners.get(type);
    if (cbs) {
      cbs.forEach(cb => {
        try { cb(event); } catch (e) { console.error('[WS] callback error:', e); }
      });
    }
  }
}

/** 全局单例 */
export const wsService = new WebSocketService();
export default wsService;
