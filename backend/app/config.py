from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://restaurateur:restaurateur_dev@localhost:5432/restaurateur"
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
