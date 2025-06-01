
from datetime import datetime
from typing import Optional, Dict, Any

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON as SA_JSON


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
#  Finance-table cells (one cell per month / row / col / year)
# ─────────────────────────────────────────────────────────────────────────────
class FinanceCell(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    year: int = Field(index=True)
    row: int
    col: int
    value: float
    revision: int = 0                     # 0–10 ring buffer for undo/redo
    ts: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
#  Persisted settings (latest snapshot is loaded as defaults)
# ─────────────────────────────────────────────────────────────────────────────
class Setting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    group: str = Field(index=True)        # "tarif" | "payroll"
    # JSON column needs explicit SQLAlchemy Column wrapper ⬇
    data: Dict[str, Any] = Field(sa_column=Column(SA_JSON))
    ts: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
#  Action logs (chronological list of user actions)
# ─────────────────────────────────────────────────────────────────────────────
class ActionLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    action: str
    info: Dict[str, Any] = Field(sa_column=Column(SA_JSON))
    ts: datetime = Field(default_factory=datetime.utcnow)

