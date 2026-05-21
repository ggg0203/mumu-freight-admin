/**
 * ★★★ 多标签页 Store ★★★
 *
 * 功能：
 * 1. 管理已打开的标签页列表
 * 2. 跟踪当前激活的标签页
 * 3. 支持关闭单个/其他/全部标签页
 * 4. 持久化标签页顺序（拖动排序）
 */

import { create } from 'zustand';
import i18n from '@/i18n';

/** 标签页信息 */
export interface TabInfo {
  /** 路由路径（唯一标识） */
  path: string;
  /** 标签标题（存储 i18n key 或原始标题） */
  title: string;
  /** 是否固定（不可关闭） */
  closable: boolean;
}

interface TabStore {
  /** 已打开的标签页列表 */
  tabs: TabInfo[];
  /** 当前激活的标签页路径 */
  activeTab: string;

  /** 打开/切换到指定标签页 */
  openTab: (tab: TabInfo) => void;
  /** 关闭指定标签页 */
  closeTab: (path: string) => void;
  /** 关闭其他标签页 */
  closeOtherTabs: (path: string) => void;
  /** 关闭所有标签页 */
  closeAllTabs: () => void;
  /** 设置激活标签页 */
  setActiveTab: (path: string) => void;
  /** 拖动排序 */
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  /** 关闭右侧标签页 */
  closeRightTabs: (path: string) => void;
}

/** 默认首页标签（固定不可关闭） */
const HOME_TAB: TabInfo = {
  path: '/dashboard',
  title: 'menu.dashboard',
  closable: false,
};

/** 路径 → i18n key 映射 */
const PATH_TITLE_MAP: Record<string, string> = {
  '/dashboard': 'menu.dashboard',
  '/welcome': 'menu.dashboard',
  '/order': 'menu.orderList',
  '/order-cluster': 'menu.orderCluster',
  '/order-kanban': 'menu.orderKanban',
  '/order-trace': 'menu.orderTrace',
  '/route-planning': 'menu.routePlanning',
  '/driver-list': 'menu.driverList',
  '/user-list': 'menu.userList',
  '/menu-list': 'menu.menuList',
  '/role-list': 'menu.roleList',
  '/dept-list': 'menu.deptList',
  '/course': 'menu.course',
  '/settings': 'menu.settings',
  '/reports': 'menu.reports',
  '/heatmap': 'menu.heatmap',
  '/three-globe': 'menu.threeGlobe',
  '/order-prediction': 'menu.orderPrediction',
  '/audit-log': 'menu.auditLog',
};

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [HOME_TAB],
  activeTab: '/dashboard',

  openTab: (tab) => {
    const { tabs, activeTab } = get();
    // 已存在且已经是激活状态 → 跳过，避免触发重渲染
    const exists = tabs.find((t) => t.path === tab.path);
    if (exists) {
      if (activeTab !== tab.path) {
        set({ activeTab: tab.path });
      }
      return;
    }
    // 新标签，追加到末尾
    set({ tabs: [...tabs, tab], activeTab: tab.path });
  },

  closeTab: (path) => {
    const { tabs, activeTab } = get();
    const target = tabs.find((t) => t.path === path);
    // 不允许关闭固定标签
    if (target && !target.closable) return;

    const newTabs = tabs.filter((t) => t.path !== path);
    if (newTabs.length === 0) {
      // 全部关闭时保留首页
      set({ tabs: [HOME_TAB], activeTab: HOME_TAB.path });
      return;
    }

    // 如果关闭的是当前激活的标签，切换到最近的一个
    let newActive = activeTab;
    if (path === activeTab) {
      const closedIndex = tabs.findIndex((t) => t.path === path);
      if (closedIndex > 0) {
        newActive = tabs[closedIndex - 1].path;
      } else {
        newActive = newTabs[0].path;
      }
    }

    set({ tabs: newTabs, activeTab: newActive });
  },

  closeOtherTabs: (path) => {
    const { tabs } = get();
    const keep = tabs.filter((t) => t.path === path || !t.closable);
    set({ tabs: keep, activeTab: path });
  },

  closeAllTabs: () => {
    set({ tabs: [HOME_TAB], activeTab: HOME_TAB.path });
  },

  setActiveTab: (path) => {
    set({ activeTab: path });
  },

  reorderTabs: (fromIndex, toIndex) => {
    const { tabs } = get();
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, moved);
    set({ tabs: newTabs });
  },

  closeRightTabs: (path) => {
    const { tabs } = get();
    const index = tabs.findIndex((t) => t.path === path);
    if (index === -1) return;
    const keep = tabs.filter((_, i) => i <= index || !tabs[i].closable);
    set({ tabs: keep, activeTab: path });
  },
}));

/** 根据路由路径获取标签标题（始终使用当前语言翻译） */
export const getTabTitle = (path: string): string => {
  const key = PATH_TITLE_MAP[path];
  if (key) return i18n.t(key);
  // fallback: 路径末尾作为标题
  const fallback = path.split('/').pop() || '未知页面';
  return fallback;
};

export default useTabStore;
