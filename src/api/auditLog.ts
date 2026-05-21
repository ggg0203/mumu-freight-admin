/**
 * ★★★ 审计日志相关 API ★★★
 */
import request from './request';
import type { ApiResponse } from '@/types/api';

const auditLogApi = {
  /** 获取审计日志列表 */
  getLogList(params: {
    page?: number; pageSize?: number; module?: string;
    action?: string; operator?: string; keyword?: string;
  }): Promise<ApiResponse<{ list: any[]; total: number; page: number; pageSize: number }>> {
    return request.get('/audit-log/list', { params });
  },
};

export default auditLogApi;
