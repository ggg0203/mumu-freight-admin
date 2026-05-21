/**
 * ★★★ 操作审计日志 Store ★★★
 *
 * 集中管理所有操作日志
 * 各页面在增删改操作后调用 pushLog 记录
 *
 * ★★★ 初始数据锁定 ★★★
 * - Mock 数据只在模块首次加载时生成一次（模块级缓存）
 * - 后续刷新不重新生成，只保留缓存 + 实际操作的记录
 */

import { create } from 'zustand';

/** 操作类型 */
export type AuditAction = 'create' | 'update' | 'delete';

/** 审计日志条目 */
export interface AuditLogEntry {
  id: number;
  /** 操作时间 */
  time: string;
  /** 操作人 */
  operator: string;
  /** 操作模块 */
  module: string;
  /** 操作类型 */
  action: AuditAction;
  /** 操作对象 */
  target: string;
  /** 变更详情 */
  detail: string;
  /** IP 地址 */
  ip: string;
  /** 操作结果 */
  result: 'success' | 'fail';
}

interface AuditLogStore {
  logs: AuditLogEntry[];
  /** 添加一条日志 */
  pushLog: (entry: Omit<AuditLogEntry, 'id' | 'time'>) => void;
  /** 批量添加日志 */
  setLogs: (logs: AuditLogEntry[]) => void;
}

let logIdCounter = 100;
const getNextId = () => ++logIdCounter;

// ==================== ★★★ 模块级缓存：只生成一次 ★★★ ====================

let cachedLogs: AuditLogEntry[] | null = null;

/** 生成一次固定 Mock 数据，后续刷新不再随机 */
const getInitialLogs = (): AuditLogEntry[] => {
  if (cachedLogs) return cachedLogs;

  const logs: AuditLogEntry[] = [];
  const baseTime = Date.parse('2026-05-06T08:00:00');

  const entries: Omit<AuditLogEntry, 'id'>[] = [
    { time: '2026-05-06 09:00:00', operator: '管理员', module: '订单管理', action: 'create', target: '订单 MUMU20240506001', detail: '新增订单，客户：张三，发货地：北京→上海，金额：¥12,500', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 09:15:00', operator: '管理员', module: '订单管理', action: 'update', target: '订单 MUMU20240506001', detail: '修改订单状态：待处理 → 运输中', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 09:30:00', operator: '张三', module: '用户管理', action: 'create', target: '用户 test003', detail: '新增用户 test003（运营专员）', ip: '192.168.1.101', result: 'success' },
    { time: '2026-05-06 09:45:00', operator: '管理员', module: '角色管理', action: 'update', target: '角色 运营主管', detail: '修改角色权限：新增 订单管理 权限', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 10:00:00', operator: '张三', module: '订单管理', action: 'create', target: '订单 MUMU20240506002', detail: '新增订单，客户：李四，深圳→广州，金额：¥8,900', ip: '192.168.1.101', result: 'success' },
    { time: '2026-05-06 10:20:00', operator: '李四', module: '订单管理', action: 'update', target: '订单 MUMU20240506002', detail: '分配司机 王大力 到订单', ip: '192.168.1.102', result: 'success' },
    { time: '2026-05-06 10:40:00', operator: '管理员', module: '部门管理', action: 'create', target: '部门 技术研发部', detail: '新增部门：技术研发部，部门主管：王五', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 11:00:00', operator: '管理员', module: '菜单管理', action: 'create', target: '菜单 数据统计', detail: '新增菜单 数据统计（父菜单：系统管理）', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 11:30:00', operator: '张三', module: '订单管理', action: 'update', target: '订单 MUMU20240506001', detail: '修改订单金额：¥12,500 → ¥13,800', ip: '192.168.1.101', result: 'success' },
    { time: '2026-05-06 13:00:00', operator: '管理员', module: '订单管理', action: 'delete', target: '订单 MUMU20240506003', detail: '删除订单 MUMU20240506003（用户取消）', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 13:30:00', operator: '李四', module: '司机管理', action: 'create', target: '司机 赵六', detail: '新增司机：赵六，车牌号：京A·88888，车型：厢式货车', ip: '192.168.1.102', result: 'success' },
    { time: '2026-05-06 14:00:00', operator: '管理员', module: '订单管理', action: 'update', target: '订单 MUMU20240506004', detail: '修改订单状态：运输中 → 已完成', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 14:30:00', operator: '张三', module: '部门管理', action: 'update', target: '部门 市场部', detail: '修改部门信息：市场部负责人 赵某 → 钱某', ip: '192.168.1.101', result: 'success' },
    { time: '2026-05-06 15:00:00', operator: '管理员', module: '角色管理', action: 'update', target: '角色 客服人员', detail: '修改角色权限：新增 订单查看 权限', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 15:30:00', operator: '李四', module: '用户管理', action: 'update', target: '用户 test001', detail: '修改用户信息：姓名 张三 → 张四', ip: '192.168.1.102', result: 'success' },
    { time: '2026-05-06 16:00:00', operator: '管理员', module: '订单管理', action: 'create', target: '订单 MUMU20240506005', detail: '新增订单，客户：王五，杭州→南京，金额：¥6,500', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-06 16:30:00', operator: '管理员', module: '订单管理', action: 'update', target: '订单 MUMU20240506005', detail: '分配司机 刘师傅 到订单', ip: '192.168.1.100', result: 'fail' },
    { time: '2026-05-07 08:00:00', operator: '管理员', module: '订单管理', action: 'update', target: '订单 MUMU20240506002', detail: '修改订单状态：运输中 → 已完成', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-07 08:30:00', operator: '张三', module: '订单管理', action: 'create', target: '订单 MUMU20240507001', detail: '新增订单，客户：赵六，成都→重庆，金额：¥4,200', ip: '192.168.1.101', result: 'success' },
    { time: '2026-05-07 09:00:00', operator: '管理员', module: '菜单管理', action: 'update', target: '菜单 3D货运网络', detail: '修改菜单排序：3D货运网络 从第5位调到第6位', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-07 09:30:00', operator: '李四', module: '用户管理', action: 'delete', target: '用户 test005', detail: '删除用户 test005（已离职）', ip: '192.168.1.102', result: 'success' },
    { time: '2026-05-07 10:00:00', operator: '管理员', module: '部门管理', action: 'delete', target: '部门 市场部', detail: '删除部门 市场部（已解散）', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-07 10:30:00', operator: '管理员', module: '订单管理', action: 'create', target: '订单 MUMU20240507002', detail: '新增订单，客户：孙八，武汉→长沙，金额：¥3,600', ip: '192.168.1.100', result: 'success' },
    { time: '2026-05-07 11:00:00', operator: '张三', module: '订单管理', action: 'update', target: '订单 MUMU20240507002', detail: '分配司机 陈师傅 到订单', ip: '192.168.1.101', result: 'success' },
    { time: '2026-05-07 11:30:00', operator: '管理员', module: '司机管理', action: 'update', target: '司机 王大力', detail: '修改司机信息：联系电话 13912345678 → 13987654321', ip: '192.168.1.100', result: 'success' },
  ];

  // 每条数据用固定 id
  for (const entry of entries) {
    logs.push({ id: getNextId(), ...entry });
  }

  cachedLogs = logs;
  return logs;
};

// ==================== Store ====================

export const useAuditLogStore = create<AuditLogStore>((set, get) => ({
  logs: getInitialLogs(),

  pushLog: (entry) => {
    const { logs } = get();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: getNextId(),
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    set({ logs: [newEntry, ...logs] });
  },

  setLogs: (logs) => set({ logs }),
}));

export default useAuditLogStore;
