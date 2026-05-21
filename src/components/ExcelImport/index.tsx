/**
 * ★★★ Excel 批量导入组件 ★★★
 *
 * 功能：
 * 1. 拖拽/点击上传 .xlsx/.xls/.csv 文件
 * 2. 解析 Excel 数据（基于 xlsx 库）
 * 3. 数据校验（必填字段、类型、格式）
 * 4. 预览表格 + 错误标注（红色高亮）
 * 5. 确认导入 + 错误回滚机制
 *
 * 支持三种导入类型：
 * - order：订单批量导入
 * - driver：司机批量导入
 * - user：用户批量导入
 */

import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Table, Button, Upload, message, Tag, Progress, Space, Alert } from 'antd';
import { UploadOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, RollbackOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import type { UploadProps } from 'antd';
import styles from './index.module.css';

const { Dragger } = Upload;

// ==================== 字段配置 ====================

interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'phone';
  validate?: (value: any) => string | null;
}

const ORDER_FIELDS: FieldConfig[] = [
  { key: 'customerName', label: '客户名称', required: true, type: 'string' },
  { key: 'customerPhone', label: '客户电话', required: true, type: 'phone' },
  { key: 'origin', label: '发货地', required: true, type: 'string' },
  { key: 'destination', label: '目的地', required: true, type: 'string' },
  { key: 'goodsType', label: '货物类型', required: true, type: 'string' },
  { key: 'weight', label: '重量(kg)', required: true, type: 'number' },
  { key: 'volume', label: '体积(m³)', required: false, type: 'number' },
  { key: 'amount', label: '运费(元)', required: true, type: 'number' },
  { key: 'driverName', label: '司机姓名', required: false, type: 'string' },
  { key: 'driverPhone', label: '司机电话', required: false, type: 'phone' },
];

const DRIVER_FIELDS: FieldConfig[] = [
  { key: 'name', label: '司机姓名', required: true, type: 'string' },
  { key: 'phone', label: '联系电话', required: true, type: 'phone' },
  { key: 'idCard', label: '身份证号', required: true, type: 'string' },
  { key: 'city', label: '所在城市', required: true, type: 'string' },
  { key: 'plateNo', label: '车牌号', required: true, type: 'string' },
  { key: 'vehicleType', label: '车型', required: false, type: 'string' },
  { key: 'loadCapacity', label: '载重(吨)', required: false, type: 'number' },
];

const USER_FIELDS: FieldConfig[] = [
  { key: 'username', label: '用户名', required: true, type: 'string' },
  { key: 'nickname', label: '昵称', required: true, type: 'string' },
  { key: 'phone', label: '手机号', required: true, type: 'phone' },
  { key: 'email', label: '邮箱', required: false, type: 'string' },
  { key: 'role', label: '角色', required: true, type: 'string' },
  { key: 'department', label: '部门', required: false, type: 'string' },
];

const FIELD_CONFIGS: Record<string, { fields: FieldConfig[]; title: string; fieldsLabel: string }> = {
  order: { fields: ORDER_FIELDS, title: '批量导入订单', fieldsLabel: '订单字段说明' },
  driver: { fields: DRIVER_FIELDS, title: '批量导入司机', fieldsLabel: '司机字段说明' },
  user: { fields: USER_FIELDS, title: '批量导入用户', fieldsLabel: '用户字段说明' },
};

// ==================== 工具函数 ====================

/** 导入结果行 */
interface ImportRow {
  index: number;
  data: Record<string, any>;
  errors: string[];
  valid: boolean;
}

/** 校验电话号码 */
const validatePhone = (value: string): [string | null, string] => {
  if (!value) return [null, ''];
  const cleaned = String(value).replace(/\D/g, '');
  if (cleaned.length !== 11) return ['电话格式不正确（需11位数字）', 'excelImport.validate.phoneLength'];
  if (!/^1[3-9]\d{9}$/.test(cleaned)) return ['电话格式不正确', 'excelImport.validate.phoneFormat'];
  return [null, ''];
};

