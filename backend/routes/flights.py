from fastapi import APIRouter, Query
from backend.cache import cache
from backend.services.flight_service import get_flight_price_history, get_airlines_for_date

router = APIRouter(prefix="/flights", tags=["flights"])


@router.get("/history")
async def flight_history(dest: str = Query(default="BER")):
    key = f"flight_history_{dest}"
    cached = cache.get(key)
    if cached:
        return cached
    data = get_flight_price_history(dest)
    cache.set(key, data, ttl_minutes=60)
    return data


@router.get("/airlines")
async def airlines_for_date(dest: str = Query(default="BER"), date: str = Query(default=None)):
    from datetime import datetime, timedelta
    date = date or (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    key = f"airlines_{dest}_{date}"
    cached = cache.get(key)
    if cached:
        return cached
    data = await get_airlines_for_date(dest, date)
    cache.set(key, data, ttl_minutes=35)
    return data
