from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv
from .models import db

load_dotenv()

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['ENV'] = os.getenv('FLASK_ENV', 'production')
    app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///solar_plant.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    db.init_app(app)

    # CORS
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    CORS(app, origins=[origin.strip() for origin in cors_origins])

    # Create tables
    with app.app_context():
        db.create_all()

    # Register blueprints
    from .routes.health import health_bp
    from .routes.example import example_bp
    from .routes.auth import auth_bp
    from .routes.faults import faults_bp
    from .routes.companies import companies_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(example_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(faults_bp)
    app.register_blueprint(companies_bp)

    return app
