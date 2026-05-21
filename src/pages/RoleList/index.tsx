/**
 * ★★★ 角色管理页面（真实 API 版）★★★
 *
 * 功能：
 * 1. 从 /api/role/list 加载角色列表
 * 2. 新增/编辑角色弹窗（调用真实 API）
 * 3. 设置权限弹窗（树形复选框，权限数据来自 API）
 * 4. 删除角色（调用真实 API）
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Input, Select, Space, Modal, Form,
  Tag, Popconfirm, message, Tree,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined,
  SafetyOutlined, EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import { getMenuData } from '@/rbac-data';
import { roleApi, type RoleItem } from '@/services/api';
import styles from './index.module.css';

// ==================== 工具函数 ====================

/** 从共享菜单数据构建权限树 */
function buildPermTree(): DataNode[] {
  const allMenus = getMenuData();
  const mapMenus = (items: typeof allMenus): DataNode[] =>
    items.map((item) => ({
      key: String(item.id),
      title: item.name,
      children: item.children ? mapMenus(item.children) : [],
    }));
  return mapMenus(allMenus);
}

/** 把 permissions JSON 字符串转成 number[] */
function parsePermIds(permissions: string): number[] {
  try { return JSON.parse(permissions || '[]'); } catch { return []; }
}

/** 把 number[] 转成 JSON 字符串 */
function stringifyPermIds(permIds: number[]): string {
  return JSON.stringify(permIds);
}

// ==================== 组件 ====================

const RoleList: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [permModalVisible, setPermModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [currentPermRole, setCurrentPermRole] = useState<RoleItem | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();

  // 加载角色列表
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roleApi.list();
      if (res.code === 200 && res.data) {
        setRoles(res.data);
      }
    } catch (e) {
      message.error(t('roleList.loadFailed') || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // 筛选
  const filteredRoles = roles.filter((r) => {
    const matchName = !searchName || r.name.includes(searchName);
    const matchStatus = !searchStatus || r.status === searchStatus;
    return matchName && matchStatus;
  });

  const handleAdd = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ status: '启用', roleSort: 1 });
    setModalVisible(true);
  };

  const handleEdit = (role: RoleItem) => {
    setEditingRole(role);
    form.setFieldsValue(role);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await roleApi.delete(id);
      message.success(t('roleList.deleteSuccess'));
      fetchRoles();
    } catch {
      message.error(t('roleList.deleteFailed') || '删除失败');
    }
  };

  const handleSetPerm = (role: RoleItem) => {
    setCurrentPermRole(role);
    setCheckedKeys(parsePermIds(role.permissions).map(String));
    setPermModalVisible(true);
  };

  const handlePermOk = async () => {
    if (!currentPermRole) return;
    const permIds = checkedKeys.map(Number);
    try {
      await roleApi.update(currentPermRole.id, {
        ...currentPermRole,
        permissions: stringifyPermIds(permIds),
      });
      message.success(t('roleList.permSetSuccess'));
      setPermModalVisible(false);
      setCurrentPermRole(null);
      fetchRoles();
    } catch {
      message.error(t('roleList.permSetFailed') || '权限设置失败');
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      if (editingRole) {
        await roleApi.update(editingRole.id, values);
        message.success(t('roleList.editSuccess'));
      } else {
        await roleApi.create(values);
        message.success(t('roleList.addSuccess'));
      }
      setModalVisible(false);
      fetchRoles();
    } catch {
      message.error(t('roleList.saveFailed') || '保存失败');
    }
  };

  const handleReset = () => {
    setSearchName('');
    setSearchStatus(undefined);
  };

  const columns: ColumnsType<RoleItem> = [
    { title: t('roleList.roleId'), dataIndex: 'id', key: 'id', width: 80 },
    { title: t('roleList.roleName'), dataIndex: 'name', key: 'name', width: 130 },
    { title: t('roleList.roleKey'), dataIndex: 'roleKey', key: 'roleKey', width: 130 },
    { title: t('roleList.roleSort'), dataIndex: 'roleSort', key: 'roleSort', width: 80, align: 'center' },
    {
      title: t('roleList.status'), dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>,
    },
    { title: t('roleList.createTime'), dataIndex: 'createTime', key: 'createTime', width: 180 },
    {
      title: t('roleList.action'), key: 'action', width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{t('roleList.edit')}</Button>
          <Button type="link" size="small" icon={<SafetyOutlined />} onClick={() => handleSetPerm(record)}>{t('roleList.setPermissions')}</Button>
          <Popconfirm title={t('roleList.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('roleList.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrap}>
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Space>
            <span>{t('roleList.roleName')}：</span>
            <Input
              placeholder={t('roleList.inputRoleName')}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{ width: 160 }}
              allowClear
            />
          </Space>
          <Space>
            <span>{t('roleList.status')}：</span>
            <Select
              placeholder={t('roleList.selectStatus')}
              value={searchStatus}
              onChange={setSearchStatus}
              style={{ width: 120 }}
              allowClear
              options={[
                { value: '启用', label: t('roleList.enabled') },
                { value: '禁用', label: t('roleList.disabled') },
              ]}
            />
          </Space>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchRoles}>{t('roleList.search')}</Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>{t('roleList.reset')}</Button>
          </Space>
        </div>
      </Card>

      <Card
        title={t('roleList.title')}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('roleList.add')}</Button>}
        style={{ borderRadius: 12 }}
      >
        <Table rowKey="id" dataSource={filteredRoles} columns={columns} loading={loading} pagination={false} size="middle" />
      </Card>

      <Modal
        title={editingRole ? t('roleList.editRole') : t('roleList.addRole')}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        okText={t('roleList.confirm')}
        cancelText={t('roleList.cancel')}
        width={520}
        destroyOnHidden
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} style={{ marginTop: 16 }}>
          <Form.Item label={t('roleList.roleName')} name="name" rules={[{ required: true, message: t('roleList.inputRoleName') }]}>
            <Input placeholder={t('roleList.inputRoleName')} />
          </Form.Item>
          <Form.Item label={t('roleList.roleKey')} name="roleKey" rules={[{ required: true, message: t('roleList.inputRoleKey') }]}>
            <Input placeholder={t('roleList.roleKeyPlaceholder')} />
          </Form.Item>
          <Form.Item label={t('roleList.roleSort')} name="roleSort">
            <Input placeholder={t('roleList.roleSortPlaceholder')} type="number" />
          </Form.Item>
          <Form.Item label={t('roleList.status')} name="status">
            <Select options={[
              { value: '启用', label: t('roleList.enabled') },
              { value: '禁用', label: t('roleList.disabled') },
            ]} />
          </Form.Item>
          <Form.Item label={t('roleList.description')} name="description">
            <Input.TextArea rows={3} placeholder={t('roleList.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t('roleList.setPermissions')} - ${currentPermRole?.name ?? ''}`}
        open={permModalVisible}
        onOk={handlePermOk}
        onCancel={() => { setPermModalVisible(false); setCurrentPermRole(null); }}
        okText={t('roleList.save')}
        cancelText={t('roleList.cancel')}
        width={400}
        destroyOnHidden
      >
        <div style={{ padding: '16px 0' }}>
          <Tree
            checkable
            defaultExpandAll
            treeData={buildPermTree()}
            checkedKeys={checkedKeys}
            onCheck={(keys) => setCheckedKeys(keys as React.Key[])}
          />
        </div>
      </Modal>
    </div>
  );
};

export default RoleList;
