
from backend.app.payroll import gross_to_net, PayrollInputData


def test_gross_to_net_basic():
    inp = PayrollInputData(gross=4000)
    res = gross_to_net(inp)
    assert res.net > 0

