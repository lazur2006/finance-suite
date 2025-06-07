from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import delete as sqldelete, update as sqlupdate
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


def log_action(session: Session, action: str, info: dict) -> None:
    """Tiny audit-trail – one log line per API call."""
    session.add(models.ActionLog(action=action, info=info))
    session.commit()


# ───────────────────────── payroll / tarif ─────────────────────────
@router.post("/payroll/gross-to-net", response_model=schemas.PayrollResult)
def payroll_g2n(data: schemas.PayrollInput, s: Session = Depends(db)):
    res = gross_to_net(PayrollInputData(**data.dict())).asdict()
    log_action(s, "payroll_g2n", {"input": data.dict(), "result": res})
    return res


@router.post("/tarif/estimate", response_model=schemas.TarifResult)
def tarif_estimate(data: schemas.TarifInput, s: Session = Depends(db)):
    res = berechne_nrw_2025(TarifInputData(**data.dict())).asdict()
    log_action(s, "tarif_estimate", {"input": data.dict(), "result": res})
    return res


@router.post("/tarif/breakdown", response_model=list[schemas.MonthlyBreakdown])
def tarif_breakdown(data: schemas.TarifInput, s: Session = Depends(db)):
    res = get_monthly_breakdown(TarifInputData(**data.dict()))
    log_action(s, "tarif_breakdown", {"input": data.dict()})
    return res


# ───────────────────────── row-meta persistence ─────────────────────────
@router.get("/finance/{year}/rows", response_model=dict[int, schemas.RowMeta])
def finance_rows(year: int, s: Session = Depends(db)):
    rows = s.exec(
        select(models.FinanceRow).where(
            models.FinanceRow.year == year
        )
    ).all()
    # return keyed by immutable row-id
    out = {r.row: schemas.RowMeta(**r.dict()) for r in rows}
    log_action(s, "finance_rows", {"year": year})
    return out


@router.post("/finance/row", response_model=schemas.RowMeta)
def save_row(meta: schemas.RowMeta, s: Session = Depends(db)):
    rec = s.exec(
        select(models.FinanceRow).where(
            models.FinanceRow.year == meta.year,
            models.FinanceRow.row == meta.row,
        )
    ).first()
    if rec:
        # update editable fields
        rec.description = meta.description
        rec.deleted = meta.deleted
        rec.income = meta.income
        rec.position = meta.position                # NEW
    else:
        rec = models.FinanceRow(**meta.dict())
        s.add(rec)
    s.commit()
    s.refresh(rec)
    log_action(s, "save_row", {"row": rec.row, "year": rec.year})
    return schemas.RowMeta(**rec.dict())


@router.delete("/finance/row/{year}/{row}", status_code=204)
def delete_row(year: int, row: int, s: Session = Depends(db)):
    """
    Logically delete a row (hide it in the UI) **and** zero-out all values
    so the deleted row no longer influences carry-over calculations.
    """
    # 1) mark meta-record as deleted (create if missing)
    meta = s.exec(
        select(models.FinanceRow).where(
            models.FinanceRow.year == year,
            models.FinanceRow.row == row,
        )
    ).first()
    if not meta:
        meta = models.FinanceRow(year=year, row=row, description="", deleted=True)
        s.add(meta)
    else:
        meta.deleted = True

    # 2) hard-delete the numeric cells to keep the DB small
    s.execute(
        sqldelete(models.FinanceCell).where(
            models.FinanceCell.year == year,
            models.FinanceCell.row == row,
        )
    )
    s.commit()
    log_action(s, "delete_row", {"year": year, "row": row})
    return


# ───────────────────────── finance-table snapshots ─────────────────────────
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
    cells = s.exec(stmt).all()
    log_action(s, "finance_year", {"year": year})
    return cells


@router.post("/finance/cell", response_model=schemas.Cell)
def save_cell(cell: schemas.Cell, s: Session = Depends(db)):
    """
    Up-sert a single table cell inside the current revision.
    """
    query = select(models.FinanceCell).where(
        models.FinanceCell.year == cell.year,
        models.FinanceCell.row == cell.row,
        models.FinanceCell.col == cell.col,
        models.FinanceCell.revision == cell.revision,
    )
    db_cell = s.exec(query).first()
    old_val = db_cell.value if db_cell else None
    if db_cell:
        db_cell.value = cell.value
    else:
        db_cell = models.FinanceCell(**cell.dict())
        s.add(db_cell)

    s.commit()
    s.refresh(db_cell)
    log_action(
        s,
        "save_cell",
        {
            "year": cell.year,
            "row": cell.row,
            "col": cell.col,
            "old": old_val,
            "new": cell.value,
            "revision": cell.revision,
        },
    )
    return db_cell


@router.post("/finance/revision/{year}/{direction}", response_model=int)
def shift_revision(year: int, direction: str, s: Session = Depends(db)):
    """
    Create a new revision snapshot and return its id.
    direction: **undo** | **redo**
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

    # if the target revision already exists just return it
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
    log_action(
        s, "shift_revision", {"year": year, "direction": direction, "revision": target}
    )
    return target


# ───────────────────────── wipe a complete year ─────────────────────────
@router.delete("/finance/{year}/reset", status_code=204)
def reset_year(year: int, tasks: BackgroundTasks, s: Session = Depends(db)):
    """
    Delete **all** FinanceCell rows for the given year (across *all* revisions).
    Runs asynchronously so the HTTP request returns immediately.
    """

    def _delete():
        s.execute(sqldelete(models.FinanceCell).where(models.FinanceCell.year == year))
        s.execute(sqldelete(models.FinanceRow).where(models.FinanceRow.year == year))
        s.commit()
        log_action(s, "reset_year", {"year": year})

    tasks.add_task(_delete)
    return


# ───────────────────────── user settings persistence ────────────────────────
@router.get("/settings/{group}", response_model=schemas.Settings)
def get_settings(group: str, s: Session = Depends(db)):
    rec = s.exec(
        select(models.Setting)
        .where(models.Setting.group == group)
        .order_by(models.Setting.ts.desc())
    ).first()
    data = rec.data if rec else {}
    log_action(s, "get_settings", {"group": group})
    return data


@router.post("/settings/{group}", response_model=schemas.Settings)
def save_settings(group: str, payload: dict, s: Session = Depends(db)):
    s.add(models.Setting(group=group, data=payload))
    s.commit()
    log_action(s, "save_settings", {"group": group})
    return payload
