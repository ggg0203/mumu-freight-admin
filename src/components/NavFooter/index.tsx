/**
 * ★★★ NavFooter - 页面底部版权信息 ★★★
 */

import { Layout, theme } from 'antd';
import { useTranslation } from 'react-i18next';

const { Footer } = Layout;

/**
 * NavFooter 组件
 * 显示版权信息和系统版本号
 */
const NavFooter: React.FC = () => {
  const { token } = theme.useToken();
  const { t } = useTranslation();

  return (
    <Footer
      style={{
        textAlign: 'center',
        color: token.colorTextDescription,
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        padding: '12px 24px',
        fontSize: 13,
      }}
    >
      <span>{t('footer.copyright').replace('{year}', String(new Date().getFullYear()))}</span>
      <span style={{ marginLeft: 16 }}>{t('footer.version')}</span>
    </Footer>
  );
};

export default NavFooter;
