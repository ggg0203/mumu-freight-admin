/**
 * ★★★ 格式化工具函数 ★★★
 *
 * 集中管理金额、日期等格式化逻辑，便于统一维护
 */

import dayjs from 'dayjs';
import i18n from '@/i18n';

// ==================== 金额格式化 ====================

/**
 * 方案一：使用 toLocaleString 格式化金额（原生方式，无依赖）
 * @param amount 金额
 * @param currency 货币符号，默认 ¥
 * @returns 格式化后的金额字符串
 *
 * 示例：formatMoney(1234567.89) => "¥1,234,567.89"
 */
export function formatMoney(amount: number, currency: string = '¥'): string {
  // toLocaleString 自动处理千分位分隔
  const formatted = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${formatted}`;
}

/**
 * 方案二：使用正则表达式手动格式化（更灵活）
 * @param amount 金额
 * @returns 格式化后的金额字符串
 *
 * 示例：formatMoneyRegex(1234567.89) => "1,234,567.89"
 */
export function formatMoneyRegex(amount: number): string {
  // 分离整数部分和小数部分
  const [integer, decimal = '00'] = amount.toFixed(2).split('.');
  // 使用正则添加千分位逗号
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formattedInteger}.${decimal}`;
}

// ==================== 日期格式化 ====================

/**
 * 方案一：使用 dayjs 格式化日期（推荐）
 * @param date 日期字符串或 Date 对象
 * @param template 格式化模板，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 *
 * 常用模板：
 * - 'YYYY-MM-DD' => 2024-01-15
 * - 'YYYY-MM-DD HH:mm:ss' => 2024-01-15 14:30:00
 * - 'MM-DD HH:mm' => 01-15 14:30
 */
export function formatDate(date: string | Date, template: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(template);
}

/**
 * 方案二：相对时间格式化（如"3分钟前"）
 * @param date 日期字符串或 Date 对象
 * @returns 相对时间字符串
 *
 * 示例：formatRelative('2024-01-15T14:30:00') => "3小时前"
 */
export function formatRelative(date: string | Date): string {
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');

  if (diffMinutes < 1) return i18n.t('format.justNow');
  if (diffMinutes < 60) return i18n.t('format.minutesAgo').replace('{n}', String(diffMinutes));

  const diffHours = now.diff(target, 'hour');
  if (diffHours < 24) return i18n.t('format.hoursAgo').replace('{n}', String(diffHours));

  const diffDays = now.diff(target, 'day');
  if (diffDays < 30) return i18n.t('format.daysAgo').replace('{n}', String(diffDays));

  const diffMonths = now.diff(target, 'month');
  if (diffMonths < 12) return i18n.t('format.monthsAgo').replace('{n}', String(diffMonths));

  return formatDate(date, 'YYYY-MM-DD');
}

/**
 * 格式化订单状态
 * @param status 订单状态枚举值
 * @returns 中文状态描述
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: i18n.t('format.status_pending'),
    processing: i18n.t('format.status_processing'),
    completed: i18n.t('format.status_completed'),
    cancelled: i18n.t('format.status_cancelled'),
  };
  return statusMap[status] || status;
}

/**
 * 格式化订单状态对应的颜色
 * @param status 订单状态
 * @returns Ant Design Tag 颜色
 */
export function formatOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: 'gold',
    processing: 'blue',
    completed: 'green',
    cancelled: 'default',
  };
  return colorMap[status] || 'default';
}
