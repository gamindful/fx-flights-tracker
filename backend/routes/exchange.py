from fastapi import APIRouter, HTTPException
from backend.cache import cache
from backend.services.exchange_service import get_current_rate, get_bank_rates

router = APIRouter(prefix="/exchange", tags=["exchange"])


@router.get("/data")
async def exchange_data():
    payload = cache.get("exchange_data")
    if payload is None:
        raise HTTPException(status_code=503, detail="Data not yet loaded.")
    return payload


@router.get("/banks")
async def bank_rates():
    cached = cache.get("bank_rates")
    if cached:
        return cached
    rate = get_current_rate()
    result = {"reference_rate": rate, "banks": get_bank_rates(rate), "last_updated": cache.get_last_updated()}
    cache.set("bank_rates", result, ttl_minutes=35)
    return result


@router.get("/current")
async def current_rate():
    return {"rate": get_current_rate(), "pair": "EUR/MXN"}
