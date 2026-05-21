"""
CRUD - 用户、菜单、部门、角色
"""
from sqlalchemy.orm import Session
from models import User, Menu, Dept, Role
from datetime import datetime


# ==================== 用户 ====================

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_user_list(db: Session, keyword: str = None, role: str = None):
    q = db.query(User)
    if keyword:
        q = q.filter((User.username.like(f"%{keyword}%")) | (User.nickname.like(f"%{keyword}%")))
    if role:
        q = q.filter(User.role == role)
    return q.order_by(User.id).all()


def create_user(db: Session, username: str, password: str, nickname: str = "",
                avatar: str = "", email: str = "", phone: str = "",
                role: str = "user", status: int = 1):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    user = User(
        username=username, password=password, nickname=nickname,
        avatar=avatar, email=email, phone=phone,
        role=role, status=status, createTime=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, **kwargs):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    for k, v in kwargs.items():
        if hasattr(user, k):
            setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True


# ==================== 菜单 ====================

def get_menus(db: Session):
    return db.query(Menu).order_by(Menu.sort).all()


def create_menu(db: Session, name: str, icon: str = "", path: str = "",
                parentId: int = None, sort: int = 0,
                type: str = "menu", status: str = "启用",
                component: str = "", perm: str = ""):
    m = Menu(name=name, icon=icon, path=path, parentId=parentId, sort=sort,
             type=type, status=status, component=component, perm=perm)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def update_menu(db: Session, menu_id: int, **kwargs):
    m = db.query(Menu).filter(Menu.id == menu_id).first()
    if not m:
        return None
    for k, v in kwargs.items():
        if hasattr(m, k):
            setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


def delete_menu(db: Session, menu_id: int):
    m = db.query(Menu).filter(Menu.id == menu_id).first()
    if not m:
        return False
    db.delete(m)
    db.commit()
    return True


# ==================== 部门 ====================

def get_dept_list(db: Session, keyword: str = None):
    q = db.query(Dept)
    if keyword:
        q = q.filter(Dept.name.like(f"%{keyword}%"))
    return q.order_by(Dept.sort).all()


def create_dept(db: Session, name: str, parentId: int = None, sort: int = 0,
                leader: str = "", phone: str = "", email: str = "", status: str = "启用"):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    d = Dept(name=name, parentId=parentId, sort=sort, createTime=now,
             leader=leader, phone=phone, email=email, status=status)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def update_dept(db: Session, dept_id: int, **kwargs):
    d = db.query(Dept).filter(Dept.id == dept_id).first()
    if not d:
        return None
    for k, v in kwargs.items():
        if hasattr(d, k):
            setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


def delete_dept(db: Session, dept_id: int):
    d = db.query(Dept).filter(Dept.id == dept_id).first()
    if not d:
        return False
    db.delete(d)
    db.commit()
    return True


# ==================== 角色 ====================

def get_role_list(db: Session, keyword: str = None):
    q = db.query(Role)
    if keyword:
        q = q.filter(Role.name.like(f"%{keyword}%"))
    return q.order_by(Role.id).all()


def create_role(db: Session, name: str, description: str = "", permissions: str = "",
                roleKey: str = "", roleSort: int = 0, status: str = "启用"):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    r = Role(name=name, description=description, permissions=permissions,
             roleKey=roleKey, roleSort=roleSort, status=status, createTime=now)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def update_role(db: Session, role_id: int, **kwargs):
    r = db.query(Role).filter(Role.id == role_id).first()
    if not r:
        return None
    for k, v in kwargs.items():
        if hasattr(r, k):
            setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


def delete_role(db: Session, role_id: int):
    r = db.query(Role).filter(Role.id == role_id).first()
    if not r:
        return False
    db.delete(r)
    db.commit()
    return True
