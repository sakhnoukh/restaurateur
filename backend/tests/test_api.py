"""Comprehensive API tests for Restaurateur full hospitality suite."""
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture(scope="module")
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_customers_empty(client):
    response = client.get("/api/customers")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_lookup_and_delete_customer(client):
    phone = f"+20100{uuid.uuid4().hex[:6]}"
    create_resp = client.post("/api/customers", json={
        "phone_number": phone,
        "name": "Test Customer",
        "preferred_pax": 4,
        "dietary_notes": "Nut allergy",
    })
    assert create_resp.status_code == 201
    customer = create_resp.json()
    assert customer["phone_number"] == phone
    assert customer["name"] == "Test Customer"
    assert customer["preferred_pax"] == 4
    assert customer["dietary_notes"] == "Nut allergy"

    lookup_resp = client.get("/api/customers/lookup", params={"phone": phone})
    assert lookup_resp.status_code == 200
    assert lookup_resp.json()["id"] == customer["id"]

    delete_resp = client.delete(f"/api/customers/{customer['id']}")
    assert delete_resp.status_code == 204


def test_create_reservation_auto_creates_customer_and_updates_unknown_name(client):
    phone = f"+20100{uuid.uuid4().hex[:6]}"
    today = date.today().isoformat()
    resp = client.post("/api/reservations", json={
        "phone_number": phone,
        "name": "Unknown",
        "date": today,
        "time": "18:00",
        "pax": 3,
    })
    assert resp.status_code == 201
    reservation = resp.json()
    assert reservation["pax"] == 3
    assert reservation["customer"]["phone_number"] == phone
    assert reservation["customer"]["name"] == "Unknown"

    resp2 = client.post("/api/reservations", json={
        "phone_number": phone,
        "name": "Nadia Karim",
        "date": today,
        "time": "21:00",
        "pax": 4,
    })
    assert resp2.status_code == 201
    reservation2 = resp2.json()
    assert reservation2["customer"]["name"] == "Nadia Karim"

    client.delete(f"/api/reservations/{reservation['id']}")
    client.delete(f"/api/reservations/{reservation2['id']}")
    client.delete(f"/api/customers/{reservation['customer_id']}")


def test_reservation_status_transitions_and_full_editing(client):
    phone = f"+20100{uuid.uuid4().hex[:6]}"
    today = date.today().isoformat()
    resp = client.post("/api/reservations", json={
        "phone_number": phone,
        "name": "Status Tester",
        "date": today,
        "time": "19:00",
        "pax": 2,
    })
    assert resp.status_code == 201
    res = resp.json()
    rid = res["id"]
    cid = res["customer_id"]

    r1 = client.patch(f"/api/reservations/{rid}", json={"status": "seated"}).json()
    assert r1["customer"]["total_visits"] == 1

    r2 = client.patch(f"/api/reservations/{rid}", json={"status": "completed"}).json()
    assert r2["customer"]["total_visits"] == 1

    r3 = client.patch(f"/api/reservations/{rid}", json={"status": "expected"}).json()
    assert r3["customer"]["total_visits"] == 0

    r4 = client.patch(f"/api/reservations/{rid}", json={"status": "no_show"}).json()
    assert r4["customer"]["no_show_count"] == 1

    r5 = client.patch(f"/api/reservations/{rid}", json={
        "pax": 5,
        "time": "20:30",
        "notes": "Birthday cake",
        "occasion": "Birthday",
        "guest_rating": 5,
        "guest_feedback": "Wonderful evening",
    }).json()
    assert r5["pax"] == 5
    assert r5["time"].startswith("20:30")
    assert r5["occasion"] == "Birthday"
    assert r5["guest_rating"] == 5

    client.delete(f"/api/reservations/{rid}")
    client.delete(f"/api/customers/{cid}")


def test_transactions_pos_menu_and_accounting(client):
    # Create menu item
    m_resp = client.post("/api/pos/menu", json={
        "name": "Test Steak",
        "category": "Mains",
        "price": 1000.0,
        "stock_quantity": 10,
    })
    assert m_resp.status_code == 201
    menu_item = m_resp.json()

    phone = f"+20100{uuid.uuid4().hex[:6]}"
    today = date.today().isoformat()
    res = client.post("/api/reservations", json={
        "phone_number": phone,
        "name": "Loyalty Tester",
        "date": today,
        "time": "20:00",
        "pax": 4,
    }).json()
    rid = res["id"]
    cid = res["customer_id"]

    # Record itemized POS transaction -> deducts stock, updates spend & tier
    tx_resp = client.post(f"/api/reservations/{rid}/transactions", json={
        "amount": 6000.0,
        "tip_amount": 500.0,
        "payment_method": "card",
        "pos_receipt_id": "POS-501",
        "items_json": [{"menu_item_id": menu_item["id"], "name": "Test Steak", "price": 1000.0, "quantity": 2}],
        "mark_completed": True,
    })
    assert tx_resp.status_code == 201

    # Check stock deducted to 8
    menu_list = client.get("/api/pos/menu").json()
    updated_item = next(i for i in menu_list if i["id"] == menu_item["id"])
    assert updated_item["stock_quantity"] == 8

    # Record expense & check accounting summary
    exp_resp = client.post("/api/pos/expenses", json={
        "date": today,
        "category": "Produce",
        "description": "Fresh vegetables",
        "amount": 1500.0,
        "payment_method": "cash",
    })
    assert exp_resp.status_code == 201
    exp = exp_resp.json()

    acct = client.get("/api/pos/accounting", params={"date": today}).json()
    assert acct["gross_revenue"] >= 6000.0
    assert acct["total_tips"] >= 500.0
    assert acct["total_expenses"] >= 1500.0
    assert acct["net_profit"] == acct["gross_revenue"] - acct["total_expenses"]

    # Cleanup
    client.delete(f"/api/pos/expenses/{exp['id']}")
    client.delete(f"/api/pos/menu/{menu_item['id']}")
    client.delete(f"/api/reservations/{rid}")
    client.delete(f"/api/customers/{cid}")


