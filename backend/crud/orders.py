"""
CRUD - 订单
"""
from sqlalchemy.orm import Session
from models import Order


def get_order_list(db: Session, page: int = 1, page_size: int = 10,
                   status: str = None, keyword: str = None):
    q = db.query(Order)
    if status:
        q = q.filter(Order.status == status)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(
            Order.orderNo.like(like) |
            Order.customerName.like(like) |
            Order.customerPhone.like(like)
        )
    total = q.count()
    items = q.order_by(Order.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_order_by_id(db: Session, order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()


def create_order(db: Session, data: dict):
    order = Order(**data)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def update_order_status(db: Session, order_id: int, status: str):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        order.status = status
        order.updateTime = __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.commit()
        db.refresh(order)
    return order


def get_dashboard_stats(db: Session):
    from datetime import datetime, timedelta
    orders = db.query(Order).all()
    drivers_count = db.query(__import__("models").Driver).count()

    total = len(orders)
    today = datetime.now().strftime("%Y-%m-%d")
    today_count = sum(1 for o in orders if o.createTime.startswith(today))
    monthly = datetime.now().strftime("%Y-%m")
    monthly_revenue = sum(o.amount for o in orders if o.createTime.startswith(monthly))

    # 最近7天订单趋势
    order_trend = []
    for i in range(6, -1, -1):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        count = sum(1 for o in orders if o.createTime.startswith(d))
        order_trend.append({"date": d, "count": count})

    # 12个月收入趋势
    revenue_trend = []
    for i in range(11, -1, -1):
        m = (datetime.now().replace(day=1) - timedelta(days=30 * i)).strftime("%Y-%m")
        amount = sum(o.amount for o in orders if o.createTime.startswith(m))
        revenue_trend.append({"date": m, "amount": round(amount, 2)})

    return {
        "totalOrders": total,
        "todayOrders": today_count,
        "monthlyRevenue": round(monthly_revenue, 2),
        "activeDrivers": drivers_count,
        "orderTrend": order_trend,
        "revenueTrend": revenue_trend,
    }
