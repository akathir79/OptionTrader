import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
import psycopg2
from psycopg2 import sql
from sqlalchemy import create_engine, text

class Base(DeclarativeBase):
    pass

def create_database_if_not_exists(db_url, db_name):
    """Create PostgreSQL database if it doesn't exist (for local development)"""
    try:
        # Parse the database URL to get connection params
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        
        # Connection params without database name
        conn_params = {
            'host': parsed.hostname or 'localhost',
            'port': parsed.port or 5432,
            'user': parsed.username or 'postgres',
            'password': parsed.password or 'password'
        }
        
        # Connect to PostgreSQL server (to 'postgres' database)
        conn = psycopg2.connect(database='postgres', **conn_params)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        exists = cur.fetchone()
        
        if not exists:
            # Create database if it doesn't exist
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
            print(f"✅ Created database '{db_name}' successfully!")
        else:
            print(f"✅ Database '{db_name}' already exists.")
            
        cur.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"⚠️ Could not create database automatically: {e}")
        print("Please ensure PostgreSQL is running and create the database manually.")
    except Exception as e:
        print(f"⚠️ Database creation check failed: {e}")

db = SQLAlchemy(model_class=Base)

# create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-key-change-in-production")

# Detect if running on Replit (has DATABASE_URL) or local machine
is_replit = bool(os.environ.get("DATABASE_URL"))

if is_replit:
    # Replit configuration - use Replit's PostgreSQL and ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # needed for url_for to generate with https
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
else:
    # Local development configuration - use local PostgreSQL
    # Default local PostgreSQL connection (adjust these if your setup is different)
    db_name = "trading_platform"
    local_db_url = os.environ.get("DATABASE_URL", f"postgresql://postgres:password@localhost:5432/{db_name}")
    
    # Automatically create database if it doesn't exist
    create_database_if_not_exists(local_db_url, db_name)
    
    app.config["SQLALCHEMY_DATABASE_URI"] = local_db_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
    }

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["DEBUG"] = True

# initialize the app with the extension
db.init_app(app)

with app.app_context():
    # Make sure to import the models here or their tables won't be created
    import models  # noqa: F401
    
    try:
        db.create_all()
        if not is_replit:
            print("✅ Database tables created/verified successfully!")
    except Exception as e:
        print(f"⚠️ Error creating database tables: {e}")
        if not is_replit:
            print("Please check your PostgreSQL connection settings.")

# Import models after db is initialized
from models import BrokerSettings

# Import and register blueprints
from APP_Routes.symbol_selector import symbol_selector_bp
from APP_Routes.broker_settings import bp           #  ← just "bp", not bp_broker

# register blueprints
app.register_blueprint(symbol_selector_bp)
app.register_blueprint(bp)                          # ← same symbol as above

# Import and register WebSocket blueprint
from APP_Routes.websocket_handler import websocket_bp
app.register_blueprint(websocket_bp)

# Import and register Historical Data blueprint
from APP_Routes.historical_data import historical_bp
app.register_blueprint(historical_bp)

# Import and register Token Monitor blueprint
from APP_Routes.token_monitor import bp as token_monitor_bp
app.register_blueprint(token_monitor_bp)

# Import market times functions
from APP_Routes.market_times import (
    api_list_market_times, api_create_market_time, api_update_market_time,
    api_delete_market_time, api_get_current_market_status, api_initialize_default_markets,
    api_get_simple_markets
)

# Market times API routes
app.add_url_rule('/api/market-times', 'api_list_market_times', api_list_market_times, methods=['GET'])
app.add_url_rule('/api/market-times', 'api_create_market_time', api_create_market_time, methods=['POST'])
app.add_url_rule('/api/market-times/<int:market_id>', 'api_update_market_time', api_update_market_time, methods=['PUT'])
app.add_url_rule('/api/market-times/<int:market_id>', 'api_delete_market_time', api_delete_market_time, methods=['DELETE'])
app.add_url_rule('/api/market-times/status', 'api_get_current_market_status', api_get_current_market_status, methods=['GET'])
app.add_url_rule('/api/market-times/initialize', 'api_initialize_default_markets', api_initialize_default_markets, methods=['POST'])
app.add_url_rule('/api/markets/simple', 'api_get_simple_markets', api_get_simple_markets, methods=['GET'])

@app.route("/")
def live_trade():
    return render_template("live_trade.html")

@app.route("/option-trade")
def option_trade():
    return render_template("option_trade.html")


@app.route('/get_access_token', methods=['GET'])
def get_access_token():
    brokername = request.args.get('brokername')
    broker_user_id = request.args.get('broker_user_id')
    if not brokername or not broker_user_id:
        return jsonify({"error": "Missing parameters"}), 400

    broker_setting = BrokerSettings.query.filter_by(
        brokername=brokername, broker_user_id=broker_user_id
    ).first()

    if broker_setting and broker_setting.access_token:
        return jsonify({"access_token": broker_setting.access_token})
    else:
        return jsonify({"error": "Token not found"}), 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)