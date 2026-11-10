import asyncio
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import delete, select, func
from app.database import async_session_factory
from app.models.review_event import ReviewEvent
from app.models.invoice_decision import InvoiceDecision
from app.models.rule_result import RuleResult
from app.models.run_stage import RunStage
from app.models.invoice_run import InvoiceRun


async def clear_all_invoices():
    async with async_session_factory() as session:
        # Check count before
        count_stmt = select(func.count(InvoiceRun.id))
        total_runs = (await session.execute(count_stmt)).scalar() or 0

        print(f"Found {total_runs} invoice runs in the database.")

        if total_runs > 0:
            print("Purging all invoice runs, decisions, rules, audit events and workflow stages...")
            await session.execute(delete(ReviewEvent))
            await session.execute(delete(InvoiceDecision))
            await session.execute(delete(RuleResult))
            await session.execute(delete(RunStage))
            await session.execute(delete(InvoiceRun))
            await session.commit()
            print(f"Successfully cleaned all {total_runs} invoice runs!")
        else:
            print("Invoice database is already clean.")

        print("Master data (Vendors and Purchase Orders) preserved intact.")


if __name__ == "__main__":
    asyncio.run(clear_all_invoices())
