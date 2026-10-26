import uuid as uuid_mod
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/operations", tags=["staff, inventory & maintenance"])


# ---------- Staff ----------

@router.get("/staff", response_model=list[schemas.StaffPerformanceOut])
def list_staff_with_performance(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    perf = crud.get_staff_performance(db)
    if active_only:
        return [s for s in perf if s["is_active"]]
    return perf


@router.post("/staff", response_model=schemas.StaffOut, status_code=201)
def create_staff_member(data: schemas.StaffCreate, db: Session = Depends(get_db)):
    return crud.create_staff_member(db, data)


@router.patch("/staff/{staff_id}", response_model=schemas.StaffOut)
def update_staff_member(staff_id: str, data: schemas.StaffUpdate, db: Session = Depends(get_db)):
    try:
        sid = uuid_mod.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid staff ID")
    member = crud.get_staff_member(db, sid)
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return crud.update_staff_member(db, member, data)


@router.delete("/staff/{staff_id}", status_code=204)
def delete_staff_member(staff_id: str, db: Session = Depends(get_db)):
    try:
        sid = uuid_mod.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid staff ID")
    member = crud.get_staff_member(db, sid)
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    crud.delete_staff_member(db, member)


# ---------- Inventory ----------

@router.get("/inventory", response_model=list[schemas.InventoryItemOut])
def list_inventory_items(db: Session = Depends(get_db)):
    return crud.get_inventory_items(db)


@router.post("/inventory", response_model=schemas.InventoryItemOut, status_code=201)
def create_inventory_item(data: schemas.InventoryItemCreate, db: Session = Depends(get_db)):
    return crud.create_inventory_item(db, data)


@router.patch("/inventory/{item_id}", response_model=schemas.InventoryItemOut)
def update_inventory_item(item_id: str, data: schemas.InventoryItemUpdate, db: Session = Depends(get_db)):
    try:
        iid = uuid_mod.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid inventory item ID")
    item = crud.update_inventory_item(db, iid, data)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.delete("/inventory/{item_id}", status_code=204)
def delete_inventory_item(item_id: str, db: Session = Depends(get_db)):
    try:
        iid = uuid_mod.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid inventory item ID")
    if not crud.delete_inventory_item(db, iid):
        raise HTTPException(status_code=404, detail="Inventory item not found")


# ---------- Maintenance ----------

@router.get("/maintenance", response_model=list[schemas.MaintenanceTicketOut])
def list_maintenance_tickets(db: Session = Depends(get_db)):
    return crud.get_maintenance_tickets(db)


@router.post("/maintenance", response_model=schemas.MaintenanceTicketOut, status_code=201)
def create_maintenance_ticket(data: schemas.MaintenanceTicketCreate, db: Session = Depends(get_db)):
    return crud.create_maintenance_ticket(db, data)


@router.patch("/maintenance/{ticket_id}", response_model=schemas.MaintenanceTicketOut)
def update_maintenance_ticket(
    ticket_id: str, data: schemas.MaintenanceTicketUpdate, db: Session = Depends(get_db)
):
    try:
        tid = uuid_mod.UUID(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid maintenance ticket ID")
    ticket = crud.update_maintenance_ticket(db, tid, data)
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found")
    return ticket


@router.delete("/maintenance/{ticket_id}", status_code=204)
def delete_maintenance_ticket(ticket_id: str, db: Session = Depends(get_db)):
    try:
        tid = uuid_mod.UUID(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid maintenance ticket ID")
    if not crud.delete_maintenance_ticket(db, tid):
        raise HTTPException(status_code=404, detail="Maintenance ticket not found")
