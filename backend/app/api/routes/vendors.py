from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import VendorResponse
from app.services.cache_service import cache

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorResponse])
@router.get("/", response_model=list[VendorResponse])
async def list_vendors(db: AsyncSession = Depends(get_db)):
    cached = cache.get("vendors:all")
    if cached is not None:
        return cached

    stmt = select(Vendor).order_by(Vendor.vendor_code)
    res = await db.execute(stmt)
    vendors = [VendorResponse.model_validate(v) for v in res.scalars().all()]
    # Cache for 120 seconds
    cache.set("vendors:all", vendors, ttl_seconds=120)
    return vendors
