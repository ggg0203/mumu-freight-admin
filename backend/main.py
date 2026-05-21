"""
FastAPI 主应用 - API 路由 + WebSocket 实时推送
"""
import os
# 设置环境变量，避免 pymysql 在 Windows 上的 getpass 问题
os.environ.setdefault('USERNAME', 'root')

import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db
from schemas import (
    ApiResponse, LoginRequest, OrderCreate, OrderUpdate,
    DriverStatusUpdate, CourseProgressUpdate,
    UserCreate, UserUpdate,
    DeptCreate, DeptUpdate,
    RoleCreate, RoleUpdate,
    MenuCreate, MenuUpdate,
)
from crud import (
    get_user_by_username, get_user_by_id, get_user_list,
    create_user, update_user, delete_user,
    get_menus, create_menu, update_menu, delete_menu,
    get_dept_list, create_dept, update_dept, delete_dept,
    get_role_list, create_role, update_role, delete_role,
)
from crud.orders import get_order_list, get_order_by_id, create_order, update_order_status, get_dashboard_stats
from crud.drivers import get_driver_list, get_driver_by_id, update_driver_status
from crud.courses import get_course_list, update_course_progress, get_audit_logs, create_audit_log


app = FastAPI(title="幕幕货运管理系统 API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== WebSocket 实时推送 ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({
            "type": event_type,
            "data": data,
            "timestamp": int(datetime.now().timestamp() * 1000),
        }, ensure_ascii=False)
        for ws in self.active_connections:
            try:
                await ws.send_text(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)


# ==================== 用户 ====================

