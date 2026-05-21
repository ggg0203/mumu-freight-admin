/**
 * ★★★ Axios 实例封装 ★★★
 *
 * 核心功能：
 * 1. 创建统一的 Axios 实例
 * 2. 请求拦截器：自动携带 Token
 * 3. 响应拦截器：统一错误处理、Token 过期自动跳转登录
 * 4. 请求/响应类型安全
 */

import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import storage, { STORAGE_KEYS } from '@/utils/storage';
import { buildEnv } from '@/utils/env';

// ==================== 创建 Axios 实例 ====================

const request = axios.create({
  // ★★★ 基础地址：开发环境通过 Vite 代理，生产环境使用实际地址 ★★★
  baseURL: buildEnv.API_BASE_URL,

  // ★★★ 请求超时时间：15秒 ★★★
  timeout: 15000,

  // ★★★ 请求头设置 ★★★
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
});

// ==================== 请求拦截器 ====================

/**
 * 请求拦截器：在发送请求前自动附加 Token
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 获取 Token
    const token = storage.get<string>(STORAGE_KEYS.TOKEN);

    // 如果存在 Token，自动添加到请求头
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// ==================== 响应拦截器 ====================

/**
 * 响应拦截器：统一处理响应数据和错误
 */
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // ★★★ 直接返回 response.data，减少解构层次 ★★★
    // 这样调用时可以直接使用：const data = await request.get('/api/user')
    return response.data;
  },

  /**
   * 错误处理中心
   * 根据 HTTP 状态码进行不同的错误提示
   */
  (error: AxiosError<{ message?: string }>) => {
    // 没有响应的情况（网络错误、超时等）
    if (!error.response) {
      message.error('网络异常，请检查网络连接');
      return Promise.reject(error);
    }

    const { status } = error.response;

    switch (status) {
      case 401:
        // ★★★ Token 过期或未登录 → 清除登录信息 → 跳转登录页 ★★★
        storage.remove(STORAGE_KEYS.TOKEN);
        storage.remove(STORAGE_KEYS.USER_INFO);
        message.error('登录已过期，请重新登录');
        // 跳转到登录页 (使用 window.location 确保强制跳转)
        window.location.href = '/login';
        break;

      case 403:
        message.error('没有权限访问该资源');
        break;

      case 404:
        message.error('请求的资源不存在');
        break;

      case 500:
        message.error('服务器错误，请联系管理员');
        break;

      default:
        // 显示后端返回的错误信息，或使用默认信息
        message.error(error.response.data?.message || `请求失败(${status})`);
    }

    return Promise.reject(error);
  },
);

export default request;
