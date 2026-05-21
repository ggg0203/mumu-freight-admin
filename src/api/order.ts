/**
 * ★★★ 订单相关 API ★★★
 */

import request from './request';
import type { ApiResponse, OrderInfo, PaginationParams, PaginationResult } from '@/types/api';

/** 订单 API */
const orderApi = {
  /**
   * 获取订单列表
   * @param params 分页和筛选参数
   */
  getOrderList(
    params: PaginationParams & { status?: string; keyword?: string },
  ): Promise<ApiResponse<PaginationResult<OrderInfo>>> {
    return request.get('/order/list', { params });
  },

  /**
   * 获取订单详情
   * @param id 订单ID
   */
  getOrderDetail(id: number): Promise<ApiResponse<OrderInfo>> {
    return request.get(`/order/detail/${id}`);
  },

  /**
   * 创建订单
   * @param data 订单数据
   */
  createOrder(data: Partial<OrderInfo>): Promise<ApiResponse<OrderInfo>> {
    return request.post('/order/create', data);
  },

  /**
   * 更新订单状态
   * @param id 订单ID
   * @param status 新状态
   */
  updateOrderStatus(id: number, status: string): Promise<ApiResponse<null>> {
    return request.put(`/order/status/${id}`, { status });
  },
};

export default orderApi;