def test_tables_rates_and_conflict_detection(client):
    t_resp = client.post("/api/tables", json={
        "table_number": 42,
        "capacity": 4,
        "section": "Terrace",
        "min_spend_per_pax": 500.0,
    })
    assert t_resp.status_code == 201
    table = t_resp.json()

    today = date.today().isoformat()
    quote = client.get("/api/tables/quote", params={
        "date": today,
        "time": "20:00",
        "pax": 4,
        "table_number": 42,
    }).json()
    assert quote["min_spend_required"] == 2000.0

    phone1 = f"+20100{uuid.uuid4().hex[:6]}"
    phone2 = f"+20100{uuid.uuid4().hex[:6]}"

    res1 = client.post("/api/reservations", json={
        "phone_number": phone1,
        "name": "Guest One",
        "date": today,
        "time": "19:00",
        "pax": 4,
        "table_number": 42,
    })
    assert res1.status_code == 201
    r1_data = res1.json()
    assert r1_data["min_spend_required"] == 2000.0

    conflict = client.post("/api/reservations", json={
        "phone_number": phone2,
        "name": "Guest Two",
        "date": today,
        "time": "19:30",
        "pax": 2,
        "table_number": 42,
    })
    assert conflict.status_code == 409

    client.delete(f"/api/reservations/{r1_data['id']}")
    client.delete(f"/api/customers/{r1_data['customer_id']}")
    client.delete(f"/api/tables/{table['id']}")


def test_online_booking_ota_marketing_and_operations(client):
    today = date.today().isoformat()

    # Online booking slots
    slots = client.get("/api/booking/slots", params={"date": today, "pax": 2})
    assert slots.status_code == 200
    assert len(slots.json()) > 0

    # Public online reservation
    pub_phone = f"+20100{uuid.uuid4().hex[:6]}"
    pub_res = client.post("/api/booking/reserve", json={
        "name": "Online Diner",
        "phone_number": pub_phone,
        "email": "online@example.com",
        "date": today,
        "time": "18:00",
        "pax": 2,
        "occasion": "Anniversary",
        "dietary_notes": "Vegan",
    })
    assert pub_res.status_code == 201
    pub_data = pub_res.json()
    assert pub_data["source"] == "online"
    assert pub_data["customer"]["dietary_notes"] == "Vegan"

    # OTA Webhook booking
    ota_phone = f"+20100{uuid.uuid4().hex[:6]}"
    ota_res = client.post("/api/booking/ota-webhook", json={
        "provider": "SevenRooms",
        "external_ref": "SR-991",
        "guest_name": "OTA Guest",
        "guest_phone": ota_phone,
        "date": today,
        "time": "21:00",
        "party_size": 2,
    })
    assert ota_res.status_code == 201
    ota_data = ota_res.json()
    assert ota_data["source"] == "ota"
    assert ota_data["external_booking_ref"] == "SEVENROOMS-SR-991"

    # Operations: Staff, Inventory, Maintenance
    staff_resp = client.post("/api/operations/staff", json={
        "name": "Waiter One",
        "role": "server",
        "assigned_section": "Terrace",
    })
    assert staff_resp.status_code == 201
    staff_id = staff_resp.json()["id"]

    inv_resp = client.post("/api/operations/inventory", json={
        "name": "Olive Oil",
        "category": "Dry Goods",
        "unit": "L",
        "current_stock": 2.0,
        "par_level": 5.0,
        "cost_per_unit": 400.0,
    })
    assert inv_resp.status_code == 201
    inv_id = inv_resp.json()["id"]

    maint_resp = client.post("/api/operations/maintenance", json={
        "equipment_name": "Espresso Machine",
        "location": "Bar",
        "issue_description": "Steam wand pressure low",
        "priority": "high",
    })
    assert maint_resp.status_code == 201
    maint_id = maint_resp.json()["id"]

    # Marketing campaign
    camp_resp = client.post("/api/marketing/campaigns", json={
        "name": "Weekend Promo",
        "channel": "whatsapp",
        "target_segment": "all",
        "message_template": "Join us this weekend!",
    })
    assert camp_resp.status_code == 201
    assert camp_resp.json()["recipients_count"] >= 2

    # Analytics report
    analytics = client.get("/api/dashboard/analytics")
    assert analytics.status_code == 200
    assert "bookings_by_source" in analytics.json()

    # Cleanup
    client.delete(f"/api/operations/staff/{staff_id}")
    client.delete(f"/api/operations/inventory/{inv_id}")
    client.delete(f"/api/operations/maintenance/{maint_id}")
    client.delete(f"/api/reservations/{pub_data['id']}")
    client.delete(f"/api/customers/{pub_data['customer_id']}")
    client.delete(f"/api/reservations/{ota_data['id']}")
    client.delete(f"/api/customers/{ota_data['customer_id']}")
