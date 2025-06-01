from backend.app.tarif import berechne_nrw_2025, TarifInputData


def test_tarif_basic():
    inp = TarifInputData(entgeltgruppe="EG 1", stufe="Grundentgelt")
    res = berechne_nrw_2025(inp)
    assert res.monatsgesamt > 0
