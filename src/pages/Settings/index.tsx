/**
 * ★★★ 系统设置页面 ★★★
 *
 * 功能：
 * 1. 个人信息编辑
 * 2. 密码修改
 * 3. 系统配置（Switch 状态持久化）
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tabs, Form, Input, Button, Switch, Space, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import styles from './index.module.css';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [switchStates, setSwitchStates] = useState({
    notification: true,
    email: false,
    sms: true,
  });

  /** 个人信息表单提交 */
  const handleProfileSubmit = (values: { nickname: string; email: string; phone: string }) => {
    message.success(t('settings.profileUpdateSuccess', { nickname: values.nickname, email: values.email, phone: values.phone }));
  };

  /** 密码修改提交 */
  const handlePasswordSubmit = () => {
    message.success(t('settings.passwordChangeSuccess'));
  };

  /** Tab 项配置 */
  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined /> {t('settings.personalInfo')}
        </span>
      ),
      children: (
        <div style={{ maxWidth: 480 }}>
          <Form
            layout="vertical"
            initialValues={{ nickname: '管理员', email: 'admin@mumu.com', phone: '13800138000' }}
            onFinish={handleProfileSubmit}
          >
            <Form.Item label={t('settings.username')} name="username" initialValue="admin">
              <Input disabled />
            </Form.Item>
            <Form.Item
              label={t('settings.nickname')}
              name="nickname"
              rules={[{ required: true, message: t('settings.inputNickname') }]}
            >
              <Input placeholder={t('settings.inputNickname')} />
            </Form.Item>
            <Form.Item
              label={t('settings.email')}
              name="email"
              rules={[{ type: 'email', message: t('settings.invalidEmail') }]}
            >
              <Input placeholder={t('settings.inputEmail')} />
            </Form.Item>
            <Form.Item label={t('settings.phone')} name="phone">
              <Input placeholder={t('settings.inputPhone')} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {t('settings.saveChanges')}
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined /> {t('settings.securitySettings')}
        </span>
      ),
      children: (
        <div style={{ maxWidth: 480 }}>
          <Form layout="vertical" onFinish={handlePasswordSubmit}>
            <Form.Item
              label={t('settings.currentPassword')}
              name="oldPassword"
              rules={[{ required: true, message: t('settings.inputCurrentPassword') }]}
            >
              <Input.Password placeholder={t('settings.inputCurrentPassword')} />
            </Form.Item>
            <Form.Item
              label={t('settings.newPassword')}
              name="newPassword"
              rules={[
                { required: true, message: t('settings.inputNewPassword') },
                { min: 6, message: t('settings.passwordMinLength') },
              ]}
            >
              <Input.Password placeholder={t('settings.inputNewPassword')} />
            </Form.Item>
            <Form.Item
              label={t('settings.confirmPassword')}
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: t('settings.inputConfirmPassword') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('settings.passwordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password placeholder={t('settings.inputConfirmPasswordPlaceholder')} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {t('settings.changePassword')}
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined /> {t('settings.systemConfig')}
        </span>
      ),
      children: (
        <div style={{ maxWidth: 480 }}>
          <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{t('settings.notificationTitle')}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{t('settings.notificationDesc')}</div>
              </div>
              <Switch
                checked={switchStates.notification}
                onChange={(checked) => {
                  setSwitchStates((prev) => ({ ...prev, notification: checked }));
                  message.success(checked ? t('settings.notificationOn') : t('settings.notificationOff'));
                }}
              />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{t('settings.emailTitle')}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{t('settings.emailDesc')}</div>
              </div>
              <Switch
                checked={switchStates.email}
                onChange={(checked) => {
                  setSwitchStates((prev) => ({ ...prev, email: checked }));
                  message.success(checked ? t('settings.emailOn') : t('settings.emailOff'));
                }}
              />
            </Space>
          </Card>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{t('settings.smsTitle')}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{t('settings.smsDesc')}</div>
              </div>
              <Switch
                checked={switchStates.sms}
                onChange={(checked) => {
                  setSwitchStates((prev) => ({ ...prev, sms: checked }));
                  message.success(checked ? t('settings.smsOn') : t('settings.smsOff'));
                }}
              />
            </Space>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.settings}>
      <Card style={{ borderRadius: 12 }}>
        <Tabs defaultActiveKey="profile" items={tabItems} />
      </Card>
    </div>
  );
};

export default Settings;
