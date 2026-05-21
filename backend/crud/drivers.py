"""
CRUD - 司机
"""
from sqlalchemy.orm import Session
from models import Driver


def get_driver_list(db: Session, name: str = None, phone: str = None,
                    city: str = None, status: str = None):
    q = db.query(Driver)
    if name:
        q = q.filter(Driver.name.like(f"%{name}%"))
    if phone:
        q = q.filter(Driver.phone.like(f"%{phone}%"))
    if city:
        q = q.filter(Driver.city == city)
    if status:
        q = q.filter(Driver.status == status)
    return q.order_by(Driver.id).all()


def get_driver_by_id(db: Session, driver_id: int):
    return db.query(Driver).filter(Driver.id == driver_id).first()


def update_driver_status(db: Session, driver_id: int, status: str):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if driver:
        driver.status = status
        db.commit()
        db.refresh(driver)
    return driver
