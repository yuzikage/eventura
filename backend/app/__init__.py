from flask import Flask, jsonify
from .extensions import db, migrate, jwt, cors, swagger
from config import config_map


def create_app(env="development"):
    """
    Application factory.
    Creates and configures the Flask app for the given environment.

    Usage:
        app = create_app("development")   # default
        app = create_app("testing")       # for pytest
        app = create_app("production")    # for deployment
    """
    app = Flask(__name__)

    # Load config 
    app.config.from_object(config_map[env])

    # Initialise extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    swagger.init_app(app)

    # Allow requests from the React frontend (localhost:5173 in dev)
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })

    # Register blueprints 
    from .routes.auth        import auth_bp
    from .routes.event_types import event_types_bp
    from .routes.venues      import venues_bp
    from .routes.themes      import themes_bp
    from .routes.packages    import packages_bp
    from .routes.bookings    import bookings_bp
    from .routes.admin       import admin_bp
    from .routes.chat        import chat_bp
    from .routes.booking_review import booking_review_bp
    from .routes.ai_recommend import ai_recommend_bp

    app.register_blueprint(auth_bp,        url_prefix="/api/v1/auth")
    app.register_blueprint(event_types_bp, url_prefix="/api/v1/event-types")
    app.register_blueprint(venues_bp,      url_prefix="/api/v1/venues")
    app.register_blueprint(themes_bp,      url_prefix="/api/v1/themes")
    app.register_blueprint(packages_bp,    url_prefix="/api/v1/packages")
    app.register_blueprint(bookings_bp,    url_prefix="/api/v1/bookings")
    app.register_blueprint(admin_bp,       url_prefix="/api/v1/admin")
    app.register_blueprint(chat_bp,        url_prefix="/api/v1/chat")
    app.register_blueprint(booking_review_bp, url_prefix="/api/v1/bookings")
    app.register_blueprint(ai_recommend_bp, url_prefix="/api/v1/ai/recommend")

    # Import models so Flask-Migrate can detect them
    with app.app_context():
        from .models import user, venue, event_type, theme, theme_image, packages, booking

    # Global error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({ "error": "Bad request", "message": str(e) }), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({ "error": "Unauthorized", "message": "Authentication required" }), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({ "error": "Forbidden", "message": "You do not have permission to perform this action" }), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({ "error": "Not found", "message": str(e) }), 404

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({ "error": "Internal server error", "message": "Something went wrong on our end" }), 500

    # JWT error handlers
    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({ "error": "Unauthorized", "message": "Missing or invalid token" }), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({ "error": "Unauthorized", "message": "Token has expired, please log in again" }), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({ "error": "Unauthorized", "message": "Invalid token" }), 401

    # Health check route
    @app.route("/api/v1/health")
    def health():
        return jsonify({ "status": "ok", "message": "Eventura API is running" }), 200

    return app
