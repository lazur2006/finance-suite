"""
Centralised DB helpers – now with a small retry loop so the API waits
until Postgres is actually ready before running migrations.
"""
from __future__ import annotations

import os
import time
from typing import Callable

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError  # NEW

# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@db:5432/finance",
)

# set SQL_ECHO=1 in the environment if you want to see all SQL in the logs
engine = create_engine(DATABASE_URL, echo=os.getenv("SQL_ECHO") == "1")

# IMPORTANT: class_=Session → each instance is *sqlmodel.Session* (has .exec)
SessionLocal: Callable[[], Session] = sessionmaker(
    bind=engine, class_=Session, expire_on_commit=False
)

# ---------------------------------------------------------------------------


def init_db(retries: int = 10, delay: int = 2) -> None:
    """
    Create all tables that are still missing.

    The container may start before Postgres finishes initialising; we therefore
    retry the connection a few times instead of crashing immediately.
    """
    for attempt in range(1, retries + 1):
        try:
            SQLModel.metadata.create_all(engine)
            return
        except OperationalError as exc:
            if attempt == retries:
                raise
            print(
                f"[init_db] Postgres not ready (attempt {attempt}/{retries}): "
                f"{exc}\n→ retrying in {delay}s ..."
            )
            time.sleep(delay)
