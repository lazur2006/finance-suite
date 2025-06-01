
"""
Centralised DB helpers.

▪ we map **SQLModel.Session** into a session-maker so the objects returned
  by SessionLocal() expose the convenient .exec() convenience wrapper.
▪ init_db() is called from *main.py* during application start-up to make
  sure the tables are present (simple auto-migration for dev / demo use-cases).
"""
from __future__ import annotations

import os

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@db:5432/finance",
)

# set SQL_ECHO=1 in the environment if you want to see all SQL in the logs
engine = create_engine(DATABASE_URL, echo=os.getenv("SQL_ECHO") == "1")

# IMPORTANT: class_=Session → each instance is *sqlmodel.Session* (has .exec)
SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


def init_db() -> None:
    """Create all tables that are still missing."""
    SQLModel.metadata.create_all(engine)

