/**
 * ★★★ 课程管理页面 ★★★
 *
 * 使用 Ant Design Card、List 组件展示课程列表
 * 展示货运营运相关的培训课程
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Tag, Button, Space, Progress, message, theme } from 'antd';
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { courseApi } from '@/api';
import type { CourseItem } from '@/shared-data';
import styles from './index.module.css';

const Course: React.FC = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [courses, setCoursesState] = useState<CourseItem[]>([]);

  // ★★★ 从 API 加载课程列表 ★★★
  useEffect(() => {
    courseApi.getCourseList().then(res => setCoursesState(res.data || []));
  }, []);

  // 开始/继续/重新学习
  const handleLearn = (courseId: number) => {
    setCoursesState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        if (c.status === 'completed') {
          message.success(t('course.restartMessage', { title: c.title }));
          return { ...c, progress: 0, status: 'in_progress' as const };
        }
        if (c.status === 'not_started') {
          message.success(t('course.startMessage', { title: c.title }));
          return { ...c, progress: 10, status: 'in_progress' as const };
        }
        // 继续学习：进度 +10%（不超过 100%）
        const newProgress = Math.min(100, c.progress + 10);
        const newStatus = newProgress >= 100 ? 'completed' as const : 'in_progress' as const;
        courseApi.updateProgress(courseId, newProgress, newStatus).catch(() => {});
        message.success(t('course.progressMessage', { old: c.progress, new: newProgress }));
        return { ...c, progress: newProgress, status: newStatus };
      })
    );
  };

  return (
    <div className={styles.course}>
      <Row gutter={[16, 16]}>
        {courses.map((course) => (
          <Col xs={24} sm={12} lg={8} key={course.id}>
            <Card
              hoverable
              className={styles.courseCard}
              style={{ borderRadius: 12, height: '100%' }}
            >
              <Tag color={course.color} style={{ marginBottom: 12 }}>
                {course.category}
              </Tag>

              <h3 className={styles.courseTitle}>{course.title}</h3>

              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <div className={styles.infoRow}>
                  <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                  <span>{course.duration}</span>
                </div>
                <div className={styles.infoRow}>
                  <TeamOutlined style={{ color: token.colorTextSecondary }} />
                  <span>{t('course.studentsLabel', { count: course.students })}</span>
                </div>
              </Space>

              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={course.progress}
                  size="small"
                  strokeColor={course.color}
                  format={(percent) =>
                    percent === 100 ? t('course.completed') : percent === 0 ? t('course.notStarted') : `${percent}%`
                  }
                />
              </div>

              <Button
                type={course.progress === 100 ? 'default' : 'primary'}
                icon={<PlayCircleOutlined />}
                block
                style={{ marginTop: 16, borderRadius: 8 }}
                onClick={() => handleLearn(course.id)}
              >
                {course.progress === 100 ? t('course.restart') : course.progress === 0 ? t('course.start') : t('course.continue')}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Course;