@app.post("/api/user/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_username(db, req.username)
    if not user or user.password != req.password:
        return ApiResponse(code=401, message="用户名或密码错误")
    return ApiResponse(data={
        "token": f"token_{user.username}_{int(datetime.now().timestamp())}",
        "userInfo": {
            "id": user.id, "username": user.username,
            "nickname": user.nickname, "avatar": user.avatar or "",
            "email": user.email or "", "phone": user.phone or "",
            "role": user.role, "status": user.status,
            "createTime": str(user.createTime) if user.createTime else "",
        },
    })


@app.get("/api/user/info")
async def get_user_info(db: Session = Depends(get_db)):
    user = get_user_by_username(db, "admin")
    if not user:
        return ApiResponse(code=404, message="用户不存在")
    return ApiResponse(data={
        "id": user.id, "username": user.username,
        "nickname": user.nickname, "avatar": user.avatar or "",
        "email": user.email or "", "phone": user.phone or "",
        "role": user.role, "status": user.status,
        "createTime": str(user.createTime) if user.createTime else "",
    })


@app.get("/api/menu/list")
async def get_menu_list(db: Session = Depends(get_db)):
    menus = get_menus(db)
    return ApiResponse(data=[
        {"id": m.id, "name": m.name, "icon": m.icon,
         "path": m.path, "parentId": m.parentId, "sort": m.sort,
         "type": m.type or "menu", "status": m.status or "启用",
         "component": m.component or "", "perm": m.perm or ""}
        for m in menus
    ])


# ==================== Dashboard ====================

@app.get("/api/dashboard/stats")
async def dashboard_stats(db: Session = Depends(get_db)):
    stats = get_dashboard_stats(db)
    return ApiResponse(data=stats)


# ==================== 订单 ====================

@app.get("/api/order/list")
async def order_list(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    status: str = None,
    keyword: str = None,
    db: Session = Depends(get_db),
):
    items, total = get_order_list(db, page, pageSize, status, keyword)
    return ApiResponse(data={
        "list": [
            {"id": o.id, "orderNo": o.orderNo, "customerName": o.customerName,
             "customerPhone": o.customerPhone, "origin": o.origin,
             "destination": o.destination, "goodsType": o.goodsType,
             "weight": o.weight, "volume": o.volume, "amount": o.amount,
             "status": o.status, "driverName": o.driverName,
             "driverPhone": o.driverPhone, "createTime": o.createTime,
             "updateTime": o.updateTime}
            for o in items
        ],
        "total": total, "page": page, "pageSize": pageSize,
    })


@app.get("/api/order/detail/{order_id}")
async def order_detail(order_id: int, db: Session = Depends(get_db)):
    order = get_order_by_id(db, order_id)
    if not order:
        return ApiResponse(code=404, message="订单不存在")
    return ApiResponse(data={
        "id": order.id, "orderNo": order.orderNo,
        "customerName": order.customerName, "customerPhone": order.customerPhone,
        "origin": order.origin, "destination": order.destination,
        "goodsType": order.goodsType, "weight": order.weight,
        "volume": order.volume, "amount": order.amount,
        "status": order.status, "driverName": order.driverName,
        "driverPhone": order.driverPhone, "createTime": order.createTime,
        "updateTime": order.updateTime,
    })


@app.post("/api/order/create")
async def order_create(req: OrderCreate, db: Session = Depends(get_db)):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    order_data = req.model_dump()
    order_data["orderNo"] = f"MUMU{int(datetime.now().timestamp())}"
    order_data["createTime"] = now
    order_data["updateTime"] = now
    order = create_order(db, order_data)
    await manager.broadcast("order.created", {
        "id": order.id, "orderNo": order.orderNo,
        "customerName": order.customerName,
        "origin": order.origin, "destination": order.destination,
        "status": order.status,
    })
    return ApiResponse(data={"id": order.id, "orderNo": order.orderNo})


@app.put("/api/order/status/{order_id}")
async def order_status_update(order_id: int, req: OrderUpdate, db: Session = Depends(get_db)):
    order = update_order_status(db, order_id, req.status)
    if not order:
        return ApiResponse(code=404, message="订单不存在")
    await manager.broadcast("order.updated", {
        "id": order.id, "orderNo": order.orderNo, "status": order.status,
    })
    return ApiResponse(message="状态已更新")


# ==================== 司机 ====================

@app.get("/api/driver/list")
async def driver_list(
    name: str = None, phone: str = None,
    city: str = None, status: str = None,
    db: Session = Depends(get_db),
):
    drivers = get_driver_list(db, name, phone, city, status)
    return ApiResponse(data=[
        {"id": d.id, "name": d.name, "phone": d.phone,
         "city": d.city, "plateNumber": d.plateNumber,
         "rating": d.rating, "orderCount": d.orderCount,
         "status": d.status, "registerTime": d.registerTime,
         "avatar": d.avatar or "", "age": d.age,
         "yearsOfExperience": d.yearsOfExperience,
         "idCard": d.idCard, "address": d.address}
        for d in drivers
    ])


@app.get("/api/driver/detail/{driver_id}")
async def driver_detail(driver_id: int, db: Session = Depends(get_db)):
    driver = get_driver_by_id(db, driver_id)
    if not driver:
        return ApiResponse(code=404, message="司机不存在")
    return ApiResponse(data={
        "id": driver.id, "name": driver.name, "phone": driver.phone,
        "city": driver.city, "plateNumber": driver.plateNumber,
        "rating": driver.rating, "orderCount": driver.orderCount,
        "status": driver.status, "registerTime": driver.registerTime,
        "avatar": driver.avatar or "", "age": driver.age,
        "yearsOfExperience": driver.yearsOfExperience,
        "idCard": driver.idCard, "address": driver.address,
    })


@app.put("/api/driver/status/{driver_id}")
async def driver_status_update(driver_id: int, req: DriverStatusUpdate,
                                db: Session = Depends(get_db)):
    driver = update_driver_status(db, driver_id, req.status)
    if not driver:
        return ApiResponse(code=404, message="司机不存在")
    await manager.broadcast("driver.status", {
        "id": driver.id, "name": driver.name, "status": driver.status,
    })
    return ApiResponse(message="状态已更新")


# ==================== 课程 ====================

@app.get("/api/course/list")
async def course_list(db: Session = Depends(get_db)):
    courses = get_course_list(db)
    return ApiResponse(data=[
        {"id": c.id, "title": c.title, "category": c.category,
         "duration": c.duration, "students": c.students,
         "progress": c.progress, "status": c.status, "color": c.color}
        for c in courses
    ])


@app.put("/api/course/progress/{course_id}")
async def course_progress_update(course_id: int, req: CourseProgressUpdate,
                                  db: Session = Depends(get_db)):
    course = update_course_progress(db, course_id, req.progress, req.status)
    if not course:
        return ApiResponse(code=404, message="课程不存在")
    return ApiResponse(data={
        "id": course.id, "progress": course.progress, "status": course.status,
    })


# ==================== 审计日志 ====================

@app.get("/api/audit-log/list")
async def audit_log_list(
    page: int = Query(1, ge=1),
    pageSize: int = Query(15, ge=1, le=100),
    module: str = None, action: str = None,
    operator: str = None, keyword: str = None,
    db: Session = Depends(get_db),
):
    items, total = get_audit_logs(db, page, pageSize, module, action, operator, keyword)
    return ApiResponse(data={
        "list": [
            {"id": l.id, "operator": l.operator, "module": l.module,
             "action": l.action, "target": l.target, "detail": l.detail,
             "ip": l.ip, "result": l.result, "time": l.time}
            for l in items
        ],
        "total": total, "page": page, "pageSize": pageSize,
    })


# ==================== 用户管理 ====================

@app.get("/api/user/list")
async def user_list(
    keyword: str = None, role: str = None,
    db: Session = Depends(get_db),
):
    users = get_user_list(db, keyword, role)
    return ApiResponse(data=[
        {"id": u.id, "username": u.username, "nickname": u.nickname,
         "avatar": u.avatar or "", "email": u.email or "",
         "phone": u.phone or "", "role": u.role,
         "status": u.status, "createTime": u.createTime or ""}
        for u in users
    ])


@app.post("/api/user/create")
async def user_create(req: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, req.username):
        return ApiResponse(code=400, message="用户名已存在")
    user = create_user(
        db, username=req.username, password=req.password,
        nickname=req.nickname or "", avatar=req.avatar or "",
        email=req.email or "", phone=req.phone or "",
        role=req.role or "user", status=req.status or 1,
    )
    await manager.broadcast("user.created", {"id": user.id, "username": user.username})
    return ApiResponse(data={"id": user.id, "username": user.username})


@app.put("/api/user/{user_id}")
async def user_update(user_id: int, req: UserUpdate, db: Session = Depends(get_db)):
    user = update_user(db, user_id, **req.model_dump(exclude_none=True))
    if not user:
        return ApiResponse(code=404, message="用户不存在")
    await manager.broadcast("user.updated", {"id": user.id, "username": user.username})
    return ApiResponse(message="更新成功")


@app.delete("/api/user/{user_id}")
async def user_delete(user_id: int, db: Session = Depends(get_db)):
    if not delete_user(db, user_id):
        return ApiResponse(code=404, message="用户不存在")
    await manager.broadcast("user.deleted", {"id": user_id})
    return ApiResponse(message="删除成功")


# ==================== 部门管理 ====================

@app.get("/api/dept/list")
async def dept_list(keyword: str = None, db: Session = Depends(get_db)):
    depts = get_dept_list(db, keyword)
    return ApiResponse(data=[
        {"id": d.id, "name": d.name, "parentId": d.parentId,
         "sort": d.sort, "createTime": d.createTime or "",
         "leader": d.leader or "", "phone": d.phone or "",
         "email": d.email or "", "status": d.status or "启用"}
        for d in depts
    ])


@app.post("/api/dept/create")
async def dept_create(req: DeptCreate, db: Session = Depends(get_db)):
    dept = create_dept(
        db, name=req.name, parentId=req.parentId, sort=req.sort or 0,
        leader=req.leader or "", phone=req.phone or "",
        email=req.email or "", status=req.status or "启用"
    )
    await manager.broadcast("dept.created", {"id": dept.id, "name": dept.name})
    return ApiResponse(data={"id": dept.id})


@app.put("/api/dept/{dept_id}")
async def dept_update(dept_id: int, req: DeptUpdate, db: Session = Depends(get_db)):
    dept = update_dept(db, dept_id, **req.model_dump(exclude_none=True))
    if not dept:
        return ApiResponse(code=404, message="部门不存在")
    await manager.broadcast("dept.updated", {"id": dept.id, "name": dept.name})
    return ApiResponse(message="更新成功")


@app.delete("/api/dept/{dept_id}")
async def dept_delete(dept_id: int, db: Session = Depends(get_db)):
    if not delete_dept(db, dept_id):
        return ApiResponse(code=404, message="部门不存在")
    await manager.broadcast("dept.deleted", {"id": dept_id})
    return ApiResponse(message="删除成功")


# ==================== 角色管理 ====================

@app.get("/api/role/list")
async def role_list(keyword: str = None, db: Session = Depends(get_db)):
    roles = get_role_list(db, keyword)
    return ApiResponse(data=[
        {"id": r.id, "name": r.name, "roleKey": r.roleKey or "",
         "roleSort": r.roleSort or 0, "status": r.status or "启用",
         "description": r.description or "",
         "permissions": r.permissions or "", "createTime": r.createTime or ""}
        for r in roles
    ])


@app.post("/api/role/create")
async def role_create(req: RoleCreate, db: Session = Depends(get_db)):
    role = create_role(
        db, name=req.name,
        description=req.description or "",
        permissions=req.permissions or "",
        roleKey=req.roleKey or "",
        roleSort=req.roleSort or 0,
        status=req.status or "启用"
    )
    await manager.broadcast("role.created", {"id": role.id, "name": role.name})
    return ApiResponse(data={"id": role.id})


@app.put("/api/role/{role_id}")
async def role_update(role_id: int, req: RoleUpdate, db: Session = Depends(get_db)):
    role = update_role(db, role_id, **req.model_dump(exclude_none=True))
    if not role:
        return ApiResponse(code=404, message="角色不存在")
    await manager.broadcast("role.updated", {"id": role.id, "name": role.name})
    return ApiResponse(message="更新成功")


@app.delete("/api/role/{role_id}")
async def role_delete(role_id: int, db: Session = Depends(get_db)):
    if not delete_role(db, role_id):
        return ApiResponse(code=404, message="角色不存在")
    await manager.broadcast("role.deleted", {"id": role_id})
    return ApiResponse(message="删除成功")


# ==================== 菜单管理（新增/编辑/删除）====================

@app.post("/api/menu/create")
async def menu_create(req: MenuCreate, db: Session = Depends(get_db)):
    menu = create_menu(
        db, name=req.name,
        icon=req.icon or "", path=req.path or "",
        parentId=req.parentId, sort=req.sort or 0,
        type=req.type or "menu", status=req.status or "启用",
        component=req.component or "", perm=req.perm or ""
    )
    await manager.broadcast("menu.created", {"id": menu.id, "name": menu.name})
    return ApiResponse(data={"id": menu.id})


@app.put("/api/menu/{menu_id}")
async def menu_update(menu_id: int, req: MenuUpdate, db: Session = Depends(get_db)):
    menu = update_menu(db, menu_id, **req.model_dump(exclude_none=True))
    if not menu:
        return ApiResponse(code=404, message="菜单不存在")
    await manager.broadcast("menu.updated", {"id": menu.id, "name": menu.name})
    return ApiResponse(message="更新成功")


@app.delete("/api/menu/{menu_id}")
async def menu_delete(menu_id: int, db: Session = Depends(get_db)):
    if not delete_menu(db, menu_id):
        return ApiResponse(code=404, message="菜单不存在")
    await manager.broadcast("menu.deleted", {"id": menu_id})
    return ApiResponse(message="删除成功")


# ==================== 启动 ====================

@app.on_event("startup")
def startup():
    init_db()
    print("[Backend] 数据库表已创建，服务运行在 http://localhost:8080")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
