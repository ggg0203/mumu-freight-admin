"""
种子数据导入脚本
首次运行时创建数据库、表并导入初始数据
"""
import sys
import os
# 设置环境变量，避免 pymysql 在 Windows 上的 getpass 问题
os.environ.setdefault('USERNAME', 'root')
sys.path.insert(0, os.path.dirname(__file__))

import pymysql
from database import DATABASE_URL, engine, SessionLocal, init_db
from models import User, Menu, Order, Driver, Course, Dept, Role, AuditLog

# ==================== 种子数据 ====================

SEED_USER = {
    "username": "admin",
    "password": "admin123",
    "nickname": "管理员",
    "email": "admin@mumu.com",
    "phone": "13800138000",
    "role": "admin",
    "status": 1,
}

SEED_ROLES = [
    {"name": "超级管理员", "roleKey": "super_admin", "roleSort": 1, "status": "启用", "description": "系统最高权限，拥有所有功能访问权"},
    {"name": "管理员", "roleKey": "admin", "roleSort": 2, "status": "启用", "description": "日常管理权限，可管理用户和订单"},
    {"name": "调度员", "roleKey": "dispatcher", "roleSort": 3, "status": "启用", "description": "订单调度权限，可分配司机和路线"},
    {"name": "财务", "roleKey": "finance", "roleSort": 4, "status": "启用", "description": "财务相关权限，可查看报表和财务数据"},
    {"name": "普通用户", "roleKey": "user", "roleSort": 5, "status": "启用", "description": "基础查看权限，可查看个人相关数据"},
]

SEED_DEPTS = [
    {"name": "总部", "parentId": None, "sort": 1, "leader": "张三", "phone": "13800000001", "email": "zhangsan@mumu.com", "status": "启用"},
    {"name": "北京分公司", "parentId": 1, "sort": 1, "leader": "李四", "phone": "13800000002", "email": "lisi@mumu.com", "status": "启用"},
    {"name": "上海分公司", "parentId": 1, "sort": 2, "leader": "王五", "phone": "13800000003", "email": "wangwu@mumu.com", "status": "启用"},
    {"name": "广州分公司", "parentId": 1, "sort": 3, "leader": "赵六", "phone": "13800000004", "email": "zhaoliu@mumu.com", "status": "启用"},
    {"name": "深圳分公司", "parentId": 1, "sort": 4, "leader": "钱七", "phone": "13800000005", "email": "qianqi@mumu.com", "status": "启用"},
    {"name": "杭州分公司", "parentId": 1, "sort": 5, "leader": "孙八", "phone": "13800000006", "email": "sunba@mumu.com", "status": "启用"},
    {"name": "财务部", "parentId": None, "sort": 2, "leader": "周九", "phone": "13800000007", "email": "zhoujiu@mumu.com", "status": "启用"},
    {"name": "人事部", "parentId": None, "sort": 3, "leader": "吴十", "phone": "13800000008", "email": "wushi@mumu.com", "status": "启用"},
    {"name": "运营部", "parentId": None, "sort": 4, "leader": "郑一", "phone": "13800000009", "email": "zhengyi@mumu.com", "status": "启用"},
    {"name": "技术部", "parentId": None, "sort": 5, "leader": "陈二", "phone": "13800000010", "email": "chener@mumu.com", "status": "启用"},
]

SEED_MENUS = [
    {"name": "数据概览", "icon": "DashboardOutlined", "path": "/dashboard", "sort": 1},
    {"name": "订单管理", "icon": "OrderedListOutlined", "path": "/order", "sort": 2},
    {"name": "课程管理", "icon": "ReadOutlined", "path": "/course", "sort": 3},
    {"name": "系统设置", "icon": "SettingOutlined", "path": "/settings", "sort": 4},
]

DRIVER_NAMES = ['王大勇', '刘强', '陈明', '赵刚', '孙伟', '周磊', '吴浩', '郑宇', '冯达', '蒋斌', '沈飞', '韩冰', '杨帆', '朱超', '马亮']
CITY_NAMES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市', '天津市', '苏州市', '长沙市', '郑州市', '青岛市']
GOODS_TYPES = ['电子产品', '食品生鲜', '日用百货', '机械设备', '化工原料']


