"""Seed the database with comprehensive demo data for local development."""
from datetime import date, time, timedelta

from app.database import SessionLocal, engine, Base
from app.models import (
    Customer,
    Reservation,
    Transaction,
    RestaurantTable,
    Staff,
    RateRule,
    MenuItem,
    Expense,
    Campaign,
    InventoryItem,
    MaintenanceTicket,
    ReservationStatus,
    LoyaltyTier,
    StaffRole,
    BookingSource,
    PaymentMethod,
    DepositStatus,
    MaintenancePriority,
    MaintenanceStatus,
)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    today = date.today()

    if db.query(RestaurantTable).count() == 0:
        tables = [
            RestaurantTable(table_number=1, capacity=2, section="Window", min_spend_per_pax=300,
                            x_pos=70, y_pos=70, width=78, height=78, shape="round"),
            RestaurantTable(table_number=2, capacity=2, section="Window", min_spend_per_pax=300,
                            x_pos=70, y_pos=190, width=78, height=78, shape="round"),
            RestaurantTable(table_number=4, capacity=4, section="Window", min_spend_per_pax=350,
                            x_pos=65, y_pos=320, width=90, height=90, shape="square"),
            RestaurantTable(table_number=3, capacity=2, section="Main Dining", min_spend_per_pax=0,
                            x_pos=270, y_pos=80, width=80, height=80, shape="round"),
            RestaurantTable(table_number=5, capacity=4, section="Main Dining", min_spend_per_pax=0,
                            x_pos=265, y_pos=200, width=95, height=95, shape="square"),
            RestaurantTable(table_number=6, capacity=4, section="Main Dining", min_spend_per_pax=0,
                            x_pos=265, y_pos=330, width=95, height=95, shape="square"),
            RestaurantTable(table_number=7, capacity=6, section="Terrace", min_spend_per_pax=400,
                            x_pos=470, y_pos=90, width=140, height=85, shape="rectangle"),
            RestaurantTable(table_number=8, capacity=6, section="Terrace", min_spend_per_pax=400,
                            x_pos=470, y_pos=240, width=140, height=85, shape="rectangle"),
            RestaurantTable(table_number=9, capacity=8, section="Private Room", min_spend_per_pax=750,
                            x_pos=700, y_pos=85, width=165, height=95, shape="booth"),
            RestaurantTable(table_number=10, capacity=10, section="Private Room", min_spend_per_pax=750,
                            x_pos=700, y_pos=245, width=175, height=110, shape="rectangle"),
        ]
        db.add_all(tables)
        db.commit()

    if db.query(RateRule).count() == 0:
        rules = [
            RateRule(
                name="Private Room Minimum Charge",
                section="Private Room",
                day_of_week="All",
                start_time=time(12, 0),
                min_spend_per_pax=750,
                deposit_per_pax=250,
                min_party_size_for_deposit=4,
            ),
            RateRule(
                name="Weekend Terrace Prime Evening",
                section="Terrace",
                day_of_week="Thu,Fri,Sat",
                start_time=time(19, 0),
                min_spend_per_pax=500,
                deposit_per_pax=200,
                min_party_size_for_deposit=4,
            ),
            RateRule(
                name="Window Evening Minimum",
                section="Window",
                day_of_week="All",
                start_time=time(19, 0),
                min_spend_per_pax=350,
                deposit_per_pax=0,
                min_party_size_for_deposit=6,
            ),
        ]
        db.add_all(rules)
        db.commit()

    staff_list = db.query(Staff).all()
    if not staff_list:
        staff_list = [
            Staff(
                name="Youssef El-Masry",
                role=StaffRole.manager,
                phone_number="+201090001111",
                assigned_section="All",
                shift="Full Day (12:00 - 00:00)",
            ),
            Staff(
                name="Nourhan Tarek",
                role=StaffRole.host,
                phone_number="+201090002222",
                assigned_section="Reception",
                shift="Evening (17:00 - 01:00)",
            ),
            Staff(
                name="Karim Nabil",
                role=StaffRole.server,
                phone_number="+201090003333",
                assigned_section="Window",
                shift="Evening (17:00 - 01:00)",
            ),
            Staff(
                name="Hana Mahmoud",
                role=StaffRole.server,
                phone_number="+201090004444",
                assigned_section="Terrace",
                shift="Evening (17:00 - 01:00)",
            ),
            Staff(
                name="Tarek Zaki",
                role=StaffRole.server,
                phone_number="+201090005555",
                assigned_section="Private Room",
                shift="Lunch & Evening",
            ),
            Staff(
                name="Chef Sherif Samir",
                role=StaffRole.chef,
                phone_number="+201090006666",
                assigned_section="Kitchen",
                shift="Full Day",
            ),
        ]
        db.add_all(staff_list)
        db.commit()

    if db.query(MenuItem).count() == 0:
        menu = [
            MenuItem(name="Truffle Burrata Salad", category="Starters", price=420, stock_quantity=25),
            MenuItem(name="Wagyu Beef Carpaccio", category="Starters", price=550, stock_quantity=18),
            MenuItem(name="Grilled Mediterranean Sea Bass", category="Mains", price=890, stock_quantity=20),
            MenuItem(name="Prime Ribeye Steak (350g)", category="Mains", price=1450, stock_quantity=15),
            MenuItem(name="Lobster Linguine", category="Mains", price=1250, stock_quantity=4, low_stock_threshold=5),
            MenuItem(name="Saffron Mushroom Risotto", category="Mains", price=680, stock_quantity=30),
            MenuItem(name="Pistachio San Sebastian Cheesecake", category="Desserts", price=340, stock_quantity=22),
            MenuItem(name="Artisanal Mocktail Carafe", category="Beverages", price=290, stock_quantity=40),
            MenuItem(name="Sparkling Mineral Water (750ml)", category="Beverages", price=120, stock_quantity=80),
        ]
        db.add_all(menu)
        db.commit()

    if db.query(InventoryItem).count() == 0:
        inv = [
            InventoryItem(
                name="Australian Wagyu Tenderloin",
                category="Meat & Poultry",
                unit="kg",
                current_stock=6.5,
                par_level=10.0,
                cost_per_unit=3200,
                supplier="Gourmet Egypt",
            ),
            InventoryItem(
                name="Fresh Sea Bass Fillet",
                category="Seafood",
                unit="kg",
                current_stock=14.0,
                par_level=8.0,
                cost_per_unit=650,
                supplier="Alexandria Catch",
            ),
            InventoryItem(
                name="Italian Burrata Cheese",
                category="Dairy",
                unit="pcs",
                current_stock=4.0,
                par_level=12.0,
                cost_per_unit=180,
                supplier="EuroFoods Import",
            ),
            InventoryItem(
                name="Black Truffle Paste",
                category="Dry Goods",
                unit="jars",
                current_stock=8.0,
                par_level=5.0,
                cost_per_unit=950,
                supplier="EuroFoods Import",
            ),
            InventoryItem(
                name="San Pellegrino 750ml",
                category="Beverages",
                unit="bottles",
                current_stock=48.0,
                par_level=24.0,
                cost_per_unit=55,
                supplier="Beverage Co.",
            ),
        ]
        db.add_all(inv)
        db.commit()

    if db.query(MaintenanceTicket).count() == 0:
        tickets = [
            MaintenanceTicket(
                equipment_name="Terrace Mist Cooling Unit #2",
                location="Terrace",
                issue_description="Low water pressure on east patio nozzle line",
                priority=MaintenancePriority.high,
                status=MaintenanceStatus.in_progress,
                assigned_to="CoolTech HVAC",
                estimated_cost=2800,
            ),
            MaintenanceTicket(
                equipment_name="Rational Combi Oven #1",
                location="Kitchen",
                issue_description="Door gasket seal replacement scheduled",
                priority=MaintenancePriority.medium,
                status=MaintenanceStatus.open,
                assigned_to="KitchenCare Egypt",
                estimated_cost=4500,
            ),
            MaintenanceTicket(
                equipment_name="POS Receipt Printer (Host Stand)",
                location="Reception",
                issue_description="Paper jam roller cleaned and calibrated",
                priority=MaintenancePriority.low,
                status=MaintenanceStatus.resolved,
                assigned_to="Internal IT",
                estimated_cost=0,
            ),
        ]
        db.add_all(tickets)
        db.commit()

    if db.query(Expense).count() == 0:
        expenses = [
            Expense(
                date=today,
                category="Ingredients & Produce",
                description="Morning seafood & fresh herbs delivery",
                amount=6400,
                payment_method=PaymentMethod.cash,
                recorded_by="Chef Sherif Samir",
            ),
            Expense(
                date=today,
                category="Utilities & Maintenance",
                description="Terrace floral arrangements & candles",
                amount=1850,
                payment_method=PaymentMethod.instapay,
                recorded_by="Youssef El-Masry",
            ),
        ]
        db.add_all(expenses)
        db.commit()

    if db.query(Campaign).count() == 0:
        campaigns = [
            Campaign(
                name="Thursday Night Terrace Live Jazz",
                channel="whatsapp",
                target_segment="gold_vip",
                message_template="Hello {{name}}, join us this Thursday on the Terrace for Live Jazz & our new Truffle menu! Reply to reserve your preferred table.",
                recipients_count=3,
                status="sent",
            ),
            Campaign(
                name="VIP Private Dining Tasting Invite",
                channel="whatsapp",
                target_segment="vip",
                message_template="Exclusive invitation for {{name}}: Complimentary Chef's dessert pairing on your next visit.",
                recipients_count=1,
                status="sent",
            ),
        ]
        db.add_all(campaigns)
        db.commit()

    if db.query(Customer).count() == 0:
        customers = [
            Customer(
                phone_number="+201001234567",
                name="Khaled Mansour",
                email="khaled.mansour@example.com",
                loyalty_tier=LoyaltyTier.vip,
                total_visits=24,
                lifetime_spend=48000,
                no_show_count=0,
                preferred_pax=2,
                dietary_notes="Shellfish allergy, prefers sparkling water",
                birthday=date(1985, 10, 28),
                tags=["VIP", "Regular", "Window Lover"],
            ),
            Customer(
                phone_number="+201001234568",
                name="Ahmed Hassan",
                email="ahmed.hassan@example.com",
                loyalty_tier=LoyaltyTier.gold,
                total_visits=12,
                lifetime_spend=18000,
                no_show_count=1,
                preferred_pax=4,
                dietary_notes="Gluten-free bread requested",
                anniversary=date(2018, 11, 12),
                tags=["Gold", "Regular"],
            ),
            Customer(
                phone_number="+201001234569",
                name="Mariam Adel",
                email="mariam.adel@example.com",
                loyalty_tier=LoyaltyTier.silver,
                total_visits=5,
                lifetime_spend=6000,
                no_show_count=0,
                preferred_pax=2,
                tags=["Silver"],
            ),
            Customer(
                phone_number="+201001234570",
                name="Omar Khaled",
                loyalty_tier=LoyaltyTier.none,
                total_visits=2,
                lifetime_spend=1500,
                no_show_count=2,
                preferred_pax=6,
                tags=["Frequent No-Show"],
            ),
            Customer(
                phone_number="+201001234571",
                name="Salma Ibrahim",
                email="salma.ibrahim@example.com",
                loyalty_tier=LoyaltyTier.gold,
                total_visits=15,
                lifetime_spend=22500,
                no_show_count=0,
                preferred_pax=3,
                dietary_notes="Vegetarian",
                birthday=date(1992, 5, 14),
                tags=["Gold", "Regular"],
            ),
        ]
        db.add_all(customers)
        db.flush()

        server_window = next((s for s in staff_list if s.assigned_section == "Window"), staff_list[0])
        server_terrace = next((s for s in staff_list if s.assigned_section == "Terrace"), staff_list[0])
        server_private = next((s for s in staff_list if s.assigned_section == "Private Room"), staff_list[0])

        reservations = [
            Reservation(
                customer_id=customers[0].id,
                server_id=server_window.id,
                date=today,
                time=time(13, 0),
                pax=2,
                status=ReservationStatus.expected,
                table_number=1,
                source=BookingSource.whatsapp,
                occasion="Birthday",
                min_spend_required=600,
            ),
            Reservation(
                customer_id=customers[1].id,
                server_id=server_terrace.id,
                date=today,
                time=time(14, 0),
                pax=4,
                status=ReservationStatus.expected,
                table_number=7,
                source=BookingSource.online,
                min_spend_required=1600,
            ),
            Reservation(
                customer_id=customers[2].id,
                server_id=server_window.id,
                date=today,
                time=time(14, 30),
                pax=2,
                status=ReservationStatus.seated,
                table_number=2,
                source=BookingSource.phone,
                min_spend_required=600,
            ),
            Reservation(
                customer_id=customers[3].id,
                server_id=server_private.id,
                date=today,
                time=time(15, 0),
                pax=6,
                status=ReservationStatus.completed,
                table_number=10,
                source=BookingSource.ota,
                external_booking_ref="OPENTABLE-88412",
                occasion="Business Dinner",
                min_spend_required=4500,
                deposit_amount=1500,
                deposit_status=DepositStatus.paid,
                guest_rating=5,
                guest_feedback="Exceptional service in the private dining room!",
            ),
            Reservation(
                customer_id=customers[4].id,
                server_id=server_terrace.id,
                date=today,
                time=time(19, 0),
                pax=3,
                status=ReservationStatus.expected,
                table_number=5,
                source=BookingSource.online,
                occasion="Anniversary",
            ),
            Reservation(
                customer_id=customers[0].id,
                server_id=server_window.id,
                date=today,
                time=time(20, 0),
                pax=2,
                status=ReservationStatus.expected,
                table_number=4,
                notes="Window seat preferred, sparkling water on arrival",
                source=BookingSource.whatsapp,
                min_spend_required=700,
            ),
            Reservation(
                customer_id=customers[1].id,
                server_id=server_terrace.id,
                date=today + timedelta(days=1),
                time=time(13, 0),
                pax=4,
                status=ReservationStatus.expected,
                table_number=7,
                source=BookingSource.phone,
            ),
            Reservation(
                customer_id=customers[4].id,
                server_id=server_window.id,
                date=today + timedelta(days=1),
                time=time(20, 30),
                pax=3,
                status=ReservationStatus.expected,
                table_number=5,
                source=BookingSource.online,
            ),
        ]
        db.add_all(reservations)
        db.flush()

        db.add_all([
            Transaction(
                reservation_id=reservations[3].id,
                pos_receipt_id="POS-1001",
                amount=5800.0,
                tip_amount=650.0,
                payment_method=PaymentMethod.card,
                items_json=[
                    {"name": "Prime Ribeye Steak (350g)", "price": 1450, "quantity": 3},
                    {"name": "Grilled Mediterranean Sea Bass", "price": 890, "quantity": 1},
                    {"name": "Truffle Burrata Salad", "price": 420, "quantity": 1},
                    {"name": "Sparkling Mineral Water (750ml)", "price": 120, "quantity": 1},
                ],
            ),
        ])
        db.commit()

    db.close()
    print("Seed data inserted successfully!")


if __name__ == "__main__":
    seed()
