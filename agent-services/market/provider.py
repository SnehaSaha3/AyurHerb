from market.mock_data import get_market_data


def get_market_reference(
    crop_name: str,
    state: str | None = None,
    district: str | None = None,
):
    data = get_market_data(crop_name)

    if not data:
        return None

    if state:
        data["state"] = state

    if district:
        data["district"] = district

    return data