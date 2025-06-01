
"""Payroll calculator for German net salary estimation (2025)."""
from dataclasses import dataclass, asdict
from typing import Dict, Tuple

# ---------------- 1  Konstanten ----------------
BASIC_ALLOWANCE = 12_096
ZONE1_END, ZONE2_END, ZONE3_END = 17_443, 68_480, 277_825

SOLI_FREE_SINGLE, SOLI_FREE_MARRIED, SOLI_RATE = 19_950, 39_900, .055

KIST_BY_STATE = {"BY": .09, "BW": .09, **{k: .08 for k in
    "NW NI HB HH HE RP SL SH MV SN ST BB BE TH".split()}}

KV_GENERAL, KV_AVG_ADD = .146, .025
PV_BASE, PV_CHILDLESS_SURCH = .036, .006
RV_RATE, AV_RATE = .186, .026

BBG_KV_PV, BBG_RV_AV = 5_512.50, 8_050.00

WK_PAUSCHALE, SONDERAUSG_PAUS, VSP_MAX_RATE = 1_230, 36, .20

# --------------- 2  Steuerfunktionen ----------
def income_tax(zve: float) -> float:
    if zve <= BASIC_ALLOWANCE:
        return 0.0
    if zve <= ZONE1_END:
        y = (zve - BASIC_ALLOWANCE) / 10_000
        return (932.3 * y + 1_400) * y
    if zve <= ZONE2_END:
        z = (zve - ZONE1_END) / 10_000
        return (176.64 * z + 2_397) * z + 1_015.13
    if zve <= ZONE3_END:
        return 0.42 * zve - 10_911.92
    return 0.45 * zve - 19_246.67

def soli(tax: float, married: bool=False) -> float:
    free = SOLI_FREE_MARRIED if married else SOLI_FREE_SINGLE
    if tax <= free:
        return 0.0
    diff = tax - free
    return min(0.19945 * diff, SOLI_RATE * tax) if diff < 1_000 else SOLI_RATE * tax

# --------------- 3  Datenklassen -------------
@dataclass
class PayrollInputData:
    gross: float
    period: str = "monthly"          # 'monthly' | 'yearly'
    tax_class: int = 1
    married: bool = False
    federal_state: str = "NW"
    church: bool = False
    childless: bool = True
    additional_kv: float = KV_AVG_ADD

@dataclass
class PayrollResultData:
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
    def asdict(self) -> Dict:
        return asdict(self)

# --------------- 4  Hauptfunktion -----------
def gross_to_net(data: PayrollInputData) -> PayrollResultData:
    m_gross = data.gross if data.period == "monthly" else data.gross / 12
    a_gross = m_gross * 12

    # Sozialversicherung
    kv_rate = KV_GENERAL + data.additional_kv
    kv_emp = kv_ag = min(m_gross, BBG_KV_PV) * kv_rate / 2

    pv_emp = pv_ag = min(m_gross, BBG_KV_PV) * PV_BASE / 2
    if data.childless:                              # Zuschlag mit BBG-Deckel!
        pv_emp += min(m_gross, BBG_KV_PV) * PV_CHILDLESS_SURCH

    rv_emp = rv_ag = min(m_gross, BBG_RV_AV) * RV_RATE / 2
    av_emp = av_ag = min(m_gross, BBG_RV_AV) * AV_RATE / 2

    sv_emp_annual = 12 * (kv_emp + pv_emp + rv_emp + av_emp)
    vsp = min(sv_emp_annual, VSP_MAX_RATE * a_gross)

    # Steuer
    zvE = a_gross - vsp - WK_PAUSCHALE - SONDERAUSG_PAUS
    tax_y = income_tax(max(0, zvE))
    if   data.tax_class == 3: tax_y = 2 * income_tax(zvE / 2)
    elif data.tax_class == 5: tax_y *= 1.20
    elif data.tax_class == 6: tax_y *= 1.30

    tax_m  = tax_y / 12
    soli_m = soli(tax_y, data.married) / 12
    kist_m = tax_m * KIST_BY_STATE[data.federal_state] if data.church else 0.0

    deductions = tax_m + soli_m + kist_m + kv_emp + pv_emp + rv_emp + av_emp
    net_m = m_gross - deductions
    net   = net_m if data.period == "monthly" else net_m * 12

    return PayrollResultData(
        net=round(net, 2),
        income_tax=round(tax_m if data.period == "monthly" else tax_y, 2),
        solidarity=round(soli_m if data.period == "monthly" else soli_m * 12, 2),
        church_tax=round(kist_m if data.period == "monthly" else kist_m * 12, 2),
        health_employee=round(kv_emp, 2),
        health_employer=round(kv_ag, 2),
        care_employee=round(pv_emp, 2),
        care_employer=round(pv_ag, 2),
        pension_employee=round(rv_emp, 2),
        pension_employer=round(rv_ag, 2),
        unemployment_employee=round(av_emp, 2),
        unemployment_employer=round(av_ag, 2),
    )

def net_to_gross(target_net: float, **kwargs) -> Tuple[float, PayrollResultData]:
    lo, hi = 0.0, target_net * 3
    result = None
    for _ in range(25):
        mid = (lo + hi) / 2
        result = gross_to_net(PayrollInputData(gross=mid, **kwargs))
        hi, lo = (mid, lo) if result.net > target_net else (hi, mid)
    return round(hi, 2), result

