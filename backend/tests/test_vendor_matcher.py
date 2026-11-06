import pytest
from app.services.vendor_matcher import VendorMatcher
from app.models.vendor import Vendor
from app.database import get_db, async_session_factory


def test_normalise_vendor_name():
    matcher = VendorMatcher()
    assert matcher.normalise_vendor_name("Aster Office Supplies Pvt Ltd") == "aster office supplies"
    assert matcher.normalise_vendor_name("Aster Office Supplies Private Limited") == "aster office supplies"
    assert matcher.normalise_vendor_name("BluePeak Logistics LLP.") == "bluepeak logistics"
    assert matcher.normalise_vendor_name("Acme Corp, Inc.") == "acme"
    assert matcher.normalise_vendor_name(None) == ""
    assert matcher.normalise_vendor_name("   Special-Characters & Co.   ") == "special characters"


@pytest.mark.asyncio
async def test_vendor_matching_by_tax_id():
    matcher = VendorMatcher()
    async with async_session_factory() as db:
        res = await matcher.match_vendor(
            extracted_name="Some Weird Variant Name",
            extracted_tax_id="27ABCDE1234F1Z5",
            db=db,
        )
        assert res["matched"] is True
        assert res["match_method"] == "tax_id"
        assert res["vendor"].vendor_code == "V-001"
        assert res["tax_id_matches_master"] is True


@pytest.mark.asyncio
async def test_vendor_matching_by_normalised_name():
    matcher = VendorMatcher()
    async with async_session_factory() as db:
        res = await matcher.match_vendor(
            extracted_name="Aster Office Supplies",
            extracted_tax_id=None,
            db=db,
        )
        assert res["matched"] is True
        assert res["match_method"] in ("exact_name", "normalised_name")
        assert res["vendor"].vendor_code == "V-001"


@pytest.mark.asyncio
async def test_vendor_tax_id_mismatch():
    matcher = VendorMatcher()
    async with async_session_factory() as db:
        res = await matcher.match_vendor(
            extracted_name="Aster Office Supplies Pvt Ltd",
            extracted_tax_id="99WRONGTAXID123",
            db=db,
        )
        assert res["matched"] is True
        assert res["tax_id_matches_master"] is False


@pytest.mark.asyncio
async def test_vendor_not_found():
    matcher = VendorMatcher()
    async with async_session_factory() as db:
        res = await matcher.match_vendor(
            extracted_name="NonExistent Vendor 9999",
            extracted_tax_id="000000000000000",
            db=db,
        )
        assert res["matched"] is False
        assert res["vendor"] is None
