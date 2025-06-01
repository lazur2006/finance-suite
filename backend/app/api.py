
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from .database import SessionLocal
from . import schemas, models
from .payroll import gross_to_net, PayrollInputData
from .tarif import berechne_nrw_2025, TarifInputData, get_monthly_breakdown

router = APIRouter()

# ───────────────────────── helpers ─────────────────────────
def db():
    with SessionLocal() as session:
        yield session


# ───────────────────────── payroll / tarif ─────────────────────────
@router.post("/payroll/gross-to-net", response_model=schemas.PayrollResult)
def payroll_g2n(data: schemas.PayrollInput):
    return gross_to_net(PayrollInputData(**data.dict())).asdict()


@router.post("/tarif/estimate", response_model=schemas.TarifResult)
def tarif_estimate(data: schemas.TarifInput):
    return berechne_nrw_2025(TarifInputData(**data.dict())).asdict()


@router.post("/tarif/breakdown", response_model=list[schemas.MonthlyBreakdown])
def tarif_breakdown(data: schemas.TarifInput):
    return get_monthly_breakdown(TarifInputData(**data.dict()))


# ───────────────────────── finance-table persistence ────────────────────────
@router.get("/finance/{year}", response_model=list[schemas.Cell])
def finance_year(year: int, s: Session = Depends(db)):
    """
    Return the latest *revision* snapshot for the requested year.
    """
    latest_rev = (
        s.exec(
            select(models.FinanceCell.revision)
            .where(models.FinanceCell.year == year)
            .order_by(models.FinanceCell.revision.desc())
            .limit(1)
        ).first()
        or 0
    )
    stmt = select(models.FinanceCell).where(
        models.FinanceCell.year == year, models.FinanceCell.revision == latest_rev
    )
    return s.exec(stmt).all()


@router.post("/finance/cell", response_model=schemas.Cell)
def save_cell(cell: schemas.Cell, s: Session = Depends(db)):
    """
    Up-sert a single table cell.
    All edits are stored inside the *current* revision that the client passes
    back – the UI keeps track of the revision id it is working on.
    """
    query = select(models.FinanceCell).where(
        models.FinanceCell.year == cell.year,
        models.FinanceCell.row == cell.row,
        models.FinanceCell.col == cell.col,
        models.FinanceCell.revision == cell.revision,
    )
    db_cell = s.exec(query).first()
    if db_cell:
        db_cell.value = cell.value
    else:
        db_cell = models.FinanceCell(**cell.dict())
        s.add(db_cell)

    s.commit()
    s.refresh(db_cell)
    return db_cell


@router.post("/finance/revision/{year}/{direction}", response_model=int)
def shift_revision(year: int, direction: str, s: Session = Depends(db)):
    """
    Create a new revision snapshot and return its id.

    * **undo**  → go one step back (min 0)
    * **redo**  → go one step forward (max 10)
    """
    if direction not in {"undo", "redo"}:
        raise HTTPException(400, "direction must be 'undo' or 'redo'")

    latest = (
        s.exec(
            select(models.FinanceCell.revision)
            .where(models.FinanceCell.year == year)
            .order_by(models.FinanceCell.revision.desc())
            .limit(1)
        ).first()
        or 0
    )

    target = max(0, latest - 1) if direction == "undo" else min(latest + 1, 10)
    if target == latest:
        return latest  # nothing to do

    # if the target revision already exists we just return it
    exists = s.exec(
        select(models.FinanceCell.id).where(
            models.FinanceCell.year == year, models.FinanceCell.revision == target
        )
    ).first()
    if exists:
        return target

    # otherwise copy snapshot from the latest revision
    snapshot = s.exec(
        select(models.FinanceCell).where(
            models.FinanceCell.year == year, models.FinanceCell.revision == latest
        )
    ).all()
    for c in snapshot:
        s.add(
            models.FinanceCell(
                year=c.year,
                row=c.row,
                col=c.col,
                value=c.value,
                revision=target,
            )
        )
    s.commit()
    return target


# ───────────────────────── user settings persistence ────────────────────────
@router.get("/settings/{group}", response_model=schemas.Settings)
def get_settings(group: str, s: Session = Depends(db)):
    rec = s.exec(
        select(models.Setting)
        .where(models.Setting.group == group)
        .order_by(models.Setting.ts.desc())
    ).first()
    return rec.data if rec else {}


@router.post("/settings/{group}", response_model=schemas.Settings)
def save_settings(group: str, payload: dict, s: Session = Depends(db)):
    s.add(models.Setting(group=group, data=payload))
    s.commit()
    return payload

