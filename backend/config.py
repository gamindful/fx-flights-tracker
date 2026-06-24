from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    amadeus_api_key: Optional[str] = None
    amadeus_api_secret: Optional[str] = None
    banxico_token: Optional[str] = None
    refresh_interval_minutes: int = 30
    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
