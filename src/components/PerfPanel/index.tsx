/**
 * ★★★ PerfPanel - 性能监控悬浮面板 ★★★
 *
 * 固定在页面右下角的悬浮按钮，
 * 点击展开显示 FPS / 内存 / DOM 节点数 / API 耗时瀑布图。
 *
 * 答辩亮点：
 * - 展示前端性能优化意识
 * - 可直接演示地图页面 FPS 表现
 * - 颜色编码：绿色→正常 黄色→警告 红色→严重
 */

import { useState, useEffect } from 'react';
import { Tooltip } from 'antd';
import { DashboardOutlined, CloseOutlined } from '@ant-design/icons';
import { usePerfMonitor } from '@/hooks/usePerfMonitor';
import type { ApiTiming } from '@/hooks/usePerfMonitor';
import styles from './index.module.css';

/** 根据 FPS 返回颜色等级 */
const fpsGrade = (fps: number) => {
  if (fps >= 55) return styles.good;
  if (fps >= 30) return styles.warn;
  return styles.bad;
};

const PerfPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { fps, memoryMB, domCount, apiTimings } = usePerfMonitor();

  /** 鼠标抬起或移出面板时自动关闭 */
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    // 延迟关闭，让点击面板内部操作不被打断
    const timer = setTimeout(() => {
      window.addEventListener('click', close);
    }, 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', close);
    };
  }, [open]);

  return (
    <>
      {/* 悬浮按钮 */}
      <Tooltip title="性能监控" placement="left">
        <div
          className={styles.floatingBtn}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        >
          <DashboardOutlined />
        </div>
      </Tooltip>

      {/* 展开面板 */}
      {open && (
        <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <span>⚡ 性能监控</span>
            <span className={styles.closeBtn} onClick={() => setOpen(false)}>
              <CloseOutlined />
            </span>
          </div>

          {/* 三大指标 */}
          <div className={styles.metrics}>
            <div className={styles.metricCard}>
              <div className={`${styles.metricValue} ${fpsGrade(fps)}`}>{fps}</div>
              <div className={styles.metricLabel}>FPS</div>
            </div>
            <div className={styles.metricCard}>
              <div className={`${styles.metricValue} ${memoryMB > 200 ? styles.warn : styles.good}`}>
                {memoryMB}
              </div>
              <div className={styles.metricLabel}>内存 MB</div>
            </div>
            <div className={styles.metricCard}>
              <div className={`${styles.metricValue} ${domCount > 5000 ? styles.warn : styles.good}`}>
                {(domCount / 1000).toFixed(1)}k
              </div>
              <div className={styles.metricLabel}>DOM 节点</div>
            </div>
          </div>

          {/* API 耗时瀑布 */}
          {apiTimings.length > 0 && (
            <div className={styles.apiSection}>
              <div className={styles.apiTitle}>最近 API 请求 ↩</div>
              <div className={styles.apiList}>
                {apiTimings.slice(0, 10).map((api, i) => (
                  <div key={i} className={styles.apiItem}>
                    <div
                      className={styles.apiBar}
                      style={{
                        width: `${Math.min(api.duration / 3, 60)}px`,
                        background: api.duration > 1000 ? '#ff4d4f'
                                  : api.duration > 500 ? '#faad14'
                                  : '#52c41a',
                      }}
                    />
                    <span className={styles.apiUrl}>{api.url.split('?')[0]}</span>
                    <span className={styles.apiTime}>{api.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {apiTimings.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb', padding: '8px 0' }}>
              等待 API 请求...
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PerfPanel;
