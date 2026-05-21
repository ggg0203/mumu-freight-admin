/**
 * ★★★ localStorage 封装工具 ★★★
 *
 * 为什么需要封装？
 * 1. 统一管理存储键名，避免硬编码
 * 2. 自动 JSON 序列化/反序列化
 * 3. 提供类型安全的存取方法
 * 4. 便于后续扩展（如加密存储）
 */

/** 存储键名常量 - 统一管理，避免魔法字符串 */
export const STORAGE_KEYS = {
  TOKEN: 'mumu_token',
  USER_INFO: 'mumu_user_info',
  THEME: 'mumu_theme',
  THEME_MODE: 'mumu_theme_mode',
  NOTIFICATIONS: 'mumu_notifications',
  SHARED_DATA: 'mumu_shared_data',
} as const;

/**
 * localStorage 封装类
 * 提供类型安全的存取方法
 */
class StorageUtil {
  /**
   * 存储数据（自动转为 JSON 字符串）
   * @param key 存储键名
   * @param value 要存储的值
   */
  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('存储数据失败:', error);
    }
  }

  /**
   * 获取数据（自动解析 JSON）
   * @param key 存储键名
   * @returns 解析后的数据，不存在则返回 null
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error('读取数据失败:', error);
      return null;
    }
  }

  /**
   * 删除指定数据
   * @param key 存储键名
   */
  remove(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * 清空所有数据（谨慎使用）
   */
  clear(): void {
    localStorage.clear();
  }
}

/** 全局单例 */
const storage = new StorageUtil();
export default storage;
