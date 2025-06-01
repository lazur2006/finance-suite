from fastapi import APIRouter, Depends, HTTPException
from . import schemas
from .payroll import gross_to_net, PayrollInputData, net_to_gross
from .tarif import berechne_nrw_2025, TarifInputData, get_monthly_breakdown

router = APIRouter()

@router.post("/payroll/gross-to-net", response_model=schemas.PayrollResult)
def api_gross_to_net(data: schemas.PayrollInput):
    pdata = PayrollInputData(**data.dict())
    result = gross_to_net(pdata)
    return result.asdict()

@router.post("/payroll/net-to-gross")
def api_net_to_gross(data: schemas.PayrollInput):
    target_net = data.gross
    pdata = PayrollInputData(**data.dict())
    gross, result = net_to_gross(target_net, **pdata.__dict__)
    return {"gross": gross, **result.asdict()}

@router.post("/tarif/estimate", response_model=schemas.TarifResult)
def api_tarif_estimate(data: schemas.TarifInput):
    tdata = TarifInputData(**data.dict())
    return berechne_nrw_2025(tdata).asdict()

@router.post("/tarif/breakdown", response_model=list[schemas.MonthlyBreakdown])
def api_tarif_breakdown(data: schemas.TarifInput):
    tdata = TarifInputData(**data.dict())
    return get_monthly_breakdown(tdata)
