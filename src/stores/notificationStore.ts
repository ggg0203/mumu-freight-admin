/**
 * ★★★ 消息通知状态管理 (Zustand) ★★★
 *
 * 通知由 WebSocket 服务统一推送（基于真实数据），不再使用独立模拟。
 * 支持通知 CRUD、未读计数。
 */

import { create } from 'zustand';
import storage, { STORAGE_KEYS } from '@/utils/storage';

/** 存储版本号，用于迁移旧数据 */
const STORAGE_VERSION_KEY = 'NOTIF_STORE_VERSION';
const CURRENT_VERSION = 2;

/** 最大保存条数 */
const MAX_NOTIFICATIONS = 200;

/** 通知类型 */
export type NotificationType = 'order' | 'system' | 'driver' | 'warning';

/** 通知项 */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  time: string;
  read: boolean;
}

/** 通知状态 */
interface NotificationState {
  /** 所有通知列表 */
  notifications: NotificationItem[];
  /** 未读数量 */
  unreadCount: number;
  /** 添加通知 */
  addNotification: (item: Omit<NotificationItem, 'id' | 'time' | 'read'>) => void;
  /** 标记已读 */
  markAsRead: (id: string) => void;
  /** 全部标记已读 */
  markAllRead: () => void;
  /** 删除通知 */
  removeNotification: (id: string) => void;
  /** 清空全部 */
  clearAll: () => void;
}

/** 格式化时间 */
const formatTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

/** 生成唯一 ID */
const genId = (): string => `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** 从 localStorage 加载通知列表（含旧数据迁移） */
const loadNotifications = (): NotificationItem[] => {
  // 检测版本号，旧版本数据（含"张师傅"等虚假通知）直接清空
  const version = storage.get<number>(STORAGE_VERSION_KEY);
  if (!version || version < CURRENT_VERSION) {
    storage.set(STORAGE_VERSION_KEY, CURRENT_VERSION);
    storage.remove(STORAGE_KEYS.NOTIFICATIONS);
    return [];
  }
  const saved = storage.get<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS);
  return saved ?? [];
};

/** 持久化通知列表到 localStorage */
const saveNotifications = (notifications: NotificationItem[]) => {
  storage.set(STORAGE_KEYS.NOTIFICATIONS, notifications.slice(0, MAX_NOTIFICATIONS));
};

/**
 * 创建通知状态管理
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: loadNotifications(),
  unreadCount: loadNotifications().filter((n) => !n.read).length,

  addNotification: (item) => {
    const newItem: NotificationItem = {
      ...item,
      id: genId(),
      time: formatTime(new Date()),
      read: false,
    };
    set((state) => {
      const updated = [newItem, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      saveNotifications(updated);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return { notifications: updated, unreadCount: 0 };
    });
  },

  removeNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      saveNotifications(updated);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  clearAll: () => {
    saveNotifications([]);
    set({ notifications: [], unreadCount: 0 });
  },
}));

/* ★★★ 推送已统一迁移至 services/websocket.ts，确保所有通知源自真实业务数据 ★★★ */
