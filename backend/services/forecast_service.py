import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=1)


def _run_forecast(df: pd.DataFrame) -> dict:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    # Monthly resample, train only on pre-2020 data
    train = df[df["date"] < "2020-01-01"].copy()
    monthly_train = train.set_index("date").resample("MS")["close"].last().dropna()

    if len(monthly_train) < 24:
        raise ValueError(f"Not enough training data: {len(monthly_train)} months")

    model = ExponentialSmoothing(
        monthly_train,
        trend="add",
        seasonal="add",
        seasonal_periods=12,
        damped_trend=True,
        initialization_method="estimated",
    )
    fit = model.fit(optimized=True)

    # Forecast horizon: end of training → 3 years from now
    future_end = datetime.now() + timedelta(days=365 * 3)
    forecast_idx = pd.date_range(
        start=monthly_train.index[-1] + pd.DateOffset(months=1),
        end=future_end,
        freq="MS",
    )
    yhat = fit.forecast(len(forecast_idx))

    # Growing confidence band based on residual std
    resid_std = float(fit.resid.std())
    forecast_out = []
    for i, (date, val) in enumerate(zip(forecast_idx, yhat)):
        spread = resid_std * (1 + i * 0.03) * 1.96
        forecast_out.append({
            "date": date.strftime("%Y-%m-%d"),
            "yhat": round(float(val), 4),
            "yhat_lower": round(max(0.0, float(val) - spread), 4),
            "yhat_upper": round(float(val) + spread, 4),
        })

    # Full historical series (monthly, all years available)
    monthly_all = df.set_index("date").resample("MS")["close"].last().dropna()
    historical_out = [
        {"date": d.strftime("%Y-%m-%d"), "value": round(float(v), 4)}
        for d, v in monthly_all.items()
    ]

    return {
        "historical": historical_out,
        "forecast": forecast_out,
        "training_cutoff": "2019-12-31",
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


async def generate_forecast(df: pd.DataFrame) -> dict:
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_forecast, df)
