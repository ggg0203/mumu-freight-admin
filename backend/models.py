"""
SQLAlchemy ORM 模型定义
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum as SAEnum
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    nickname = Column(String(50), default="")
    avatar = Column(String(200), default="")
    email = Column(String(100), default="")
    phone = Column(String(20), default="")
    role = Column(String(20), default="admin")
    status = Column(Integer, default=1)
    createTime = Column(DateTime, server_default=func.now())


class Menu(Base):
    __tablename__ = "menus"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    icon = Column(String(50), default="")
    path = Column(String(100), default="")
    parentId = Column(Integer, nullable=True, default=None)
    sort = Column(Integer, default=0)
    type = Column(String(20), default="menu")
    status = Column(String(10), default="启用")
    component = Column(String(200), default="")
    perm = Column(String(100), default="")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    orderNo = Column(String(50), unique=True, nullable=False)
    customerName = Column(String(50), default="")
    customerPhone = Column(String(20), default="")
    origin = Column(String(50), default="")
    destination = Column(String(50), default="")
    goodsType = Column(String(50), default="")
    weight = Column(Float, default=0)
    volume = Column(Float, default=0)
    amount = Column(Float, default=0)
    status = Column(String(20), default="pending")
    driverName = Column(String(50), nullable=True)
    driverPhone = Column(String(20), nullable=True)
    createTime = Column(String(50), default="")
    updateTime = Column(String(50), default="")


class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    phone = Column(String(20), default="")
    city = Column(String(50), default="")
    plateNumber = Column(String(20), default="")
    rating = Column(Float, default=0)
    orderCount = Column(Integer, default=0)
    status = Column(String(20), default="空闲")
    registerTime = Column(String(50), default="")
    avatar = Column(String(200), nullable=True)
    age = Column(Integer, default=0)
    yearsOfExperience = Column(Integer, default=0)
    idCard = Column(String(30), default="")
    address = Column(String(200), default="")


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    category = Column(String(50), default="")
    duration = Column(String(20), default="")
    students = Column(Integer, default=0)
    progress = Column(Integer, default=0)
    status = Column(String(20), default="not_started")
    color = Column(String(20), default="#1677ff")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    operator = Column(String(50), default="")
    module = Column(String(50), default="")
    action = Column(String(20), default="")
    target = Column(String(200), default="")
    detail = Column(Text, default="")
    ip = Column(String(50), default="")
    result = Column(String(20), default="success")
    time = Column(String(50), default="")


# ==================== 部门 ====================
class Dept(Base):
    __tablename__ = "depts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    parentId = Column(Integer, nullable=True, default=None)
    sort = Column(Integer, default=0)
    createTime = Column(String(50), default="")
    leader = Column(String(50), default="")
    phone = Column(String(20), default="")
    email = Column(String(100), default="")
    status = Column(String(10), default="启用")


# ==================== 角色 ====================
class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    roleKey = Column(String(50), default="")
    roleSort = Column(Integer, default=0)
    status = Column(String(10), default="启用")
    description = Column(String(200), default="")
    permissions = Column(Text, default="")  # JSON 字符串
    createTime = Column(String(50), default="")
