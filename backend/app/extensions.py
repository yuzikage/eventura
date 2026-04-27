from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flasgger import Swagger

# Instantiate extensions without binding to an app yet.
# They get initialised inside the app factory in __init__.py
# This pattern prevents circular imports.

db       = SQLAlchemy()
migrate  = Migrate()
jwt      = JWTManager()
cors     = CORS()
swagger  = Swagger()
