/**
 * ★★★ TabBar - 多标签页导航栏 ★★★
 *
 * 功能：
 * 1. 浏览器风格标签切换
 * 2. X 按钮关闭标签
 * 3. 右键菜单（关闭其他/关闭右侧/关闭全部）
 * 4. 拖拽排序
 *
 * ★★★ 核心设计：纯单向同步 ★★★
 * - 点击标签 → navigate → 路由变化 → 自动 openTab
 * - 关闭标签 → closeTab + navigate 同时执行
 * - 绝不从 store 的变化反向影响路由（防止循环）
 */

import { useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTabStore, getTabTitle } from '@/stores/tabStore';
import styles from './index.module.css';

/**
 * TabBar 组件
 */
const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const tabs = useTabStore((s) => s.tabs);
  const activeTab = useTabStore((s) => s.activeTab);
  const tabsRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef('');

  // ★★★ 唯一副作用：路由变化 → 同步到 TabStore ★★★
  // 来源：① 侧边栏菜单点击 ② URL 直接输入 ③ TabBar 标签点击 ④ 刷新
  useEffect(() => {
    const path = location.pathname;
    if (path === '/login' || path === '/screen') return;
    // 路径没变且不是首次 → 跳过
    if (prevPathRef.current === path) return;
    prevPathRef.current = path;

    // 同步到 store
    const store = useTabStore.getState();
    const exists = store.tabs.find((t) => t.path === path);
    if (!exists) {
      store.openTab({
        path,
        title: getTabTitle(path),
        closable: path !== '/dashboard',
      });
    } else if (store.activeTab !== path) {
      store.setActiveTab(path);
    }
  }, [location.pathname]);

  // 点击标签 → navigate 即可，路由变化会自动同步
  const handleTabClick = useCallback((path: string) => {
    if (path !== location.pathname) {
      navigate(path);
    }
  }, [navigate, location.pathname]);

  // 关闭标签：同时关闭 store 中的标签 + 导航到新的 activeTab
  const handleCloseTab = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      const store = useTabStore.getState();
      // 先计算关闭后的新 activeTab，手动导航
      const idx = store.tabs.findIndex((t) => t.path === path);
      if (idx === -1 || !store.tabs[idx].closable) return;

      // 如果是当前激活的标签被关闭，需要导航到前一个/后一个标签
      const isActive = store.activeTab === path;
      if (isActive) {
        const newTabs = store.tabs.filter((t) => t.path !== path);
        if (newTabs.length > 0) {
          const newIdx = Math.min(idx, newTabs.length - 1);
          const newPath = newTabs[newIdx].path;
          store.closeTab(path);
          navigate(newPath);
          return;
        }
      }
      store.closeTab(path);
    },
    [navigate]
  );

  // 右键菜单操作：关闭其他/右侧/全部
  const handleCloseOther = useCallback((path: string) => {
    useTabStore.getState().closeOtherTabs(path);
  }, []);

  const handleCloseRight = useCallback((path: string) => {
    useTabStore.getState().closeRightTabs(path);
  }, []);

  const handleCloseAll = useCallback(() => {
    useTabStore.getState().closeAllTabs();
    navigate('/dashboard');
    message.success(t('tabBar.closedAll'));
  }, [navigate]);

  // 拖拽排序
  const dragIndex = useRef<number>(-1);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (dragIndex.current !== -1 && dragIndex.current !== toIndex) {
        useTabStore.getState().reorderTabs(dragIndex.current, toIndex);
      }
      dragIndex.current = -1;
    },
    []
  );

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabsContainer} ref={tabsRef}>
        {tabs.map((tab, index) => {
          const menuItems: MenuProps['items'] = [
            { key: 'closeOther', label: t('tabBar.closeOther'), onClick: () => handleCloseOther(tab.path) },
            { key: 'closeRight', label: t('tabBar.closeRight'), onClick: () => handleCloseRight(tab.path) },
            { type: 'divider' },
            { key: 'closeAll', label: t('tabBar.closeAll'), danger: true, onClick: handleCloseAll },
          ];

          const tabEl = (
            <div
              className={`${styles.tab} ${activeTab === tab.path ? styles.active : ''}`}
              onClick={() => handleTabClick(tab.path)}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              title={getTabTitle(tab.path)}
            >
              <span className={styles.tabTitle}>{getTabTitle(tab.path)}</span>
              {tab.closable && (
                <span
                  className={styles.tabClose}
                  onClick={(e) => handleCloseTab(e, tab.path)}
                >
                  <CloseOutlined style={{ fontSize: 10 }} />
                </span>
              )}
            </div>
          );

          return (
            <Dropdown key={tab.path} menu={{ items: menuItems }} trigger={['contextMenu']}>
              {tabEl}
            </Dropdown>
          );
        })}
      </div>
    </div>
  );
};

export default TabBar;
