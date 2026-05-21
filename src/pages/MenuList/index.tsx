/**
 * ★★★ 菜单管理页面（真实 API 版）★★★
 *
 * 功能：
 * 1. 从 /api/menu/list 加载树形菜单数据
 * 2. 新增子菜单 / 编辑 / 删除（调用真实 API）
 * 3. 新增/编辑弹窗（菜单名称、图标、路径、类型、状态、组件、权限标识）
 * 4. 状态切换同步到后端
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, TreeSelect, Radio, Tag, Popconfirm, message, Switch,
} from 'antd';
import {
  PlusOutlined, PlusCircleOutlined, EditOutlined, DeleteOutlined,
  FolderOutlined, FileTextOutlined, ControlOutlined,
  SettingOutlined, UserOutlined, TeamOutlined, ApartmentOutlined,
  MenuOutlined, OrderedListOutlined, CarOutlined, DashboardOutlined,
  BarChartOutlined, ProfileOutlined, ReadOutlined, SafetyOutlined,
  LockOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import type { MenuType } from './types';
import { menuApi, type MenuItem } from '@/services/api';
import styles from './index.module.css';

// ==================== 图标映射 ====================

const iconOptions = [
  'SettingOutlined', 'UserOutlined', 'TeamOutlined', 'ApartmentOutlined',
  'MenuOutlined', 'OrderedListOutlined', 'CarOutlined', 'DashboardOutlined',
  'BarChartOutlined', 'ProfileOutlined', 'FileTextOutlined', 'FolderOutlined',
  'AppstoreOutlined', 'ReadOutlined', 'SafetyOutlined', 'LockOutlined',
];

const iconMap: Record<string, React.ReactNode> = {
  SettingOutlined: <SettingOutlined />, UserOutlined: <UserOutlined />,
  TeamOutlined: <TeamOutlined />, ApartmentOutlined: <ApartmentOutlined />,
  MenuOutlined: <MenuOutlined />, OrderedListOutlined: <OrderedListOutlined />,
  CarOutlined: <CarOutlined />, DashboardOutlined: <DashboardOutlined />,
  BarChartOutlined: <BarChartOutlined />, ProfileOutlined: <ProfileOutlined />,
  FileTextOutlined: <FileTextOutlined />, FolderOutlined: <FolderOutlined />,
  AppstoreOutlined: <AppstoreOutlined />, ReadOutlined: <ReadOutlined />,
  SafetyOutlined: <SafetyOutlined />, LockOutlined: <LockOutlined />,
};

// ==================== 工具函数 ====================

/** 将扁平列表转成树形结构 */
function buildTree(list: MenuItem[]): MenuItem[] {
  const map = new Map<number, MenuItem & { children?: MenuItem[] }>();
  const roots: (MenuItem & { children?: MenuItem[] })[] = [];
  list.forEach((m) => map.set(m.id, { ...m, children: [] }));
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** 将扁平列表转成 TreeSelect 用的 DataNode[] */
function buildTreeData(list: MenuItem[]): DataNode[] {
  const tree = buildTree(list);
  const toNode = (nodes: MenuItem[]): DataNode[] =>
    nodes.map((n) => ({
      key: n.id,
      title: n.name,
      children: n.children?.length ? toNode(n.children) : [],
    }));
  return toNode(tree);
}

/** 在树中删除某个节点（返回新扁平列表） */
function removeFromTree(list: MenuItem[], targetId: number): MenuItem[] {
  const ids = new Set<number>();
  const collect = (id: number) => {
    ids.add(id);
    list.forEach((d) => { if (d.parentId === id) collect(d.id); });
  };
  collect(targetId);
  return list.filter((d) => !ids.has(d.id));
}

// ==================== 组件 ====================

const MenuList: React.FC = () => {
  const { t } = useTranslation();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form] = Form.useForm();

  // 加载菜单列表
  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await menuApi.list();
      if (res.code === 200 && res.data) {
        setMenus(buildTree(res.data));
      }
    } catch (e) {
      message.error(t('menuList.loadFailed') || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  const handleAddChild = (pid: number | null) => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ parentId: pid, type: 'menu', status: '启用', sort: 1 });
    setModalVisible(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.setFieldsValue({ ...item, parentId: item.parentId ?? null });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await menuApi.delete(id);
      message.success(t('menuList.deleteSuccess'));
      fetchMenus();
    } catch (e) {
      message.error(t('menuList.deleteFailed') || '删除失败');
    }
  };

  const handleStatusChange = async (id: number, checked: boolean) => {
    try {
      await menuApi.update(id, { status: checked ? '启用' : '禁用' });
      message.success(checked ? t('menuList.alreadyEnabled') : t('menuList.alreadyDisabled'));
      fetchMenus();
    } catch (e) {
      message.error(t('menuList.statusChangeFailed') || '状态更新失败');
    }
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      if (editingItem) {
        await menuApi.update(editingItem.id, values);
        message.success(t('menuList.editSuccess'));
      } else {
        await menuApi.create(values);
        message.success(t('menuList.addSuccess'));
      }
      setModalVisible(false);
      fetchMenus();
    } catch (e) {
      message.error(t('menuList.saveFailed') || '保存失败');
    }
  };

  const renderTypeTag = (type: MenuType) => {
    const map: Record<MenuType, { color: string; text: string }> = {
      directory: { color: 'blue', text: t('menuList.directory') },
      menu: { color: 'green', text: t('menuList.menu') },
      button: { color: 'orange', text: t('menuList.button') },
    };
    const { color, text } = map[type];
    return <Tag color={color}>{text}</Tag>;
  };

  const renderIcon = (iconName: string) => iconMap[iconName] || null;

  const columns: ColumnsType<MenuItem> = [
    {
      title: t('menuList.menuName'), dataIndex: 'name', key: 'name',
      render: (name: string, record) => (
        <Space>
          {record.type === 'directory' && <FolderOutlined style={{ color: '#faad14' }} />}
          {record.type === 'menu' && <FileTextOutlined style={{ color: '#1677ff' }} />}
          {record.type === 'button' && <ControlOutlined style={{ color: '#52c41a' }} />}
          {name}
        </Space>
      ),
    },
    { title: t('menuList.icon'), dataIndex: 'icon', key: 'icon', width: 80, render: (icon: string) => renderIcon(icon) },
    { title: t('menuList.routePath'), dataIndex: 'path', key: 'path', width: 160 },
    { title: t('menuList.component'), dataIndex: 'component', key: 'component', width: 140 },
    { title: t('menuList.sort'), dataIndex: 'sort', key: 'sort', width: 60, align: 'center' },
    { title: t('menuList.perm'), dataIndex: 'perm', key: 'perm', width: 180 },
    { title: t('menuList.menuType'), dataIndex: 'type', key: 'type', width: 80, render: (type: MenuType) => renderTypeTag(type) },
    {
      title: t('menuList.status'), dataIndex: 'status', key: 'status', width: 80,
      render: (status: string, record) => (
        <Switch
          checked={status === '启用'}
          checkedChildren={t('menuList.enabled')} unCheckedChildren={t('menuList.disabled')} size="small"
          onChange={(checked) => handleStatusChange(record.id, checked)}
        />
      ),
    },
    {
      title: t('menuList.action'), key: 'action', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<PlusCircleOutlined />} onClick={() => handleAddChild(record.id)}>{t('menuList.add')}</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{t('menuList.edit')}</Button>
          <Popconfirm title={t('menuList.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('menuList.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrap}>
      <Card
        title={t('menuList.title')}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddChild(null)}>{t('menuList.addMenu')}</Button>}
        style={{ borderRadius: 12 }}
      >
        <Table
          rowKey="id"
          dataSource={menus}
          columns={columns}
          loading={loading}
          pagination={false}
          size="middle"
          defaultExpandAllRows
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingItem ? t('menuList.editMenu') : t('menuList.addMenu')}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        okText={t('menuList.confirm')} cancelText={t('menuList.cancel')}
        width={600}
        destroyOnHidden
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} style={{ marginTop: 16 }}>
          <Form.Item label={t('menuList.parentMenu')} name="parentId">
            <TreeSelect
              placeholder={t('menuList.topLevelMenu')}
              allowClear
              treeData={buildTreeData(menus.flatMap(m => [m, ...(m.children || [])]))}
              fieldNames={{ label: 'title', value: 'key', children: 'children' } as any}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item label={t('menuList.menuType')} name="type" rules={[{ required: true, message: t('menuList.selectMenuType') }]}>
            <Radio.Group>
              <Radio value="directory">{t('menuList.directory')}</Radio>
              <Radio value="menu">{t('menuList.menu')}</Radio>
              <Radio value="button">{t('menuList.button')}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={t('menuList.menuName')} name="name" rules={[{ required: true, message: t('menuList.inputMenuName') }]}>
            <Input placeholder={t('menuList.inputMenuName')} />
          </Form.Item>
          <Form.Item label={t('menuList.icon')} name="icon">
            <Select placeholder={t('menuList.selectIcon')} allowClear showSearch>
              {iconOptions.map((icon) => (
                <Select.Option key={icon} value={icon}>
                  <Space>{renderIcon(icon)}<span>{icon}</span></Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label={t('menuList.routePath')} name="path"><Input placeholder={t('menuList.pathPlaceholder')} /></Form.Item>
          <Form.Item label={t('menuList.perm')} name="perm"><Input placeholder={t('menuList.permPlaceholder')} /></Form.Item>
          <Form.Item label={t('menuList.component')} name="component"><Input placeholder={t('menuList.componentPlaceholder')} /></Form.Item>
          <Form.Item label={t('menuList.sort')} name="sort"><InputNumber min={0} max={999} style={{ width: '100%' }} /></Form.Item>
          <Form.Item label={t('menuList.status')} name="status" initialValue="启用">
            <Select options={[
              { value: '启用', label: t('menuList.enabled') },
              { value: '禁用', label: t('menuList.disabled') },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuList;
