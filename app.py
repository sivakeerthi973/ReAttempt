import os

from flask import Flask, jsonify, redirect, request, send_from_directory
from sqlalchemy import text
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_wtf.csrf import CSRFError
from werkzeug.exceptions import HTTPException

from config import PROJECT_ROOT
from extensions import csrf, db, migrate
from routes import auth_api, backlog_api, material_api, profile_api, task_api
from services.auth import current_user
from services.progress_service import calculate_progress
from services.validation import ApiValidationError


def create_app(test_config=None):
    app = Flask(__name__, instance_path=str(PROJECT_ROOT / "instance"))
    app.config.from_object("config.Config")
    if test_config:
        app.config.update(test_config)
    os.makedirs(app.instance_path, exist_ok=True)

    if os.getenv("TRUST_PROXY", "false").strip().lower() in {"1", "true", "yes", "on"}:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    db.init_app(app)
    migrate.init_app(app, db, directory=str(PROJECT_ROOT / "migrations"))
    csrf.init_app(app)

    from models import Backlog, StudyMaterial, StudyTask, User, UserPreferences  # noqa: F401

    app.register_blueprint(auth_api)
    app.register_blueprint(backlog_api)
    app.register_blueprint(task_api)
    app.register_blueprint(material_api)
    app.register_blueprint(profile_api)

    @app.after_request
    def add_response_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        if app.config.get("ENVIRONMENT") in {"production", "prod"}:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
            response.headers.setdefault("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'self'")
        return response

    @app.get("/api/health")
    def health():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify(status="ok", database="connected"), 200
        except Exception:
            app.logger.exception("Health check could not reach the database.")
            return jsonify(status="degraded", database="unavailable"), 503

    @app.errorhandler(ApiValidationError)
    def validation_error(error):
        return jsonify(error="invalid_request", message=error.message), error.status_code

    @app.errorhandler(CSRFError)
    def csrf_error(error):
        if request.path.startswith("/api/"):
            return jsonify(error="csrf_failed", message="Security token expired. Refresh and try again."), 400
        return error.description, 400

    @app.errorhandler(HTTPException)
    def http_error(error):
        if request.path.startswith("/api/"):
            code = "not_found" if error.code == 404 else "request_failed"
            return jsonify(error=code, message=error.description), error.code
        return error

    @app.errorhandler(Exception)
    def unexpected_error(error):
        app.logger.exception("Unhandled application error.")
        if request.path.startswith("/api/"):
            return jsonify(error="internal_error", message="The request could not be completed."), 500
        return "An unexpected error occurred.", 500

    @app.get("/")
    @app.get("/index.html")
    def landing_page():
        return send_from_directory(PROJECT_ROOT, "index.html")

    @app.get("/login")
    @app.get("/login.html")
    def login_page():
        if current_user() is not None:
            return redirect("/dashboard.html")
        return send_from_directory(PROJECT_ROOT, "login.html")

    @app.get("/dashboard")
    @app.get("/dashboard.html")
    def dashboard_page():
        if current_user() is None:
            return redirect("/login.html")
        return send_from_directory(PROJECT_ROOT, "dashboard.html")

    @app.get("/css/<path:filename>")
    def css_file(filename):
        return send_from_directory(PROJECT_ROOT / "css", filename)

    @app.get("/js/<path:filename>")
    def js_file(filename):
        return send_from_directory(PROJECT_ROOT / "js", filename)

    @app.get("/assets/<path:filename>")
    def asset_file(filename):
        return send_from_directory(PROJECT_ROOT / "assets", filename)

    @app.get("/api/progress")
    def progress_api():
        user = current_user()
        if user is None:
            return jsonify(error="authentication_required", message="Sign in to continue."), 401
        return jsonify(**calculate_progress(user.id))

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
