/**
 * ★★★ 课程相关 API ★★★
 */
import request from './request';
import type { ApiResponse } from '@/types/api';

const courseApi = {
  /** 获取课程列表 */
  getCourseList(): Promise<ApiResponse<any[]>> {
    return request.get('/course/list');
  },

  /** 更新学习进度 */
  updateProgress(id: number, progress: number, status: string):
    Promise<ApiResponse<any>> {
    return request.put(`/course/progress/${id}`, { progress, status });
  },
};

export default courseApi;
