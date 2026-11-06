from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import VendorResponse

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorResponse])
@router.get("/", response_model=list[VendorResponse])
async def list_vendors(db: AsyncSession = Depends(get_db)):
    stmt = select(Vendor).order_by(Vendor.vendor_code)
    res = await db.execute(stmt)
    return res.scalars().all()
