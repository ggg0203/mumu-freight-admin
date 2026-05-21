/**
 * ★★★ 用户管理页面（对接真实后端 API）★★★
 *
 * 功能：
 * 1. 搜索（用户名 / 邮箱 / 角色）
 * 2. 用户列表（ID/昵称/邮箱/角色/状态/注册时间/操作）
 * 3. 新增用户弹窗（用户名/密码/昵称/邮箱/手机/角色/状态/头像）
 * 4. 编辑用户弹窗
 * 5. 删除用户
 */
import { useState, useEffect, useRef } from 'react';
import {
  Card, Table, Button, Input, Select, Space, Modal, Form, Upload,
  message, Tag, Popconfirm, Row, Col, Avatar,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined,
  UserOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/stores/userStore';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import styles from './index.module.css';

import { userApi, type UserInfo } from '@/services/api';

// ==================== 类型定义（与后端 User 模型对齐）====================

interface UserItem {
  id: number;
  userId: string;      // 对应后端 username
  userName: string;    // 对应后端 nickname
  email: string;
  phone: string;
  role: string;       // admin / user
  status: number;      // 1=在职 0=离职
  avatar: string;
  registerTime: string;  // 对应后端 createTime
}

// ==================== 组件 ====================

const UserList: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchRole, setSearchRole] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const hasPerm = useUserStore((s) => s.hasPerm);

  // ★★★ 加载用户列表 ★★★
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userApi.list({ keyword: searchName || undefined, role: searchRole });
      // 映射后端字段到前端字段
      const mapped: UserItem[] = (data as any[]).map((u) => ({
        id: u.id,
        userId: u.username,
        userName: u.nickname || u.username,
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'user',
        status: u.status ?? 1,
        avatar: u.avatar || '',
        registerTime: u.createTime || '',
      }));
      setUsers(mapped);
    } catch (e) {
      message.error(t('common.loadFailed') || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 筛选（前端过滤，也可以改为后端筛选）
  const filtered = users.filter((u) => {
    const matchName = !searchName || u.userName.includes(searchName) || u.userId.includes(searchName);
    const matchRole = !searchRole || u.role === searchRole;
    return matchName && matchRole;
  });

  // 新增
  const handleAdd = () => {
    setEditingUser(null);
    setAvatarPreview(undefined);
    form.resetFields();
    setModalVisible(true);
  };

  // 编辑
  const handleEdit = (user: UserItem) => {
    setEditingUser(user as any);
    setAvatarPreview(user.avatar || undefined);
    form.setFieldsValue({
      userName: user.userName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
    });
    setModalVisible(true);
  };

  // 删除
  const handleDelete = async (id: number) => {
    try {
      await userApi.delete(id);
      message.success(t('userList.deleteSuccess') || '删除成功');
      loadUsers();
    } catch {
      message.error(t('common.deleteFailed') || '删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    Modal.confirm({
      title: t('userList.confirmBatchDelete'),
      content: (t('userList.confirmBatchDeleteContent') || '确定删除选中的 {count} 个用户？').replace('{count}', String(selectedRowKeys.length)),
      okType: 'danger',
      onOk: async () => {
        await Promise.all(selectedRowKeys.map((key) => userApi.delete(Number(key))));
        setSelectedRowKeys([]);
        message.success(t('userList.deleteSuccess') || '删除成功');
        loadUsers();
      },
    });
  };

  // 确认提交
  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingUser) {
          await userApi.update(editingUser.id, {
            nickname: values.userName,
            email: values.email,
            phone: values.phone,
            role: values.role,
            status: values.status,
            avatar: values.avatar,
          });
          message.success(t('userList.editSuccess') || '编辑成功');
        } else {
          if (!values.password) {
            message.warning('请输入密码');
            return;
          }
          await userApi.create({
            username: values.userId || values.userName,
            password: values.password,
            nickname: values.userName,
            email: values.email,
            phone: values.phone,
            role: values.role || 'user',
            status: values.status ?? 1,
            avatar: values.avatar,
          });
          message.success(t('userList.addSuccess') || '新增成功');
        }
        setModalVisible(false);
        loadUsers();
      } catch {
        message.error(t('common.saveFailed') || '保存失败');
      }
    });
  };

  // 搜索
  const handleSearch = () => {
    if (filtered.length === 0) {
      message.info(t('userList.noMatchUser') || '无匹配用户');
    } else {
      message.success((t('userList.matchCount') || '找到 {count} 条').replace('{count}', String(filtered.length)));
    }
  };

  const handleReset = () => {
    setSearchName('');
    setSearchRole(undefined);
    loadUsers();
  };

  // 上传配置
  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setAvatarPreview(url);
        form.setFieldsValue({ avatar: url });
      };
      reader.readAsDataURL(file);
      return false;
    },
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
  };

  // 表格列
  const columns: ColumnsType<UserItem> = [
    { title: t('userList.userId') || '用户ID', dataIndex: 'userId', key: 'userId', width: 100 },
    {
      title: t('userList.userName') || '用户名', dataIndex: 'userName', key: 'userName', width: 100,
      render: (name: string, record: UserItem) => (
        <Space>
          <Avatar size={28} src={record.avatar || undefined} icon={<UserOutlined />} />
          {name}
        </Space>
      ),
    },
    { title: t('userList.userEmail') || '邮箱', dataIndex: 'email', key: 'email', width: 180 },
    { title: t('userList.userRole') || '角色', dataIndex: 'role', key: 'role', width: 100 },
    {
      title: t('userList.userStatus') || '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? (t('userList.statusActive') || '在职') : (t('userList.statusInactive') || '离职')}
        </Tag>
      ),
    },
    { title: t('userList.registerTime') || '注册时间', dataIndex: 'registerTime', key: 'registerTime', width: 180 },
    {
      title: t('userList.action') || '操作', key: 'action', width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>{t('common.edit')}</Button>
          <Popconfirm title={t('userList.confirmDelete') || '确定删除？'} onConfirm={() => handleDelete(record.id)}>
            {hasPerm('system:user:delete') && (
              <Button type="link" size="small" danger>{t('common.delete')}</Button>
            )}
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrap}>
      {/* 搜索区域 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <span>{t('userList.searchUserName') || '用户名'}</span>
              <Input
                placeholder={t('userList.placeholderUserName') || '请输入用户名'}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                style={{ width: 160 }}
                allowClear
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span>{t('userList.searchRole') || '角色'}</span>
              <Select
                placeholder={t('userList.selectRole') || '请选择角色'}
                value={searchRole}
                onChange={setSearchRole}
                style={{ width: 120 }}
                allowClear
                options={[
                  { value: 'admin', label: '管理员' },
                  { value: 'user', label: '普通用户' },
                ]}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => { handleSearch(); loadUsers(); }}>{t('userList.search') || '搜索'}</Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>{t('userList.reset') || '重置'}</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 列表 */}
      <Card
        title={t('userList.title') || '用户管理'}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('userList.add') || '新增'}</Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              {t('userList.batchDelete') || '批量删除'}
            </Button>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          rowKey="id"
          dataSource={filtered}
          columns={columns}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
          size="middle"
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingUser ? (t('userList.editUser') || '编辑用户') : (t('userList.addUser') || '新增用户')}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        width={560}
        destroyOnHidden
      >
        <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} style={{ marginTop: 16 }}>
          <Form.Item label={t('userList.userName') || '用户名'} name="userName" rules={[{ required: true, message: t('userList.nameRequired') || '请输入用户名' }]}>
            <Input placeholder={t('userList.namePlaceholder') || '请输入用户名'} />
          </Form.Item>
          {!editingUser && (
            <Form.Item label={t('userList.password') || '密码'} name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <Form.Item label={t('userList.email') || '邮箱'} name="email"
            rules={[{ type: 'email', message: t('userList.emailFormatError') || '邮箱格式不正确' }]}
          >
            <Input placeholder={t('userList.emailPlaceholder') || '请输入邮箱'} />
          </Form.Item>
          <Form.Item label={t('userList.phone') || '手机号'} name="phone">
            <Input placeholder={t('userList.phonePlaceholder') || '请输入手机号'} />
          </Form.Item>
          <Form.Item label={t('userList.role') || '角色'} name="role" initialValue="user">
            <Select
              options={[
                { value: 'admin', label: '管理员' },
                { value: 'user', label: '普通用户' },
              ]}
            />
          </Form.Item>
          <Form.Item label={t('userList.status') || '状态'} name="status" initialValue={1}>
            <Select
              options={[
                { value: 1, label: t('userList.statusActive') || '在职' },
                { value: 0, label: t('userList.statusInactive') || '离职' },
              ]}
            />
          </Form.Item>
          <Form.Item label={t('userList.avatar') || '头像'} name="avatar">
            <Upload {...uploadProps}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <Button icon={<UploadOutlined />}>{t('userList.uploadAvatar') || '上传头像'}</Button>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserList;
