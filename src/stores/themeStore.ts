/**
 * ★★★ 主题状态管理 (Zustand) ★★★
 *
 * 管理深色/浅色模式切换
 * 支持 localStorage 持久化
 */

import { create } from 'zustand';
import storage, { STORAGE_KEYS } from '@/utils/storage';

/** 主题类型 */
export type ThemeMode = 'light' | 'dark';

/** 主题状态接口 */
interface ThemeState {
  /** 当前主题模式 */
  themeMode: ThemeMode;

  /** 切换主题 */
  toggleTheme: () => void;

  /** 设置指定主题 */
  setTheme: (mode: ThemeMode) => void;
}

/** 从 localStorage 获取保存的主题（默认浅色） */
const getSavedTheme = (): ThemeMode => {
  const saved = storage.get<ThemeMode>(STORAGE_KEYS.THEME_MODE);
  return saved === 'dark' ? 'dark' : 'light';
};

/**
 * 创建主题状态管理
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
  // 初始状态：从 localStorage 读取
  themeMode: getSavedTheme(),

  /**
   * 切换深色/浅色模式
   */
  toggleTheme: () => {
    const newMode = get().themeMode === 'light' ? 'dark' : 'light';
    storage.set(STORAGE_KEYS.THEME_MODE, newMode);
    set({ themeMode: newMode });

    // 更新 Ant Design ConfigProvider 的 theme 属性
    // 需要在 App.tsx 中使用 useThemeStore 监听变化
    document.documentElement.setAttribute('data-theme', newMode);
  },

  /**
   * 设置指定主题模式
   */
  setTheme: (mode: ThemeMode) => {
    storage.set(STORAGE_KEYS.THEME_MODE, mode);
    set({ themeMode: mode });
    document.documentElement.setAttribute('data-theme', mode);
  },
}));

/**
 * 初始化时设置 HTML 属性（防止闪烁）
 */
if (typeof document !== 'undefined') {
  const savedTheme = getSavedTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);
}
