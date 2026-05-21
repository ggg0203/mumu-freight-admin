"""
Pydantic 请求/响应模型
"""
from pydantic import BaseModel
from typing import Optional, List, Any


# ==================== 通用 ====================

class ApiResponse(BaseModel):
    code: int = 200
    message: str = "success"
    data: Any = None


class PaginationResult(BaseModel):
    list: List[Any]
    total: int
    page: int
    pageSize: int


# ==================== 用户 ====================

class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    username: str
    nickname: str
    avatar: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    role: str = "admin"
    status: int = 1
    createTime: Optional[str] = ""


class LoginResult(BaseModel):
    token: str
    userInfo: UserInfo


# ==================== 订单 ====================

class OrderCreate(BaseModel):
    customerName: str
    customerPhone: str
    origin: str
    destination: str
    goodsType: str
    weight: float = 0
    volume: float = 0
    amount: float = 0
    driverName: Optional[str] = None
    driverPhone: Optional[str] = None


class OrderUpdate(BaseModel):
    status: str


# ==================== 用户管理 ====================

class UserCreate(BaseModel):
    username: str
    password: str
    nickname: Optional[str] = ""
    avatar: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    role: Optional[str] = "user"
    status: Optional[int] = 1


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[int] = None
    password: Optional[str] = None


# ==================== 部门管理 ====================

class DeptCreate(BaseModel):
    name: str
    parentId: Optional[int] = None
    sort: Optional[int] = 0
    leader: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    status: Optional[str] = "启用"


class DeptUpdate(BaseModel):
    name: Optional[str] = None
    parentId: Optional[int] = None
    sort: Optional[int] = None
    leader: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None


# ==================== 角色管理 ====================

class RoleCreate(BaseModel):
    name: str
    roleKey: Optional[str] = ""
    roleSort: Optional[int] = 0
    status: Optional[str] = "启用"
    description: Optional[str] = ""
    permissions: Optional[str] = ""


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    roleKey: Optional[str] = None
    roleSort: Optional[int] = None
    status: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[str] = None


# ==================== 菜单管理 ====================

class MenuCreate(BaseModel):
    name: str
    icon: Optional[str] = ""
    path: Optional[str] = ""
    parentId: Optional[int] = None
    sort: Optional[int] = 0
    type: Optional[str] = "menu"
    status: Optional[str] = "启用"
    component: Optional[str] = ""
    perm: Optional[str] = ""


class MenuUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    path: Optional[str] = None
    parentId: Optional[int] = None
    sort: Optional[int] = None
    type: Optional[str] = None
    status: Optional[str] = None
    component: Optional[str] = None
    perm: Optional[str] = None


# ==================== 司机 ====================

class DriverStatusUpdate(BaseModel):
    status: str


# ==================== 课程 ====================

class CourseProgressUpdate(BaseModel):
    progress: int
    status: str
    students: Optional[int] = None
