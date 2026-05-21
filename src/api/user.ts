/**
 * ★★★ 用户相关 API ★★★
 * 登录、获取用户信息、修改密码等接口
 */

import request from './request';
import type { ApiResponse, LoginParams, LoginResult, UserInfo } from '@/types/api';

/** 用户 API */
const userApi = {
  /**
   * 用户登录
   * @param params 登录参数（用户名、密码）
   * @returns Promise<LoginResult> 包含 token 和用户信息
   */
  login(params: LoginParams): Promise<ApiResponse<LoginResult>> {
    return request.post('/user/login', params);
  },

  /**
   * 获取当前用户信息
   * @returns Promise<UserInfo> 用户详细信息
   */
  getUserInfo(): Promise<ApiResponse<UserInfo>> {
    return request.get('/user/info');
  },

  /**
   * 退出登录
   */
  logout(): Promise<ApiResponse<null>> {
    return request.post('/user/logout');
  },

  /**
   * 获取用户列表（管理员用）
   * @param params 分页参数
   */
  getUserList(params: { page: number; pageSize: number }) {
    return request.get('/user/list', { params });
  },
};

export default userApi;
