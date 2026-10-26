import uuid as uuid_mod
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/pos", tags=["pos & accounting"])


@router.get("/menu", response_model=list[schemas.MenuItemOut])
def list_menu_items(
    available_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    return crud.get_menu_items(db, available_only=available_only)


@router.post("/menu", response_model=schemas.MenuItemOut, status_code=201)
def create_menu_item(data: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    return crud.create_menu_item(db, data)


@router.patch("/menu/{item_id}", response_model=schemas.MenuItemOut)
def update_menu_item(item_id: str, data: schemas.MenuItemUpdate, db: Session = Depends(get_db)):
    try:
        iid = uuid_mod.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid menu item ID")
    item = crud.update_menu_item(db, iid, data)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.delete("/menu/{item_id}", status_code=204)
def delete_menu_item(item_id: str, db: Session = Depends(get_db)):
    try:
        iid = uuid_mod.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid menu item ID")
    if not crud.delete_menu_item(db, iid):
        raise HTTPException(status_code=404, detail="Menu item not found")


@router.get("/accounting", response_model=schemas.AccountingSummaryOut)
def get_accounting_summary(
    target_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    return crud.get_accounting_summary(db, target_date=target_date)


@router.post("/expenses", response_model=schemas.ExpenseOut, status_code=201)
def create_expense(data: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_expense(db, data)


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    try:
        eid = uuid_mod.UUID(expense_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid expense ID")
    if not crud.delete_expense(db, eid):
        raise HTTPException(status_code=404, detail="Expense not found")
