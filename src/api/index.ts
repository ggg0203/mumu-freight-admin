/**
 * ★★★ API 模块统一导出 ★★★
 *
 * 所有 API 模块从这里导出，使用时统一导入：
 * import { userApi, orderApi } from '@/api'
 */

export { default as userApi } from './user';
export { default as orderApi } from './order';
export { default as dashboardApi } from './dashboard';
export { default as driverApi } from './driver';
export { default as courseApi } from './course';
export { default as auditLogApi } from './auditLog';
