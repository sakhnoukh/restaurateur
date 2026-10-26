from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    customers,
    reservations,
    dashboard,
    tables,
    pos,
    marketing,
    operations,
    booking,
)

app = FastAPI(
    title="Restaurateur API",
    description="AI-Powered Restaurant Reservation, POS, Operations & CRM Platform",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix="/api")
app.include_router(reservations.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(tables.router, prefix="/api")
app.include_router(pos.router, prefix="/api")
app.include_router(marketing.router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(booking.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "service": "restaurateur-api", "version": "0.3.0"}
