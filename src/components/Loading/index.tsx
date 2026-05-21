/**
 * ★★★ Loading 组件封装（方案一 + 方案二）★★★
 *
 * 方案一：全屏 Loading - 用于页面级别或全局请求
 * 方案二：局部 Loading - 用于按钮、卡片等局部区域
 *
 * 本组件是 Ant Design Spin 组件的封装，提供更便捷的用法
 */

import { Spin } from 'antd';
import type { SpinProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';

/** Loading 组件属性 */
interface LoadingProps extends SpinProps {
  /** 是否为全屏模式 */
  fullscreen?: boolean;

  /** 是否显示 loading */
  loading?: boolean;

  /** 提示文字 */
  tip?: string;
}

/**
 * 方案一：全屏 Loading
 * 通常用于页面初始化、登录验证等场景
 */
function FullscreenLoading({ tip }: { tip?: string }) {
  const { t } = useTranslation();
  const resolvedTip = tip ?? t('loading.text');
  return (
    <div className={styles.fullscreen}>
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
        tip={resolvedTip}
        size="large"
      >
        <div className={styles.content} />
      </Spin>
    </div>
  );
}

/**
 * 方案二：局部 Loading
 * 用于按钮、卡片、Table 等局部区域的加载状态
 *
 * 使用示例：
 * ```tsx
 * <Loading loading={isLoading} tip="处理中...">
 *   <YourComponent />
 * </Loading>
 * ```
 */
function WrappedLoading({ loading = false, tip, children, ...spinProps }: LoadingProps) {
  const { t } = useTranslation();
  const resolvedTip = tip ?? t('loading.text');
  return (
    <Spin
      indicator={<LoadingOutlined spin />}
      tip={resolvedTip}
      spinning={loading}
      {...spinProps}
    >
      {children}
    </Spin>
  );
}

/**
 * 统一导出
 *
 * 使用方式：
 * ```tsx
 * import Loading from '@/components/Loading'
 *
 * // 全屏加载
 * <Loading.Fullscreen tip="登录中..." />
 *
 * // 局部加载
 * <Loading spinning={isLoading} tip="处理中...">
 *   <Content />
 * </Loading>
 * ```
 */
const Loading = WrappedLoading as typeof WrappedLoading & {
  Fullscreen: typeof FullscreenLoading;
};
Loading.Fullscreen = FullscreenLoading;

export default Loading;
