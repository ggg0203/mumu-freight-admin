"""
CRUD - 课程和审计日志
"""
from sqlalchemy.orm import Session
from models import Course, AuditLog


# ==================== 课程 ====================

def get_course_list(db: Session):
    return db.query(Course).order_by(Course.id).all()


def update_course_progress(db: Session, course_id: int, progress: int, status: str):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course:
        course.progress = progress
        course.status = status
        db.commit()
        db.refresh(course)
    return course


# ==================== 审计日志 ====================

def get_audit_logs(db: Session, page: int = 1, page_size: int = 15,
                   module: str = None, action: str = None,
                   operator: str = None, keyword: str = None):
    q = db.query(AuditLog)
    if module:
        q = q.filter(AuditLog.module == module)
    if action:
        q = q.filter(AuditLog.action == action)
    if operator:
        q = q.filter(AuditLog.operator == operator)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(AuditLog.target.like(like) | AuditLog.detail.like(like))
    total = q.count()
    items = q.order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def create_audit_log(db: Session, data: dict):
    log = AuditLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
