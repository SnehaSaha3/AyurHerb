from schemas import CheckStockResponse

def check_stock_availability(available_quantity: float, requested_quantity: float) -> CheckStockResponse:
    """
    Real logic, not mocked — Node owns the Mongo data and passes the
    actual available/requested numbers here so this service stays
    stateless (no duplicated DB credentials across two services).
    """
    if available_quantity < requested_quantity:
        return CheckStockResponse(
            passed=False,
            reason=f"Requested {requested_quantity}, only {available_quantity} available",
        )
    return CheckStockResponse(
        passed=True,
        reason=f"{available_quantity} available, sufficient",
    )