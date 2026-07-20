"""Basic API smoke tests."""
import uuid
from datetime import date, time

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from app.main import app
    return TestClient(app)


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_customers_empty(client):
    response = client.get("/api/customers/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_and_delete_customer(client):
    phone = f"+20100{uuid.uuid4().hex[:6]}"
    create_resp = client.post("/api/customers/", json={
        "phone_number": phone,
        "name": "Test Customer",
    })
    assert create_resp.status_code == 201
    customer = create_resp.json()
    assert customer["phone_number"] == phone
    assert customer["name"] == "Test Customer"

    delete_resp = client.delete(f"/api/customers/{customer['id']}")
    assert delete_resp.status_code == 204


def test_create_reservation_auto_creates_customer(client):
    phone = f"+20100{uuid.uuid4().hex[:6]}"
    today = date.today().isoformat()
    resp = client.post("/api/reservations/", json={
        "phone_number": phone,
        "name": "Walk-in Test",
        "date": today,
        "time": "18:00",
        "pax": 3,
    })
    assert resp.status_code == 201
    reservation = resp.json()
    assert reservation["pax"] == 3
    assert reservation["customer"]["phone_number"] == phone

    # cleanup
    client.delete(f"/api/reservations/{reservation['id']}")
    customer_id = reservation["customer_id"]
    client.delete(f"/api/customers/{customer_id}")


def test_dashboard_stats(client):
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_reservations" in data
    assert "total_pax" in data
