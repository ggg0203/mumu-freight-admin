/**
 * ★★★ 用户相关的类型定义 ★★★
 * 从 api.ts 中 re-export 用户相关类型，便于按模块引入
 */

import type { UserInfo, MenuItem } from './api';

export type { UserInfo, MenuItem };

/**
 * 用户状态 - 登录/未登录/登录中
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';
