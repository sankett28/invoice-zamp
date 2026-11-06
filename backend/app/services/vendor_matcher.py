import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.vendor import Vendor


class VendorMatcher:
    def normalise_vendor_name(self, name: str | None) -> str:
        """
        Normalises vendor name by:
        - Lowercasing
        - Stripping legal entity suffixes (Pvt Ltd, Private Limited, LLP, Inc, Corp, Co)
        - Stripping punctuation and extra whitespace
        """
        if not name:
            return ""
        s = name.lower()
        # Remove common business suffixes
        suffixes = [
            r"\bpvt\.?\s*ltd\.?\b",
            r"\bprivate\s+limited\b",
            r"\blimited\b",
            r"\bltd\.?\b",
            r"\bllp\b",
            r"\binc\.?\b",
            r"\bcorp\.?\b",
            r"\bco\.?\b",
        ]
        for pattern in suffixes:
            s = re.sub(pattern, "", s)
        # Remove punctuation except alphanumeric and space
        s = re.sub(r"[^\w\s]", " ", s)
        # Collapse multiple spaces
        return re.sub(r"\s+", " ", s).strip()

    async def match_vendor(
        self,
        extracted_name: str | None,
        extracted_tax_id: str | None,
        db: AsyncSession,
    ) -> dict:
        """
        Matches extracted vendor data against vendor master.
        Returns:
            {
                "matched": bool,
                "vendor": Vendor | None,
                "match_method": "tax_id" | "exact_name" | "normalised_name" | None,
                "confidence": float,
                "multiple_matches": bool,
                "tax_id_matches_master": bool | None,
                "message": str
            }
        """
        # 1. Try tax_id match if present
        if extracted_tax_id:
            clean_tax_id = extracted_tax_id.strip().upper()
            stmt = select(Vendor).where(Vendor.tax_id == clean_tax_id)
            result = await db.execute(stmt)
            vendor = result.scalars().first()
            if vendor:
                return {
                    "matched": True,
                    "vendor": vendor,
                    "match_method": "tax_id",
                    "confidence": 1.0,
                    "multiple_matches": False,
                    "tax_id_matches_master": True,
                    "message": f"Exact tax ID match found: {vendor.legal_name} ({vendor.vendor_code}).",
                }

        # 2. Try exact legal_name match
        if extracted_name:
            clean_name = extracted_name.strip()
            stmt = select(Vendor).where(Vendor.legal_name.ilike(clean_name))
            result = await db.execute(stmt)
            vendor = result.scalars().first()
            if vendor:
                tax_match = None
                if extracted_tax_id and vendor.tax_id:
                    tax_match = (extracted_tax_id.strip().upper() == vendor.tax_id.strip().upper())

                return {
                    "matched": True,
                    "vendor": vendor,
                    "match_method": "exact_name",
                    "confidence": 0.98,
                    "multiple_matches": False,
                    "tax_id_matches_master": tax_match,
                    "message": f"Exact name match: {vendor.legal_name} ({vendor.vendor_code}).",
                }

        # 3. Try normalised name match
        norm_input = self.normalise_vendor_name(extracted_name)
        if norm_input:
            stmt = select(Vendor)
            result = await db.execute(stmt)
            all_vendors = result.scalars().all()

            matches = []
            for v in all_vendors:
                v_norm = self.normalise_vendor_name(v.legal_name)
                if norm_input == v_norm or norm_input in v_norm or v_norm in norm_input:
                    matches.append(v)

            if len(matches) == 1:
                vendor = matches[0]
                tax_match = None
                if extracted_tax_id and vendor.tax_id:
                    tax_match = (extracted_tax_id.strip().upper() == vendor.tax_id.strip().upper())

                return {
                    "matched": True,
                    "vendor": vendor,
                    "match_method": "normalised_name",
                    "confidence": 0.90,
                    "multiple_matches": False,
                    "tax_id_matches_master": tax_match,
                    "message": f"Normalised name match: {vendor.legal_name} ({vendor.vendor_code}).",
                }
            elif len(matches) > 1:
                return {
                    "matched": False,
                    "vendor": None,
                    "match_method": None,
                    "confidence": 0.0,
                    "multiple_matches": True,
                    "tax_id_matches_master": None,
                    "message": f"Multiple vendors matched name '{extracted_name}'. Human review required.",
                }

        return {
            "matched": False,
            "vendor": None,
            "match_method": None,
            "confidence": 0.0,
            "multiple_matches": False,
            "tax_id_matches_master": None,
            "message": f"No vendor record found matching '{extracted_name}'.",
        }
