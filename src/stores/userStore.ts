/**
 * ★★★ 用户状态管理 (Zustand) ★★★
 *
 * 使用 Zustand 替代 Redux，更简洁、类型安全
 *
 * 为什么选择 Zustand？
 * 1. 无 Provider 包裹，直接使用
 * 2. TypeScript 支持优秀
 * 3. 体积小（不到 1KB）
 * 4. API 简洁，学习成本低
 */

import { create } from 'zustand';
import type { UserInfo, MenuItem } from '@/types/api';
import type { AuthStatus } from '@/types/user';
import { userApi } from '@/api';
import storage, { STORAGE_KEYS } from '@/utils/storage';
import { getFilteredMenuTree, getPermStrings } from '@/rbac-data';
import { shouldEnableMock } from '@/mock';

/** 用户状态接口 */
interface UserState {
  /** 用户信息 */
  userInfo: UserInfo | null;

  /** 登录状态 */
  authStatus: AuthStatus;

  /** 菜单列表（已按权限过滤） */
  menuList: MenuItem[];

  /** 当前用户的权限标识列表（如 ["system:user:list", "system:user:add"]） */
  perms: string[];

  /** 登录操作 */
  login: (username: string, password: string) => Promise<boolean>;

  /** 退出登录 */
  logout: () => void;

  /** 获取用户信息 */
  fetchUserInfo: () => Promise<void>;

  /** 设置菜单列表 */
  setMenuList: (menus: MenuItem[]) => void;

  /** 重新加载权限（角色/菜单变更后调用） */
  reloadPerms: () => void;

  /** 检查是否有指定权限 */
  hasPerm: (perm: string) => boolean;
}

// ★★★ 从 localStorage 恢复并计算初始权限（模块级，Zustand create 外层）★★★
const savedUserInfo = storage.get<UserInfo>(STORAGE_KEYS.USER_INFO);
const hasToken = !!storage.get(STORAGE_KEYS.TOKEN);

let initMenuList: MenuItem[] = [];
let initPerms: string[] = [];
if (savedUserInfo && hasToken) {
  const rn = savedUserInfo.nickname === '管理员' ? '超级管理员' : '运营主管';
  initMenuList = getFilteredMenuTree(rn);
  initPerms = getPermStrings(rn);
}

/**
 * 创建 Zustand Store
 */
export const useUserStore = create<UserState>((set, get) => ({
  // ==================== 初始状态 ====================

  userInfo: savedUserInfo,
  authStatus: hasToken ? 'authenticated' : 'unauthenticated',
  menuList: initMenuList,
  perms: initPerms,

  // ==================== 操作方法 ====================

  /**
   * 用户登录
   * 优先尝试本地 Mock 验证（确保生产预览也能登录）
   */
  login: async (username: string, password: string) => {
    try {
      set({ authStatus: 'loading' });

      // ★★★ Mock 模式：本地验证，不依赖网络请求 ★★★
      if (shouldEnableMock()) {
        if (username === 'admin' && password === 'admin123') {
          const mockToken = 'mock_token_mumu_freight_admin_' + Date.now();
          const mockUserInfo: UserInfo = {
            id: 1,
            username: 'admin',
            nickname: '管理员',
            avatar: '',
            email: 'admin@mumu.com',
            phone: '13800138000',
            role: 'admin',
            status: 1,
            createTime: '2024-01-01 00:00:00',
          };
          storage.set(STORAGE_KEYS.TOKEN, mockToken);
          storage.set(STORAGE_KEYS.USER_INFO, mockUserInfo);

          const roleName = '超级管理员';
          const filteredMenus = getFilteredMenuTree(roleName);
          const perms = getPermStrings(roleName);

          set({
            userInfo: mockUserInfo,
            authStatus: 'authenticated',
            menuList: filteredMenus,
            perms,
          });
          return true;
        }
        set({ authStatus: 'unauthenticated' });
        return false;
      }

      // ★★★ 非 Mock 模式：调用真实 API ★★★
      const res = await userApi.login({ username, password });

      if (res.code === 200) {
        storage.set(STORAGE_KEYS.TOKEN, res.data.token);
        storage.set(STORAGE_KEYS.USER_INFO, res.data.userInfo);

        // 根据用户角色计算权限
        const roleName = res.data.userInfo.nickname === '管理员' ? '超级管理员' : '运营主管';
        const filteredMenus = getFilteredMenuTree(roleName);
        const perms = getPermStrings(roleName);

        set({
          userInfo: res.data.userInfo,
          authStatus: 'authenticated',
          menuList: filteredMenus,
          perms,
        });

        return true;
      }

      set({ authStatus: 'unauthenticated' });
      return false;
    } catch {
      set({ authStatus: 'unauthenticated' });
      return false;
    }
  },

  /**
   * 退出登录
   */
  logout: () => {
    storage.remove(STORAGE_KEYS.TOKEN);
    storage.remove(STORAGE_KEYS.USER_INFO);

    set({
      userInfo: null,
      authStatus: 'unauthenticated',
      menuList: [],
      perms: [],
    });
  },

  /**
   * 获取用户信息
   */
  fetchUserInfo: async () => {
    try {
      const res = await userApi.getUserInfo();
      if (res.code === 200) {
        storage.set(STORAGE_KEYS.USER_INFO, res.data);
        set({ userInfo: res.data });
      }
    } catch {
      console.error('获取用户信息失败');
    }
  },

  /**
   * 设置菜单列表
   */
  setMenuList: (menus: MenuItem[]) => {
    set({ menuList: menus });
  },

  /**
   * 重新加载权限（菜单/角色变更后从 rbac-data 刷新）
   */
  reloadPerms: () => {
    const { userInfo } = get();
    if (!userInfo) return;
    const roleName = userInfo.nickname === '管理员' ? '超级管理员' : '运营主管';
    const filteredMenus = getFilteredMenuTree(roleName);
    const perms = getPermStrings(roleName);
    set({ menuList: filteredMenus, perms });
  },

  /**
   * 检查是否有指定权限
   */
  hasPerm: (perm: string) => {
    return get().perms.includes(perm);
  },
}));
