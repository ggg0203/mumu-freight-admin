/**
 * ★★★ 登录页面 ★★★
 *
 * 学习要点：
 * 1. Ant Design Form 表单使用
 * 2. CSS Modules 样式隔离
 * 3. 自定义主题色
 * 4. 表单验证
 * 5. 局部 Loading 和错误处理
 * 6. declare 声明语法（.d.ts 文件）
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, App, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import type { FormProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/userStore';
import styles from './index.module.css';

/** 登录表单字段类型 */
interface LoginFormValues {
  username: string;
  password: string;
}

/**
 * Login 组件
 * 实现用户登录功能
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, authStatus } = useUserStore();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { t } = useTranslation();

  /** ★★★ 局部 Loading 状态 ★★★
   * 两个方案：
   * 方案一：使用 useUserStore 中的 authStatus
   * 方案二：使用组件内的局部状态
   */
  const [loading, setLoading] = useState(false);

  /** ★★★ 局部错误状态 ★★★ */
  const [errorMsg, setErrorMsg] = useState('');

  /** ★★★ 如果已经登录，直接跳转到首页 ★★★ */
  if (authStatus === 'authenticated') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  /** ★★★ 表单提交处理 ★★★ */
  const onFinish: FormProps<LoginFormValues>['onFinish'] = async (values) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const success = await login(values.username, values.password);

      if (success) {
        message.success(t('login.success'));
        navigate('/dashboard', { replace: true });
      } else {
        // ★★★ 登录失败的错误处理 ★★★
        setErrorMsg(t('login.error'));
        message.error(t('login.error'));
      }
    } catch {
      setErrorMsg(t('login.failed'));
      message.error(t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.container}
      style={{
        // ★★★ 使用 Ant Design Token 实现主题跟随 ★★★
        background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
      }}
    >
      {/* ★★★ 登录卡片 ★★★ */}
      <div className={styles.card}>
        {/* Logo 区域 */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🚚</span>
          </div>
          <h2 className={styles.title}>{t('app.title')}</h2>
          <p className={styles.subtitle}>{t('login.welcomeBack')}</p>
        </div>

        {/* ★★★ 局部错误提示 ★★★ */}
        {errorMsg && (
          <div className={styles.errorAlert}>
            {errorMsg}
          </div>
        )}

        {/* ★★★ 登录表单 ★★★ */}
        <Form
          name="login"
          initialValues={{ username: 'admin', password: 'admin123' }}
          onFinish={onFinish}
          size="large"
          autoComplete="off"
        >
          {/* 用户名输入框 */}
          <Form.Item
            name="username"
            rules={[
              { required: true, message: t('login.usernameRequired') },
              { min: 2, message: t('login.usernameMinLength') },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('login.usernamePlaceholder')}
              className={styles.input}
            />
          </Form.Item>

          {/* 密码输入框 */}
          <Form.Item
            name="password"
            rules={[
              { required: true, message: t('login.passwordRequired') },
              { min: 6, message: t('login.passwordMinLength') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('login.passwordPlaceholder')}
              className={styles.input}
            />
          </Form.Item>

          {/* 登录按钮 */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className={styles.loginButton}
            >
              {loading ? t('common.loading') : t('login.loginBtn')}
            </Button>
          </Form.Item>
        </Form>

        {/* 底部提示 */}
        <div className={styles.footer}>
          <span>{t('app.defaultAccount')}</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
