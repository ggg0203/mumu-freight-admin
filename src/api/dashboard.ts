/**
 * ★★★ 仪表盘统计相关 API ★★★
 */

import request from './request';
import type { ApiResponse, DashboardStats } from '@/types/api';

const dashboardApi = {
  /**
   * 获取仪表盘统计数据
   */
  getStats(): Promise<ApiResponse<DashboardStats>> {
    return request.get('/dashboard/stats');
  },
};

export default dashboardApi;
