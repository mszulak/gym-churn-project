from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Gym Churn Prediction API"
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgrespassword@localhost:5432/gym_churn"
    SECRET_KEY: str = "development_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
