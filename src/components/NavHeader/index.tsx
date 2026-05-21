/**
 * ★★★ NavHeader - 页面顶部导航栏 ★★★
 *
 * 功能：
 * 1. 显示系统 Logo 和名称
 * 2. 右侧显示用户头像、昵称
 * 3. 主题切换按钮（深色/浅色模式）
 * 4. 语言切换（中/英文）
 * 5. 退出登录功能
 */

import { useNavigate } from 'react-router-dom';
import { Layout, Dropdown, Avatar, Space, theme, Switch, message, Button } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BulbOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/userStore';
import { useThemeStore } from '@/stores/themeStore';
import NotificationBell from '@/components/NotificationBell';
import RealtimeIndicator from '@/components/RealtimeIndicator';
import styles from './index.module.css';

const { Header } = Layout;

/** 导航头部组件属性 */
interface NavHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * NavHeader 组件
 */
const NavHeader: React.FC<NavHeaderProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const { userInfo, logout } = useUserStore();
  const { themeMode, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleThemeToggle = (checked: boolean) => {
    toggleTheme();
    message.success(checked ? t('nav.themeToDark') : t('nav.themeToLight'));
  };

  /** ★★★ 切换语言 ★★★ */
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    message.success(newLang === 'zh' ? t('nav.switchedToZh') : t('nav.switchedToEn'));
  };

  const dropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('nav.profile'),
      onClick: () => navigate('/settings'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('nav.settings'),
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      className={styles.header}
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div className={styles.left}>
        <div className={styles.trigger} onClick={onToggle}>
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
        <span className={styles.title}>{t('app.title')}</span>
      </div>

      <div className={styles.right}>
        {/* ★★★ 实时连接状态 ★★★ */}
        <RealtimeIndicator />

        {/* ★★★ 通知铃铛 ★★★ */}
        <NotificationBell />

        {/* ★★★ 语言切换 ★★★ */}
        <Button
          type="text"
          icon={<GlobalOutlined />}
          onClick={toggleLanguage}
          style={{ fontSize: 14 }}
        >
          {i18n.language === 'zh' ? t('nav.langEn') : t('nav.langZh')}
        </Button>

        {/* ★★★ 主题切换 ★★★ */}
        <div className={styles.themeToggle}>
          <BulbOutlined
            style={{
              marginRight: 4,
              color: themeMode === 'dark' ? '#ffd700' : '#888',
              fontSize: 14,
            }}
          />
          <Switch
            checked={themeMode === 'dark'}
            onChange={handleThemeToggle}
            checkedChildren="🌙"
            unCheckedChildren="☀️"
            size="small"
          />
        </div>

        <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
          <Space className={styles.userInfo} style={{ cursor: 'pointer' }}>
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ backgroundColor: token.colorPrimary }}
            />
            <span className={styles.nickname}>{userInfo?.nickname ? (userInfo.nickname === '管理员' ? t('nav.nickname') : userInfo.nickname) : t('nav.nickname')}</span>
          </Space>
        </Dropdown>
      </div>
    </Header>
  );
};

export default NavHeader;