def create_database():
    """创建数据库（如果不存在）"""
    import os
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = int(os.getenv("DB_PORT", "3306"))
    db_user = os.getenv("DB_USER", "root")
    db_pass = os.getenv("DB_PASS", "root")
    conn = pymysql.connect(host=db_host, port=db_port, user=db_user, password=db_pass, charset="utf8mb4")
    cursor = conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS mumu_freight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    conn.commit()
    cursor.close()
    conn.close()
    print("[Seed] 数据库 mumu_freight 已就绪")


def seed_users(db):
    if db.query(User).count() == 0:
        user = User(**SEED_USER)
        db.add(user)
        db.commit()
        print(f"[Seed] 创建用户: {SEED_USER['username']}")
    else:
        print("[Seed] 用户数据已存在，跳过")


def seed_menus(db):
    if db.query(Menu).count() == 0:
        for m in SEED_MENUS:
            db.add(Menu(**m))
        db.commit()
        print(f"[Seed] 创建菜单: {len(SEED_MENUS)} 条")
    else:
        print("[Seed] 菜单数据已存在，跳过")


def seed_drivers(db):
    if db.query(Driver).count() == 0:
        drivers_data = []
        for i, name in enumerate(DRIVER_NAMES):
            drivers_data.append(Driver(
                name=name,
                phone=f"138{str(10000000 + i * 731)[:8]}",
                city=CITY_NAMES[i],
                plateNumber=f"京A·{str(10000 + i * 888)[:5]}",
                rating=round(3.5 + (i % 15) * 0.1, 1),
                orderCount=20 + i * 10,
                status=['空闲', '运输中', '离线'][i % 3],
                registerTime=f"2024-0{(i % 9) + 1}-{str((i % 28) + 1).zfill(2)}",
                age=25 + (i % 20),
                yearsOfExperience=2 + (i % 15),
                idCard=f"1101011990{str(100000 + i)[:6]}",
                address=f"{['北京市海淀区', '上海市浦东新区', '广州市天河区', '深圳市南山区'][i % 4]}路{i + 1}号",
            ))
        for d in drivers_data:
            db.add(d)
        db.commit()
        print(f"[Seed] 创建司机: {len(drivers_data)} 条")
    else:
        print("[Seed] 司机数据已存在，跳过")


