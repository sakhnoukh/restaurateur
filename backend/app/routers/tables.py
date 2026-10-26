import uuid as uuid_mod
from datetime import date, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/tables", tags=["tables"])


@router.get("", response_model=list[schemas.TableOut])
@router.get("/", response_model=list[schemas.TableOut], include_in_schema=False)
def list_tables(
    active_only: bool = Query(False, description="Return only active tables"),
    db: Session = Depends(get_db),
):
    return crud.get_tables(db, active_only=active_only)


@router.get("/availability", response_model=list[schemas.TableAvailabilityOut])
def check_tables_availability(
    target_date: date = Query(default_factory=date.today, alias="date"),
    target_time: Optional[time] = Query(None, alias="time"),
    pax: Optional[int] = Query(None, ge=1),
    exclude_reservation_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    exclude_uuid = None
    if exclude_reservation_id:
        try:
            exclude_uuid = uuid_mod.UUID(exclude_reservation_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid exclude_reservation_id")
    return crud.get_tables_availability(
        db,
        target_date=target_date,
        target_time=target_time,
        pax=pax,
        exclude_reservation_id=exclude_uuid,
    )


@router.get("/rates", response_model=list[schemas.RateRuleOut])
def list_rate_rules(db: Session = Depends(get_db)):
    return crud.get_rate_rules(db)


@router.post("/rates", response_model=schemas.RateRuleOut, status_code=201)
def create_rate_rule(data: schemas.RateRuleCreate, db: Session = Depends(get_db)):
    return crud.create_rate_rule(db, data)


@router.delete("/rates/{rule_id}", status_code=204)
def delete_rate_rule(rule_id: str, db: Session = Depends(get_db)):
    try:
        rid = uuid_mod.UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid rate rule ID")
    if not crud.delete_rate_rule(db, rid):
        raise HTTPException(status_code=404, detail="Rate rule not found")


@router.get("/quote", response_model=schemas.RateQuoteOut)
def get_rate_quote(
    target_date: date = Query(default_factory=date.today, alias="date"),
    target_time: time = Query(default=time(19, 0), alias="time"),
    pax: int = Query(default=2, ge=1),
    table_number: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    customer_no_shows: int = Query(default=0),
    db: Session = Depends(get_db),
):
    return crud.calculate_rate_quote(
        db,
        target_date=target_date,
        target_time=target_time,
        pax=pax,
        table_number=table_number,
        section=section,
        customer_no_shows=customer_no_shows,
    )


@router.post("", response_model=schemas.TableOut, status_code=201)
@router.post("/", response_model=schemas.TableOut, status_code=201, include_in_schema=False)
def create_table(data: schemas.TableCreate, db: Session = Depends(get_db)):
    existing = crud.get_table_by_number(db, data.table_number)
    if existing:
        raise HTTPException(status_code=409, detail=f"Table {data.table_number} already exists")
    return crud.create_table(db, data)


@router.patch("/{table_id}", response_model=schemas.TableOut)
def update_table(table_id: str, data: schemas.TableUpdate, db: Session = Depends(get_db)):
    try:
        tid = uuid_mod.UUID(table_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid table ID")
    table = crud.get_table(db, tid)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return crud.update_table(db, table, data)


@router.delete("/{table_id}", status_code=204)
def delete_table(table_id: str, db: Session = Depends(get_db)):
    try:
        tid = uuid_mod.UUID(table_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid table ID")
    table = crud.get_table(db, tid)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    crud.delete_table(db, table)