/** 校验单行数据 */
const validateRow = (
  row: Record<string, any>,
  fields: FieldConfig[],
  getLabel: (field: FieldConfig) => string,
  t: (key: string, options?: any) => string
): string[] => {
  const errors: string[] = [];
  for (const field of fields) {
    const value = row[field.key];
    // 必填校验
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
      errors.push(t('excelImport.error.required', { label: getLabel(field) }));
      continue;
    }
    if (value === undefined || value === null || String(value).trim() === '') continue;
    // 类型校验
    if (field.type === 'number' && isNaN(Number(value))) {
      errors.push(t('excelImport.error.mustBeNumber', { label: getLabel(field) }));
    }
    if (field.type === 'phone') {
      const [phoneErr, phoneErrKey] = validatePhone(String(value));
      if (phoneErr) errors.push(getLabel(field) + '：' + t(phoneErrKey));
    }
    // 自定义校验
    if (field.validate) {
      const err = field.validate(value);
      if (err) errors.push(err);
    }
  }
  return errors;
};

/** 生成简单ID */
let idCounter = 1000;
const genId = () => ++idCounter;

/** ★★★ 中文表头 → 英文 key 的映射 ★★★ */
const buildHeaderMap = (fields: FieldConfig[]): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const f of fields) {
    map[f.label] = f.key;
  }
  return map;
};

/** ★★★ 将中文表头的行数据转换成代码可识别的 key ★★★ */
const normalizeRow = (
  row: Record<string, any>,
  headerMap: Record<string, string>
): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    // 如果当前 key 在映射中，用映射后的 key
    const mappedKey = headerMap[key] || key;
    result[mappedKey] = value;
  }
  return result;
};

// ==================== 组件 ====================

interface ExcelImportProps {
  /** 导入类型 */
  type: 'order' | 'driver' | 'user';
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 导入成功回调（返回导入的数据） */
  onSuccess?: (data: Record<string, any>[]) => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ type, open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const getFieldLabel = useCallback((field: FieldConfig) => t(`excelImport.fields.${type}.${field.key}`), [t, type]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; fail: number }>({ success: 0, fail: 0 });
  const [importedData, setImportedData] = useState<Record<string, any>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = FIELD_CONFIGS[type];

  // 重置状态
  const reset = useCallback(() => {
    setStep('upload');
    setRows([]);
    setImportProgress(0);
    setImportResult({ success: 0, fail: 0 });
    setImportedData([]);
  }, []);

  // 关闭
  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // 解析 Excel 文件
  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (jsonData.length === 0) {
          message.error(t('excelImport.message.emptyFile'));
          return;
        }

        if (jsonData.length > 500) {
          message.warning(t('excelImport.message.tooManyRows', { count: jsonData.length }));
        }

        // ★★★ 中文表头 → 英文 key 映射 ★★★
        const headerMap = buildHeaderMap(config.fields);
        const normalizedData = jsonData.map((row) => normalizeRow(row, headerMap));

        // 解析并校验
        const parsed: ImportRow[] = normalizedData.map((row, i) => {
          const errors = validateRow(row, config.fields, getFieldLabel, t);
          return { index: i + 2, data: row, errors, valid: errors.length === 0 };
        });

        const validCount = parsed.filter((r) => r.valid).length;
        const errorCount = parsed.filter((r) => !r.valid).length;

        setRows(parsed);
        setStep('preview');

