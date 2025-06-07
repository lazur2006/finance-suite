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


# ────────────────────────────────────────────────────────────────
#  Finance-table cells (one cell per month / row / col / year)
# ────────────────────────────────────────────────────────────────
class FinanceCell(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    year: int = Field(index=True)
    row: int
    col: int
    value: float
    revision: int = 0                     # 0-10 ring buffer for undo/redo
    ts: datetime = Field(default_factory=datetime.utcnow)


# ────────────────────────────────────────────────────────────────
#  Row meta-data – one per logical row / year
# ────────────────────────────────────────────────────────────────
class FinanceRow(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    year: int = Field(index=True)
    row: int = Field(index=True)          # immutable row-id
    position: int = 0                     # NEW – display order
    description: str
    deleted: bool = False
    income: bool = False
    ts: datetime = Field(default_factory=datetime.utcnow)


# ────────────────────────────────────────────────────────────────
#  Action log – simple audit trail
# ────────────────────────────────────────────────────────────────
class ActionLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    action: str
    info: Dict[str, Any] = Field(sa_column=Column(SA_JSON))
    ts: datetime = Field(default_factory=datetime.utcnow)


# ────────────────────────────────────────────────────────────────
#  Persisted UI settings blobs
# ────────────────────────────────────────────────────────────────
class Setting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    group: str = Field(index=True)        # "tarif" | "payroll"
    data: Dict[str, Any] = Field(sa_column=Column(SA_JSON))
    ts: datetime = Field(default_factory=datetime.utcnow)
