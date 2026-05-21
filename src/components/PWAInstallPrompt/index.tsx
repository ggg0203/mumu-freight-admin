/**
 * ★★★ PWAInstallPrompt - PWA 安装提示组件 ★★★
 *
 * 检测浏览器是否支持 PWA 安装，
 * 如果支持且尚未安装，显示安装横幅提示。
 */

import { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import styles from './index.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 监听 beforeinstallprompt 事件
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    // 监听安装完成事件
    const installedHandler = () => {
      setInstalled(true);
      setShowBanner(false);
      message.success('🎉 应用已安装！');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    // 检查是否已安装（通过 display-mode media query）
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) {
      setInstalled(true);
      setShowBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      message.success('🎉 安装成功！');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner || installed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <DownloadOutlined style={{ fontSize: 18, color: '#1677ff' }} />
        <div className={styles.text}>
          <div className={styles.title}>安装幕幕货运</div>
          <div className={styles.desc}>安装到桌面，体验更快更流畅</div>
        </div>
        <Button type="primary" size="small" onClick={handleInstall} className={styles.installBtn}>
          安装
        </Button>
        <CloseOutlined className={styles.close} onClick={() => setShowBanner(false)} />
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
