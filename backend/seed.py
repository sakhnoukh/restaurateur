"""Seed the database with demo data for local development."""
from datetime import date, time, timedelta

from app.database import SessionLocal, engine, Base
from app.models import Customer, Reservation, ReservationStatus, LoyaltyTier


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Customer).count() > 0:
        print("Database already has data. Skipping seed.")
        db.close()
        return

    today = date.today()

    customers = [
        Customer(phone_number="+201001234567", name="Khaled Mansour", loyalty_tier=LoyaltyTier.vip,
                 total_visits=24, lifetime_spend=48000, no_show_count=0, preferred_pax=2, tags=["VIP", "Regular"]),
        Customer(phone_number="+201001234568", name="Ahmed Hassan", loyalty_tier=LoyaltyTier.gold,
                 total_visits=12, lifetime_spend=18000, no_show_count=1, preferred_pax=4, tags=["Gold"]),
        Customer(phone_number="+201001234569", name="Mariam Adel", loyalty_tier=LoyaltyTier.silver,
                 total_visits=5, lifetime_spend=6000, no_show_count=0, preferred_pax=2, tags=["Silver"]),
        Customer(phone_number="+201001234570", name="Omar Khaled", loyalty_tier=LoyaltyTier.none,
                 total_visits=2, lifetime_spend=1500, no_show_count=2, preferred_pax=6, tags=["Frequent No-Show"]),
        Customer(phone_number="+201001234571", name="Salma Ibrahim", loyalty_tier=LoyaltyTier.gold,
                 total_visits=15, lifetime_spend=22500, no_show_count=0, preferred_pax=3, tags=["Gold", "Regular"]),
    ]
    db.add_all(customers)
    db.flush()

    reservations = [
        Reservation(customer_id=customers[0].id, date=today, time=time(13, 0), pax=2,
                    status=ReservationStatus.expected, table_number=4),
        Reservation(customer_id=customers[1].id, date=today, time=time(14, 0), pax=4,
                    status=ReservationStatus.expected, table_number=7),
        Reservation(customer_id=customers[2].id, date=today, time=time(14, 30), pax=2,
                    status=ReservationStatus.seated, table_number=2),
        Reservation(customer_id=customers[3].id, date=today, time=time(15, 0), pax=6,
                    status=ReservationStatus.completed, table_number=10),
        Reservation(customer_id=customers[4].id, date=today, time=time(19, 0), pax=3,
                    status=ReservationStatus.expected, table_number=5),
        Reservation(customer_id=customers[0].id, date=today, time=time(20, 0), pax=2,
                    status=ReservationStatus.expected, table_number=4, notes="Window seat preferred"),
        Reservation(customer_id=customers[1].id, date=today + timedelta(days=1), time=time(13, 0), pax=4,
                    status=ReservationStatus.expected, table_number=7),
        Reservation(customer_id=customers[4].id, date=today + timedelta(days=1), time=time(20, 30), pax=3,
                    status=ReservationStatus.expected, table_number=5),
    ]
    db.add_all(reservations)

    db.commit()
    db.close()
    print("Seed data inserted successfully!")


if __name__ == "__main__":
    seed()
