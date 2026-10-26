from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/marketing", tags=["marketing & guest experience"])


@router.get("/segments", response_model=list[schemas.CustomerOut])
def get_segment_audience(
    segment: str = Query("all", description="Segment key: all, vip, gold_vip, high_spenders, regulars, at_risk_no_show, celebrations"),
    db: Session = Depends(get_db),
):
    return crud.get_segment_customers(db, segment)


@router.get("/campaigns", response_model=list[schemas.CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return crud.get_campaigns(db)


@router.post("/campaigns", response_model=schemas.CampaignOut, status_code=201)
def launch_campaign(data: schemas.CampaignCreate, db: Session = Depends(get_db)):
    return crud.create_campaign(db, data)
