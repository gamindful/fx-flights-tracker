import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from backend.cache import cache
from backend.config import settings

logger = logging.getLogger(__name__)
_scheduler: AsyncIOScheduler | None = None


async def refresh_exchange():
    from backend.services.exchange_service import get_historical_eurmxn, get_current_rate
    from backend.services.forecast_service import generate_forecast
    try:
        df = get_historical_eurmxn()
        forecast_data = await generate_forecast(df)
        rate = get_current_rate()
        hist = forecast_data["historical"]
        prev = hist[-2]["value"] if len(hist) > 1 else rate
        change = round(rate - prev, 4)
        cache.set("exchange_data", {
            "current_rate": rate, "change_1d": change,
            "change_pct_1d": round((change / prev) * 100, 2) if prev else 0,
            "chart": forecast_data, "last_updated": cache.get_last_updated() or "",
        }, ttl_minutes=settings.refresh_interval_minutes + 5)
        cache.invalidate("bank_rates")
        cache.set_last_updated()
        logger.info(f"Exchange refreshed. EUR/MXN = {rate}")
    except Exception as e:
        logger.error(f"Exchange refresh failed: {e}", exc_info=True)


async def start_scheduler():
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(refresh_exchange, "interval", minutes=settings.refresh_interval_minutes, id="exchange_refresh")
    _scheduler.start()
    logger.info(f"Scheduler started — every {settings.refresh_interval_minutes} min.")
    asyncio.create_task(refresh_exchange())


async def stop_scheduler():
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
