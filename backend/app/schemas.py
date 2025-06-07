from typing import Dict, Any
from pydantic import BaseModel


# ───────────── payroll / tarif DTOs (unchanged) ─────────────
class PayrollInput(BaseModel):
    gross: float
    period: str = "monthly"
    tax_class: int = 1
    married: bool = False
    federal_state: str = "NW"
    church: bool = False
    childless: bool = True
    additional_kv: float = 0.025


class PayrollResult(BaseModel):
    net: float
    income_tax: float
    solidarity: float
    church_tax: float
    health_employee: float
    health_employer: float
    care_employee: float
    care_employer: float
    pension_employee: float
    pension_employer: float
    unemployment_employee: float
    unemployment_employer: float


class TarifInput(BaseModel):
    entgeltgruppe: str
    stufe: str
    wochenstunden: float = 35
    leistungszulage_pct: float = 0.0
    sonstige_zulage_pct: float = 0.0
    tzug_b_pct: float = 18.5
    urlaubsgeld_pct: float = 72.0
    transformationsgeld_pct: float = 18.4
    tzug_a_pct: float = 27.5
    weihnachtsgeld_pct_base: float = 25.0
    weihnachtsgeld_pct_max: float = 55.0
    betriebszugehoerigkeit_monate: int = 0
    include_transformationsgeld: bool = True


class TarifResult(BaseModel):
    monatsgrund: float
    zulagen: float
    monatsgesamt: float
    tzug_b: float
    urlaubsgeld: float
    transformationsgeld: float
    tzug_a: float
    weihnachtsgeld: float
    jahresentgelt: float


# ───────────── finance-table persistence DTOs ─────────────
class Cell(BaseModel):
    year: int
    row: int
    col: int
    value: float
    revision: int = 0


class RowMeta(BaseModel):
    year: int
    row: int
    position: int = 0          # NEW
    description: str
    deleted: bool = False
    income: bool = False


# ───────────── extra DTO for /tarif/breakdown ─────────────
class MonthlyBreakdown(BaseModel):
    Monat: str
    Brutto: float
    Bestandteile: str


# ───────────── shorthand alias ─────────────
Settings = Dict[str, Any]
