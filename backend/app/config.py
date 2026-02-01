"""
Application configuration settings.
Loads environment variables and provides configuration for the application.
"""
from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database Configuration
    # Required - must be set in environment
    database_url: str
    
    # AWS Cognito Configuration
    # Required for JWT token verification
    aws_region: str = "us-east-2"
    cognito_user_pool_id: str  # Required - no default
    cognito_client_id: str  # Required - no default
    
    # CORS Configuration
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,https://dfw-project.vercel.app"
    
    # Application Configuration
    debug: bool = True
    log_level: str = "INFO"
    
    # Data limits
    max_export_rows: int = 5000
    default_page_size: int = 1000
    max_page_size: int = 10000
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse allowed origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def cognito_issuer(self) -> str:
        """Get the Cognito issuer URL."""
        return f"https://cognito-idp.{self.aws_region}.amazonaws.com/{self.cognito_user_pool_id}"
    
    @property
    def cognito_jwks_url(self) -> str:
        """Get the Cognito JWKS URL."""
        return f"{self.cognito_issuer}/.well-known/jwks.json"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

