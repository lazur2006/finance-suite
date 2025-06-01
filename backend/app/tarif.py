
"""IG Metall NRW 2025 tariff calculator."""
from dataclasses import dataclass, asdict
from typing import Dict, List, Any

TARIF_NRW_2025: Dict[str, Dict[str, float]] = {
    "EG 1":  {"Grundentgelt": 2_705.00},
    "EG 2":  {"Grundentgelt": 2_738.00},
    "EG 3":  {"Grundentgelt": 2_769.50},
    "EG 4":  {"Grundentgelt": 2_812.50},
    "EG 5":  {"Grundentgelt": 2_871.50},
    "EG 6":  {"Grundentgelt": 2_946.00},
    "EG 7":  {"Grundentgelt": 3_038.00},
    "EG 8":  {"Grundentgelt": 3_196.00},
    "EG 9":  {"Grundentgelt": 3_454.00},
    "EG 10": {"Grundentgelt": 3_796.50},
    "EG 11": {"Grundentgelt": 4_257.00},
    "EG 12": {"bis 36. Monat": 4_387.00, "nach 36. Monat": 4_872.00},
    "EG 13": {
        "bis 18. Monat": 4_902.00,
        "nach 18. Monat": 5_190.50,
        "nach 36. Monat": 5_766.50,
    },
    "EG 14": {
        "bis 12. Monat": 5_568.50,
        "nach 12. Monat": 5_917.00,
        "nach 24. Monat": 6_265.50,
        "nach 36. Monat": 6_962.50,
    },
}

TZUG_B_REF = TARIF_NRW_2025["EG 8"]["Grundentgelt"]

STANDARD_HOURS = 35

@dataclass
class TarifInputData:
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

@dataclass
class TarifResultData:
    monatsgrund: float
    zulagen: float
    monatsgesamt: float
    tzug_b: float
    urlaubsgeld: float
    transformationsgeld: float
    tzug_a: float
    weihnachtsgeld: float
    jahresentgelt: float
    def asdict(self):
        return asdict(self)


def berechne_nrw_2025(inp: TarifInputData) -> TarifResultData:
    eg_data = TARIF_NRW_2025.get(inp.entgeltgruppe)
    if not eg_data:
        raise ValueError("Unbekannte Entgeltgruppe.")
    if inp.stufe not in eg_data:
        raise ValueError(
            f"Stufe '{inp.stufe}' in {inp.entgeltgruppe} nicht hinterlegt."
        )
    grund_tab = eg_data[inp.stufe]

    faktor = inp.wochenstunden / STANDARD_HOURS
    grund_zeit = grund_tab * faktor

    lz = grund_zeit * inp.leistungszulage_pct / 100
    sonst = grund_zeit * inp.sonstige_zulage_pct / 100
    monatsgesamt = grund_zeit + lz + sonst

    tzug_b = TZUG_B_REF * inp.tzug_b_pct / 100 * faktor
    urlaubsgeld = monatsgesamt * inp.urlaubsgeld_pct / 100
    transformationsgeld = (
        monatsgesamt * inp.transformationsgeld_pct / 100
        if inp.include_transformationsgeld else 0.0
    )
    tzug_a = monatsgesamt * inp.tzug_a_pct / 100

    wg_pct = (
        inp.weihnachtsgeld_pct_max if inp.betriebszugehoerigkeit_monate >= 36
        else inp.weihnachtsgeld_pct_base
    )
    weihnachtsgeld = monatsgesamt * wg_pct / 100

    jahresentgelt = (
        monatsgesamt * 12 +
        tzug_b + urlaubsgeld + transformationsgeld + tzug_a + weihnachtsgeld
    )

    return TarifResultData(
        monatsgrund=round(grund_zeit, 2),
        zulagen=round(lz + sonst, 2),
        monatsgesamt=round(monatsgesamt, 2),
        tzug_b=round(tzug_b, 2),
        urlaubsgeld=round(urlaubsgeld, 2),
        transformationsgeld=round(transformationsgeld, 2),
        tzug_a=round(tzug_a, 2),
        weihnachtsgeld=round(weihnachtsgeld, 2),
        jahresentgelt=round(jahresentgelt, 2),
    )


def get_monthly_breakdown(inp: TarifInputData) -> List[Dict[str, Any]]:
    res = berechne_nrw_2025(inp)
    base = res.monatsgesamt

    def record(month: str, gross: float, components: List[str]):
        return {
            "Monat": month,
            "Brutto": round(gross, 2),
            "Bestandteile": ", ".join(components)
        }

    months: List[Dict[str, Any]] = []
    months.append(record("Januar", base, ["Grund-/Zulagen"]))
    months.append(record("Februar", base + res.tzug_b, ["Grund-/Zulagen", "T-ZUG B"]))
    months.append(record("März", base, ["Grund-/Zulagen"]))
    months.append(record("April", base, ["Grund-/Zulagen"]))
    months.append(record("Mai", base, ["Grund-/Zulagen"]))
    months.append(record("Juni", base + res.urlaubsgeld, ["Grund-/Zulagen", "Urlaubsgeld"]))
    comps = ["Grund-/Zulagen", "T-ZUG A"]
    juli_extra = res.tzug_a + res.transformationsgeld
    if res.transformationsgeld:
        comps.append("Transformationsgeld")
    months.append(record("Juli", base + juli_extra, comps))
    months.append(record("August", base, ["Grund-/Zulagen"]))
    months.append(record("September", base, ["Grund-/Zulagen"]))
    months.append(record("Oktober", base, ["Grund-/Zulagen"]))
    months.append(record("November", base + res.weihnachtsgeld, ["Grund-/Zulagen", "Weihnachtsgeld"]))
    months.append(record("Dezember", base, ["Grund-/Zulagen"]))
    return months

