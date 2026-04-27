import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration shared across all environments."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-change-in-production")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Required for Neon PostgreSQL — drops stale serverless connections
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {"sslmode": "require"},
    }

    # JWT tokens expire after 24 hours
    JWT_ACCESS_TOKEN_EXPIRES = 86400

    # Swagger config
    SWAGGER = {
        "title": "Eventura API",
        "description": "REST API for the Eventura Event Management Platform",
        "version": "1.0.0",
        "uiversion": 3,
        "termsOfService": "",
        "hide_top_bar": True,
    }


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_ECHO = True  # logs all SQL queries to console — helpful for debugging


class TestingConfig(Config):
    """Testing environment — uses a separate test database."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL")
    SQLALCHEMY_ECHO = False
    # Disable JWT expiry checks during testing
    JWT_ACCESS_TOKEN_EXPIRES = False


class ProductionConfig(Config):
    """Production environment — all values must come from environment variables."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_ECHO = False

    @classmethod
    def validate(cls):
        """Call this on startup to ensure all required env vars are set."""
        required = ["SECRET_KEY", "JWT_SECRET_KEY", "DATABASE_URL"]
        missing = [var for var in required if not os.environ.get(var)]
        if missing:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing)}"
            )


# Map string names to config classes
# Used in app factory: app.config.from_object(config_map["development"])
config_map = {
    "development": DevelopmentConfig,
    "testing":     TestingConfig,
    "production":  ProductionConfig,
}