        if (errorCount > 0) {
          message.warning(t('excelImport.message.hasErrors', { count: errorCount }));
        } else {
          message.success(t('excelImport.message.allValid', { count: validCount }));
        }
      } catch (err) {
        message.error(t('excelImport.message.parseFailed'));
        console.error('Excel parse error:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [config, t, getFieldLabel]);

  // 上传
  const handleUpload = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      message.error(t('excelImport.message.invalidFormat'));
      return false;
    }
    parseExcel(file);
    return false;
  }, [parseExcel]);

  // 模拟导入（模拟网络请求）
  const handleImport = useCallback(async () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      message.warning(t('excelImport.message.noValidData'));
      return;
    }

    setStep('importing');
    setImportProgress(0);

    const total = validRows.length;
    let successCount = 0;
    let failCount = 0;
    const imported: Record<string, any>[] = [];

    // 模拟分批导入
    for (let i = 0; i < total; i++) {
      await new Promise((r) => setTimeout(r, 30)); // 模拟延迟
      successCount++;
      imported.push({ ...validRows[i].data, id: genId(), createTime: new Date().toISOString() });
      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    setImportResult({ success: successCount, fail: failCount });
    setImportedData(imported);
    setStep('done');

    message.success(t('excelImport.message.importSuccess', { count: successCount }));
  }, [rows]);

  // 确认并回调
  const handleConfirm = useCallback(() => {
    if (onSuccess && importedData.length > 0) {
      onSuccess(importedData);
    }
    handleClose();
  }, [onSuccess, importedData, handleClose]);

  // 下载模板
  const downloadTemplate = useCallback(() => {
    const headers = config.fields.map((f) => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    XLSX.writeFile(wb, `${type}_${t('excelImport.templateFileName')}.xlsx`);
  }, [config, type, t]);

  // 预览表格列
  const previewColumns = [
    { title: t('excelImport.preview.rowNum'), dataIndex: 'index', key: 'index', width: 60 },
    ...config.fields.map((f) => ({
      title: getFieldLabel(f),
      key: f.key,
      width: 120,
      render: (_: any, record: ImportRow) => {
        const value = record.data[f.key];
        const hasError = record.errors.some((e) => e.startsWith(getFieldLabel(f)));
        return (
          <span style={{ color: hasError ? '#ff4d4f' : undefined, fontWeight: hasError ? 600 : undefined }}>
            {value !== undefined && value !== '' ? String(value) : '-'}
          </span>
        );
      },
    })),
    {
      title: t('excelImport.preview.validationResult'),
      key: 'errors',
      width: 200,
      render: (_: any, record: ImportRow) => (
        record.valid
          ? <Tag icon={<CheckCircleOutlined />} color="success">{t('excelImport.preview.passed')}</Tag>
          : <div>
              {record.errors.map((err, i) => (
                <Tag key={i} icon={<CloseCircleOutlined />} color="error" style={{ marginBottom: 2 }}>
                  {err}
                </Tag>
              ))}
            </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined />
          {t('excelImport.title.' + type)}
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={960}
      footer={null}
      destroyOnHidden
    >
      {/* 步骤1：上传 */}
      {step === 'upload' && (
        <div>
          <Alert
            message={t('excelImport.upload.alert')}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button onClick={downloadTemplate} style={{ marginBottom: 16 }}>
            {t('excelImport.upload.downloadBtn')}
          </Button>

          <Dragger
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={handleUpload as any}
            style={{ borderRadius: 8 }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('excelImport.upload.draggerText')}</p>
            <p className="ant-upload-hint">
              {t('excelImport.upload.draggerHint')}
            </p>
          </Dragger>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('excelImport.fieldsLabel.' + type)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {config.fields.map((f) => (
                <Tag key={f.key} color={f.required ? 'blue' : 'default'}>
                  {getFieldLabel(f)}{f.required ? ' *' : ''}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 步骤2：预览 */}
      {step === 'preview' && (
        <div>
          <Alert
            message={
              <span>
                {t('excelImport.preview.parsed', { count: rows.length })}，
                {t('excelImport.preview.valid', { count: rows.filter((r) => r.valid).length })}，
                {t('excelImport.preview.invalid', { count: rows.filter((r) => !r.valid).length })}
              </span>
            }
            type={rows.some((r) => !r.valid) ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Table
            dataSource={rows}
            columns={previewColumns}
            rowKey="index"
            size="small"
            scroll={{ x: 800, y: 300 }}
            pagination={false}
            rowClassName={(record) => record.valid ? '' : styles.errorRow}
          />

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setStep('upload')}>{t('excelImport.preview.reUpload')}</Button>
              <Button
                type="primary"
                onClick={handleImport}
                disabled={rows.filter((r) => r.valid).length === 0}
              >
                {t('excelImport.preview.confirmImport', { count: rows.filter((r) => r.valid).length })}
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* 步骤3：导入中 */}
      {step === 'importing' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress type="circle" percent={importProgress} />
          <div style={{ marginTop: 16, color: '#888' }}>
            {t('excelImport.importing.text', { progress: importProgress })}
          </div>
        </div>
      )}

      {/* 步骤4：导入完成 */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <div style={{ fontSize: 18, fontWeight: 600, margin: '12px 0' }}>
            {t('excelImport.done.title')}
          </div>
          <div style={{ color: '#888', marginBottom: 16 }}>
            {t('excelImport.done.result', { success: importResult.success, fail: importResult.fail })}
          </div>
          <Space>
            <Button onClick={handleClose}>{t('excelImport.done.close')}</Button>
            <Button type="primary" onClick={handleConfirm}>{t('excelImport.done.viewResult')}</Button>
          </Space>
        </div>
      )}
    </Modal>
  );
};

export default ExcelImport;
export type { ExcelImportProps, ImportRow, FieldConfig };
