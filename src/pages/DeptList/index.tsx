/**
 * ★★★ 部门管理页面（真实 API 版）★★★
 *
 * 功能：
 * 1. 从 /api/dept/list 加载树形部门数据
 * 2. 新增子部门 / 编辑 / 删除（调用真实 API）
 * 3. 新增/编辑弹窗（部门名称、排序、负责人、联系电话、邮箱、状态）
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, TreeSelect, Tag, Popconfirm, message,
} from 'antd';
import {
  PlusOutlined, PlusCircleOutlined, EditOutlined, DeleteOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import { deptApi, type DeptItem } from '@/services/api';
import styles from './index.module.css';

// ==================== 工具函数 ====================

/** 将扁平列表转成树形结构 */
function buildTree(list: DeptItem[]): DeptItem[] {
  const map = new Map<number, DeptItem & { children?: DeptItem[] }>();
  const roots: (DeptItem & { children?: DeptItem[] })[] = [];

  // 先全部克隆一份，避免修改原对象
  list.forEach((d) => map.set(d.id, { ...d, children: [] }));

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
function buildTreeData(list: DeptItem[]): DataNode[] {
  const tree = buildTree(list);
  const toNode = (nodes: DeptItem[]): DataNode[] =>
    nodes.map((n) => ({
      key: n.id,
      title: n.name,
      children: n.children?.length ? toNode(n.children) : [],
    }));
  return toNode(tree);
}

/** 在树中删除某个节点（返回新扁平列表） */
function removeFromTree(list: DeptItem[], targetId: number): DeptItem[] {
  // 找到所有要删除的 id（含子节点）
  const ids = new Set<number>();
  const collect = (id: number) => {
    ids.add(id);
    list.forEach((d) => { if (d.parentId === id) collect(d.id); });
  };
  collect(targetId);
  return list.filter((d) => !ids.has(d.id));
}

// ==================== 组件 ====================

const DeptList: React.FC = () => {
  const { t } = useTranslation();
  const [depts, setDepts] = useState<DeptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DeptItem | null>(null);
  const [form] = Form.useForm();

  // 加载部门列表
  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await deptApi.list();
      if (res.code === 200 && res.data) {
        // API 返回扁平列表，转成树形
        const tree = buildTree(res.data);
        setDepts(tree);
      }
    } catch (e) {
      message.error(t('deptList.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  // 新增 / 编辑 弹窗
  const openModal = (item?: DeptItem) => {
    if (item) {
      setEditingItem(item);
      form.setFieldsValue({
        ...item,
        parentId: item.parentId ?? null,
      });
    } else {
      setEditingItem(null);
      form.resetFields();
      form.setFieldsValue({ status: '启用', sort: 1 });
    }
    setModalVisible(true);
  };

  // 保存
  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      if (editingItem) {
        await deptApi.update(editingItem.id, values);
        message.success(t('deptList.editSuccess'));
      } else {
        await deptApi.create(values);
        message.success(t('deptList.addSuccess'));
      }
      setModalVisible(false);
      fetchDepts();
    } catch (e) {
      message.error(t('deptList.saveFailed'));
    }
  };

  // 删除
  const handleDelete = async (id: number) => {
    try {
      await deptApi.delete(id);
      message.success(t('deptList.deleteSuccess'));
      fetchDepts();
    } catch (e) {
      message.error(t('deptList.deleteFailed'));
    }
  };

  // 表格列
  const columns: ColumnsType<DeptItem> = [
    {
      title: t('deptList.deptName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <BankOutlined style={{ color: '#1677ff' }} />
          {name}
        </Space>
      ),
    },
    { title: t('deptList.sort'), dataIndex: 'sort', key: 'sort', width: 60, align: 'center' },
    { title: t('deptList.leader'), dataIndex: 'leader', key: 'leader', width: 100 },
    { title: t('deptList.phone'), dataIndex: 'phone', key: 'phone', width: 130 },
    { title: t('deptList.email'), dataIndex: 'email', key: 'email', width: 200 },
    {
      title: t('deptList.status'), dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => (
        <Tag color={status === '启用' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    { title: t('deptList.createTime'), dataIndex: 'createTime', key: 'createTime', width: 180 },
    {
      title: t('deptList.action'), key: 'action', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<PlusCircleOutlined />} onClick={() => openModal({ ...record, parentId: record.id } as any)}>
            {t('deptList.add')}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
            {t('deptList.edit')}
          </Button>
          <Popconfirm title={t('deptList.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('deptList.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrap}>
      <Card
        title={t('deptList.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            {t('deptList.addDept')}
          </Button>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          rowKey="id"
          dataSource={depts}
          columns={columns}
          loading={loading}
          pagination={false}
          size="middle"
          defaultExpandAllRows
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingItem ? t('deptList.editDept') : t('deptList.addDept')}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        okText={t('deptList.confirm')}
        cancelText={t('deptList.cancel')}
        width={560}
        destroyOnHidden
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 17 }} style={{ marginTop: 16 }}>
          <Form.Item label={t('deptList.parentDept')} name="parentId">
            <TreeSelect
              placeholder={t('deptList.topLevelDept')}
              allowClear
              treeData={buildTreeData(depts.flatMap(d => [d, ...(d.children || [])]))}
              fieldNames={{ label: 'title', value: 'key', children: 'children' } as any}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item label={t('deptList.deptName')} name="name" rules={[{ required: true, message: t('deptList.inputDeptName') }]}>
            <Input placeholder={t('deptList.inputDeptName')} />
          </Form.Item>
          <Form.Item label={t('deptList.sort')} name="sort">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label={t('deptList.leader')} name="leader">
            <Input placeholder={t('deptList.inputLeader')} />
          </Form.Item>
          <Form.Item label={t('deptList.phone')} name="phone">
            <Input placeholder={t('deptList.inputPhone')} />
          </Form.Item>
          <Form.Item label={t('deptList.email')} name="email" rules={[{ type: 'email', message: t('deptList.invalidEmail') }]}>
            <Input placeholder={t('deptList.inputEmail')} />
          </Form.Item>
          <Form.Item label={t('deptList.status')} name="status" initialValue="启用">
            <Select
              options={[
                { value: '启用', label: t('deptList.enabled') },
                { value: '禁用', label: t('deptList.disabled') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeptList;
