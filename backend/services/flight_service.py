import logging
import math
import httpx
from datetime import datetime, timedelta
from backend.config import settings

logger = logging.getLogger(__name__)

SEASONAL = [0.85, 0.87, 0.92, 1.08, 0.94, 1.02, 1.22, 1.18, 0.90, 0.88, 0.96, 1.25]
MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
BASE_PRICES = {"BER": 17_000, "HAM": 16_000, "HAJ": 15_500, "DRS": 16_200}
HISTORY_YEARS = [2022, 2023, 2024, 2025]

AIRLINE_PROFILES = {
    "BER": [
        {"airline": "Iberia",          "code": "IB", "via": "Madrid (MAD)",    "mult": 0.96, "duration": "17h 10min"},
        {"airline": "KLM",             "code": "KL", "via": "Ámsterdam (AMS)", "mult": 1.00, "duration": "16h 20min"},
        {"airline": "Air France",      "code": "AF", "via": "París (CDG)",     "mult": 1.05, "duration": "16h 45min"},
        {"airline": "Aeroméxico",      "code": "AM", "via": "París (CDG)",     "mult": 1.09, "duration": "17h 00min"},
        {"airline": "Lufthansa",       "code": "LH", "via": "Frankfurt (FRA)", "mult": 1.14, "duration": "15h 30min"},
        {"airline": "British Airways", "code": "BA", "via": "Londres (LHR)",   "mult": 1.18, "duration": "15h 55min"},
    ],
    "HAM": [
        {"airline": "KLM",        "code": "KL", "via": "Ámsterdam (AMS)", "mult": 0.97, "duration": "15h 50min"},
        {"airline": "Air France", "code": "AF", "via": "París (CDG)",     "mult": 1.04, "duration": "16h 30min"},
        {"airline": "Lufthansa",  "code": "LH", "via": "Frankfurt (FRA)", "mult": 1.11, "duration": "15h 10min"},
    ],
    "HAJ": [
        {"airline": "KLM",       "code": "KL", "via": "Ámsterdam (AMS)", "mult": 0.96, "duration": "15h 40min"},
        {"airline": "Lufthansa", "code": "LH", "via": "Frankfurt (FRA)", "mult": 1.06, "duration": "14h 55min"},
    ],
    "DRS": [
        {"airline": "Swiss",     "code": "LX", "via": "Zúrich (ZRH)",   "mult": 0.97, "duration": "16h 05min"},
        {"airline": "Lufthansa", "code": "LH", "via": "Múnich (MUC)",   "mult": 1.06, "duration": "15h 20min"},
    ],
}


def _noise(seed: float) -> float:
    return math.sin(seed * 7.3 + 1.4) * 0.05


def get_flight_price_history(dest_code: str) -> dict:
    base = BASE_PRICES.get(dest_code, 17_000)
    today = datetime.now()
    monthly = []
    for mi, label in enumerate(MONTH_LABELS):
        by_year: dict = {}
        all_prices: list = []
        for yi, yr in enumerate(HISTORY_YEARS):
            if yr > today.year or (yr == today.year and mi > today.month - 1):
                continue
            price = round(base * SEASONAL[mi] * (1 + yi * 0.032) * (1 + _noise(yr + mi * 0.1)) / 500) * 500
            by_year[yr] = price
            all_prices.append(price)
        if all_prices:
            mean = round(sum(all_prices) / len(all_prices) / 500) * 500
            lo = round(min(all_prices) * 0.87 / 500) * 500
            hi = round(max(all_prices) * 1.13 / 500) * 500
        else:
            mean = lo = hi = None
        monthly.append({"month": mi + 1, "month_label": label, "mean": mean,
                        "min": lo, "max": hi, "by_year": by_year})
    return {"dest": dest_code, "years": HISTORY_YEARS, "monthly": monthly,
            "generated_at": datetime.utcnow().isoformat() + "Z"}


def estimate_airlines_for_date(dest_code: str, date_str: str) -> list[dict]:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        dt = datetime.now() + timedelta(days=30)
    mi, yr = dt.month - 1, dt.year
    base_price = BASE_PRICES.get(dest_code, 17_000) * SEASONAL[mi] * \
                 (1 + max(0, yr - 2022) * 0.032) * (1 + _noise(yr + mi * 0.1))
    return sorted([
        {"airline": a["airline"], "code": a["code"], "via": a["via"],
         "price_mxn": round(base_price * a["mult"] / 500) * 500,
         "duration": a["duration"], "stops": 1}
        for a in AIRLINE_PROFILES.get(dest_code, [])
    ], key=lambda x: x["price_mxn"])


_amadeus_token: str | None = None
_token_expires: datetime = datetime.min


async def _get_amadeus_token(client: httpx.AsyncClient) -> str | None:
    global _amadeus_token, _token_expires
    if _amadeus_token and datetime.utcnow() < _token_expires:
        return _amadeus_token
    key, secret = settings.amadeus_api_key, settings.amadeus_api_secret
    if not key or not secret:
        return None
    try:
        resp = await client.post(
            "https://test.api.amadeus.com/v1/security/oauth2/token",
            data={"grant_type": "client_credentials", "client_id": key, "client_secret": secret},
            timeout=10)
        data = resp.json()
        _amadeus_token = data["access_token"]
        _token_expires = datetime.utcnow() + timedelta(seconds=int(data["expires_in"]) - 60)
        return _amadeus_token
    except Exception as e:
        logger.warning(f"Amadeus token error: {e}")
        return None


async def get_airlines_for_date(dest_code: str, date_str: str) -> dict:
    airlines, source = [], "estimate"
    if settings.amadeus_api_key and settings.amadeus_api_secret:
        async with httpx.AsyncClient() as client:
            token = await _get_amadeus_token(client)
            if token:
                try:
                    resp = await client.get(
                        "https://test.api.amadeus.com/v2/shopping/flight-offers",
                        headers={"Authorization": f"Bearer {token}"},
                        params={"originLocationCode": "MEX", "destinationLocationCode": dest_code,
                                "departureDate": date_str, "adults": 1, "max": 6, "currencyCode": "MXN"},
                        timeout=15)
                    for offer in resp.json().get("data", []):
                        it = offer["itineraries"][0]
                        seg = it["segments"]
                        airlines.append({
                            "airline": seg[0]["carrierCode"], "code": seg[0]["carrierCode"],
                            "via": seg[0]["arrival"]["iataCode"] if len(seg) > 1 else "",
                            "price_mxn": int(float(offer["price"]["grandTotal"])),
                            "duration": it["duration"].replace("PT","").replace("H","h ").replace("M","min"),
                            "stops": len(seg) - 1})
                    airlines = sorted(airlines, key=lambda x: x["price_mxn"])
                    source = "amadeus"
                except Exception as e:
                    logger.warning(f"Amadeus search failed: {e}")
    if not airlines:
        airlines = estimate_airlines_for_date(dest_code, date_str)
    return {"dest": dest_code, "date": date_str, "airlines": airlines, "source": source}
