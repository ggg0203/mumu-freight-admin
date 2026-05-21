/**
 * ★★★ 司机相关 API ★★★
 */
import request from './request';
import type { ApiResponse } from '@/types/api';

const driverApi = {
  /** 获取司机列表 */
  getDriverList(params?: {
    name?: string; phone?: string; city?: string; status?: string;
  }): Promise<ApiResponse<any[]>> {
    return request.get('/driver/list', { params });
  },

  /** 获取司机详情 */
  getDriverDetail(id: number): Promise<ApiResponse<any>> {
    return request.get(`/driver/detail/${id}`);
  },

  /** 更新司机状态 */
  updateDriverStatus(id: number, status: string): Promise<ApiResponse<null>> {
    return request.put(`/driver/status/${id}`, { status });
  },
};

export default driverApi;