def seed_orders(db):
    # 强制重新生成（删除旧数据）
    db.query(Order).delete()
    db.commit()
    import random
    from datetime import datetime, timedelta
    drivers = db.query(Driver).all()
    statuses = ['pending', 'processing', 'completed', 'cancelled']
    now = datetime.now()
    orders_data = []
    for i in range(46):
        driver = drivers[i % len(drivers)]
        origin = CITY_NAMES[random.randint(0, len(CITY_NAMES) - 1)]
        dest = CITY_NAMES[random.randint(0, len(CITY_NAMES) - 1)]
        while dest == origin:
            dest = CITY_NAMES[random.randint(0, len(CITY_NAMES) - 1)]
        days_ago = random.randint(0, 180)
        order_date = now - timedelta(days=days_ago)
        date_str = order_date.strftime("%Y-%m-%d")
        time_str = f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}:00"
        orders_data.append(Order(
            orderNo=f"MUMU{20240101 + i}",
            customerName=['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '陈二'][i % 10],
            customerPhone=f"138{str(10000000 + i)[:8]}",
            origin=origin,
            destination=dest,
            goodsType=GOODS_TYPES[random.randint(0, len(GOODS_TYPES) - 1)],
            weight=round(random.random() * 5000, 2),
            volume=round(random.random() * 100, 2),
            amount=round(random.random() * 50000, 2),
            status=statuses[i % len(statuses)],
            driverName=driver.name,
            driverPhone=driver.phone,
            createTime=f"{date_str} {time_str}",
            updateTime=f"{date_str} {time_str}",
        ))
    for o in orders_data:
        db.add(o)
    db.commit()
    print(f"[Seed] 创建订单: {len(orders_data)} 条")


def seed_courses(db):
    if db.query(Course).count() == 0:
        courses_data = [
            Course(title='货运安全操作规范', category='安全培训', duration='2小时', students=156, progress=100, status='completed', color='#52c41a'),
            Course(title='物流成本核算与管理', category='财务管理', duration='3小时', students=98, progress=60, status='in_progress', color='#1677ff'),
            Course(title='客户沟通技巧进阶', category='服务培训', duration='1.5小时', students=120, progress=30, status='in_progress', color='#faad14'),
            Course(title='运输路线优化策略', category='运营管理', duration='2.5小时', students=85, progress=0, status='not_started', color='#ff4d4f'),
            Course(title='新能源车辆维护指南', category='技术培训', duration='4小时', students=72, progress=0, status='not_started', color='#722ed1'),
            Course(title='危险品运输管理条例', category='法规培训', duration='1小时', students=200, progress=100, status='completed', color='#13c2c2'),
        ]
        for c in courses_data:
            db.add(c)
        db.commit()
        print(f"[Seed] 创建课程: {len(courses_data)} 条")
    else:
        print("[Seed] 课程数据已存在，跳过")


def seed_audit_logs(db):
    """导入初始审计日志数据"""
    # 强制重新生成
    db.query(AuditLog).delete()
    db.commit()
    import random
    from datetime import datetime, timedelta
    now = datetime.now()
    operators = ['admin', '张三', '李四', '王五']
    modules = ['用户管理', '订单管理', '部门管理', '角色管理', '菜单管理', '司机管理']
    actions = ['创建', '编辑', '删除', '查询', '导出']
    results = ['成功', '成功', '成功', '失败']
    audit_data = []
    for i in range(30):
        days_ago = random.randint(0, 30)
        log_time = (now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))).strftime("%Y-%m-%d %H:%M:%S")
        module = modules[i % len(modules)]
        action = actions[i % len(actions)]
        audit_data.append(AuditLog(
            operator=operators[i % len(operators)],
            module=module,
            action=f"{action}{module}",
            target=f"{module}-{i+1}",
            detail=f"{action}了{module}数据",
            ip=f"192.168.1.{random.randint(1, 255)}",
            result=results[i % len(results)],
            time=log_time,
        ))
    for a in audit_data:
        db.add(a)
    db.commit()
    print(f"[Seed] 创建审计日志: {len(audit_data)} 条")


def seed_depts(db):
    """导入初始部门数据"""
    if db.query(Dept).count() == 0:
        depts_data = []
        for d in SEED_DEPTS:
            depts_data.append(Dept(
                name=d["name"],
                parentId=d["parentId"],
                sort=d["sort"],
                leader=d.get("leader", ""),
                phone=d.get("phone", ""),
                email=d.get("email", ""),
                status=d.get("status", "启用")
            ))
        for d in depts_data:
            db.add(d)
        db.commit()
        print(f"[Seed] 创建部门: {len(depts_data)} 条")
    else:
        print("[Seed] 部门数据已存在，跳过")


def seed_roles(db):
    """导入初始角色数据"""
    if db.query(Role).count() == 0:
        roles_data = []
        for r in SEED_ROLES:
            roles_data.append(Role(
                name=r["name"],
                roleKey=r.get("roleKey", ""),
                roleSort=r.get("roleSort", 0),
                status=r.get("status", "启用"),
                description=r.get("description", "")
            ))
        for r in roles_data:
            db.add(r)
        db.commit()
        print(f"[Seed] 创建角色: {len(roles_data)} 条")
    else:
        print("[Seed] 角色数据已存在，跳过")


def main():
    print("=" * 40)
    print("种子数据导入工具")
    print("=" * 40)

    # 创建数据库
    create_database()

    # 初始化表
    init_db()
    print("[Seed] 数据库表已创建")

    # 导入数据
    db = SessionLocal()
    try:
        seed_users(db)
        seed_menus(db)
        seed_depts(db)
        seed_roles(db)
        seed_drivers(db)
        seed_orders(db)
        seed_courses(db)
        seed_audit_logs(db)  # 新增审计日志
        print("=" * 40)
        print("所有种子数据导入完成！")
        print("=" * 40)
    finally:
        db.close()


if __name__ == "__main__":
    main()
