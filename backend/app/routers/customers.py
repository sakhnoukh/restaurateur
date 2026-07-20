from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=list[schemas.CustomerOut])
def list_customers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = Query(None, description="Search by name or phone number"),
    db: Session = Depends(get_db),
):
    return crud.get_customers(db, skip=skip, limit=limit, search=search)


@router.get("/{customer_id}", response_model=schemas.CustomerDetail)
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    import uuid as uuid_mod
    try:
        cid = uuid_mod.UUID(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    customer = crud.get_customer(db, cid)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/", response_model=schemas.CustomerOut, status_code=201)
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db)):
    existing = crud.get_customer_by_phone(db, data.phone_number)
    if existing:
        raise HTTPException(status_code=409, detail="Customer with this phone number already exists")
    return crud.create_customer(db, data)


@router.patch("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(customer_id: str, data: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    import uuid as uuid_mod
    try:
        cid = uuid_mod.UUID(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    customer = crud.get_customer(db, cid)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return crud.update_customer(db, customer, data)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    import uuid as uuid_mod
    try:
        cid = uuid_mod.UUID(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    customer = crud.get_customer(db, cid)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    crud.delete_customer(db, customer)
