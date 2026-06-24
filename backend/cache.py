from datetime import datetime, timedelta
from typing import Any, Optional


class Cache:
    def __init__(self):
        self._data: dict = {}
        self._expiry: dict = {}

    def set(self, key: str, value: Any, ttl_minutes: int = 35):
        self._data[key] = value
        self._expiry[key] = datetime.utcnow() + timedelta(minutes=ttl_minutes)

    def get(self, key: str) -> Optional[Any]:
        if key not in self._data:
            return None
        if datetime.utcnow() > self._expiry[key]:
            del self._data[key]
            del self._expiry[key]
            return None
        return self._data[key]

    def invalidate(self, key: str):
        self._data.pop(key, None)
        self._expiry.pop(key, None)

    def set_last_updated(self):
        self._data["last_updated"] = datetime.utcnow().isoformat() + "Z"

    def get_last_updated(self) -> str:
        return self._data.get("last_updated", "")


cache = Cache()
