import logging
import math
import requests
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from backend.config import settings

logger = logging.getLogger(__name__)

BANKS = [
    {"name": "Banxico (referencia)", "buy_spread": -0.000, "sell_spread":  0.000},
    {"name": "BBVA México",          "buy_spread": -0.020, "sell_spread":  0.028},
    {"name": "Citibanamex",          "buy_spread": -0.022, "sell_spread":  0.031},
    {"name": "Santander México",     "buy_spread": -0.019, "sell_spread":  0.027},
    {"name": "HSBC México",          "buy_spread": -0.023, "sell_spread":  0.033},
    {"name": "Banorte",              "buy_spread": -0.021, "sell_spread":  0.030},
    {"name": "Scotiabank México",    "buy_spread": -0.020, "sell_spread":  0.029},
    {"name": "Inbursa",              "buy_spread": -0.017, "sell_spread":  0.025},
    {"name": "Actinver",             "buy_spread": -0.015, "sell_spread":  0.022},
]

# Anchor points for synthetic EUR/MXN history (year, rate)
_ANCHORS = [
    (2003, 11.20), (2006, 13.40), (2009, 18.80), (2012, 16.50),
    (2015, 18.10), (2018, 22.80), (2020, 24.30), (2022, 21.20),
    (2024, 18.90), (2026, 21.84),
]


def _synthetic_eurmxn() -> pd.DataFrame:
    """Deterministic synthetic EUR/MXN monthly series when yfinance is unavailable."""
    rows = []
    anchors = [(datetime(y, 1, 1), r) for y, r in _ANCHORS]
    for i in range(len(anchors) - 1):
        t0, v0 = anchors[i]
        t1, v1 = anchors[i + 1]
        cur = t0
        while cur < t1:
            frac = (cur - t0).days / max((t1 - t0).days, 1)
            val = v0 + (v1 - v0) * frac
            noise = math.sin(cur.toordinal() * 0.17 + 1.4) * 0.28
            rows.append({"date": cur, "close": round(val + noise, 4)})
            cur += relativedelta(months=1)
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)


def get_historical_eurmxn() -> pd.DataFrame:
    logger.info("Downloading EUR/MXN history from Yahoo Finance...")
    try:
        ticker = yf.Ticker("EURMXN=X")
        raw = ticker.history(start="2003-01-01", end=datetime.today().strftime("%Y-%m-%d"))
        if raw.empty:
            raise ValueError("empty response")
        # Remove tz from index before reset to avoid chained-assignment warning
        if raw.index.tzinfo is not None:
            raw.index = raw.index.tz_convert(None)
        df = raw[["Close"]].reset_index()
        df.columns = ["date", "close"]
        df["date"] = pd.to_datetime(df["date"])
        df = df.dropna().sort_values("date").reset_index(drop=True)
        logger.info(f"Downloaded {len(df)} rows.")
        return df
    except Exception as e:
        logger.warning(f"yfinance unavailable ({e}). Using synthetic EUR/MXN data.")
        return _synthetic_eurmxn()


def get_current_rate() -> float:
    token = settings.banxico_token
    if token:
        try:
            url = "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF46410/datos/oportuno"
            resp = requests.get(url, headers={"Bmx-Token": token}, timeout=8)
            rate_str = resp.json()["bmx"]["series"][0]["datos"][-1]["dato"].replace(",", "")
            return float(rate_str)
        except Exception as e:
            logger.warning(f"Banxico API failed: {e}")
    try:
        ticker = yf.Ticker("EURMXN=X")
        price = ticker.fast_info.last_price
        if price and price > 0:
            return round(float(price), 4)
    except Exception as e:
        logger.warning(f"yfinance fast_info failed: {e}")
    # Last-resort: return the last synthetic anchor value
    return _ANCHORS[-1][1]


def get_bank_rates(reference: float) -> list[dict]:
    rows = []
    for bank in BANKS:
        buy = round(reference * (1 + bank["buy_spread"]), 4)
        sell = round(reference * (1 + bank["sell_spread"]), 4)
        rows.append({"name": bank["name"], "buy": buy, "sell": sell, "spread": round(sell - buy, 4)})
    return sorted(rows, key=lambda x: x["sell"])
