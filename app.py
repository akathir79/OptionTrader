import os
# ⚠️ CRITICAL: Main Flask application - PROTECTED CONFIGURATION
# DO NOT modify database URL, session secret, or proxy settings!
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
import psycopg2
from psycopg2 import sql
from sqlalchemy import create_engine, text

# Paper trading blueprint will be imported after db initialization

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
# ⚠️ CRITICAL: Session secret MUST be provided - no hardcoded fallback!
if not os.environ.get("SESSION_SECRET"):
    raise ValueError("SESSION_SECRET environment variable is required for security!")
app.secret_key = os.environ.get("SESSION_SECRET")

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

def initialize_database_if_needed():
    """Check if database has data, if not restore from backup"""
    import json
    import os
    from datetime import datetime
    from sqlalchemy.exc import IntegrityError, SQLAlchemyError
    from models import OptionStrategy, BrokerSettings, PaperTradingSettings
    
    try:
        # Check if option strategies exist
        strategy_count = OptionStrategy.query.count()
        
        if strategy_count == 0:
            print("📂 No strategies found, initializing database...")
            
            # Look for backup file
            backup_files = [f for f in os.listdir('.') if f.startswith('trading_platform_backup_') and f.endswith('.json')]
            
            if backup_files:
                latest_backup = max(backup_files)
                print(f"📊 Restoring data from: {latest_backup}")
                
                try:
                    with open(latest_backup, 'r', encoding='utf-8') as f:
                        backup_data = json.load(f)
                    
                    # Validate backup structure
                    if not isinstance(backup_data, dict) or 'tables' not in backup_data:
                        print("⚠️ Invalid backup file structure - skipping restoration")
                        return
                    
                    tables_data = backup_data['tables']
                    
                    # Restore option strategies with proper session management
                    if 'option_strategies' in tables_data and isinstance(tables_data['option_strategies'], list):
                        print("📊 Restoring option strategies...")
                        restored_count = 0
                        
                        for strategy_data in tables_data['option_strategies']:
                            try:
                                # Clean and validate data
                                strategy_data = strategy_data.copy()  # Don't modify original
                                strategy_data.pop('id', None)  # Let database auto-generate
                                
                                # Convert datetime strings
                                if 'created_at' in strategy_data and isinstance(strategy_data['created_at'], str):
                                    strategy_data['created_at'] = datetime.fromisoformat(strategy_data['created_at'].replace('Z', '+00:00'))
                                
                                strategy = OptionStrategy(**strategy_data)
                                db.session.add(strategy)
                                restored_count += 1
                                
                            except (ValueError, TypeError, KeyError) as e:
                                print(f"⚠️ Skipping invalid strategy data: {e}")
                                continue
                        
                        # Commit strategies in single transaction
                        try:
                            db.session.commit()
                            print(f"✅ Restored {restored_count} option strategies")
                        except (IntegrityError, SQLAlchemyError) as e:
                            print(f"❌ Failed to commit strategies: {e}")
                            db.session.rollback()
                    
                    # Restore paper trading settings with proper session management
                    if 'paper_trading_settings' in tables_data and isinstance(tables_data['paper_trading_settings'], list):
                        print("📈 Restoring paper trading settings...")
                        paper_count = 0
                        
                        for setting in tables_data['paper_trading_settings']:
                            try:
                                # Clean and validate data
                                setting = setting.copy()  # Don't modify original
                                setting.pop('id', None)
                                
                                # Convert datetime strings
                                datetime_fields = ['created_at', 'updated_at']
                                for field in datetime_fields:
                                    if field in setting and setting[field] and isinstance(setting[field], str):
                                        setting[field] = datetime.fromisoformat(setting[field].replace('Z', '+00:00'))
                                
                                paper_setting = PaperTradingSettings(**setting)
                                db.session.add(paper_setting)
                                paper_count += 1
                                
                            except (ValueError, TypeError, KeyError) as e:
                                print(f"⚠️ Skipping invalid paper trading setting: {e}")
                                continue
                        
                        # Commit paper settings in separate transaction
                        if paper_count > 0:
                            try:
                                db.session.commit()
                                print(f"✅ Restored {paper_count} paper trading settings")
                            except (IntegrityError, SQLAlchemyError) as e:
                                print(f"❌ Failed to commit paper trading settings: {e}")
                                db.session.rollback()
                    
                    print("🚀 Database initialization complete!")
                    
                except (json.JSONDecodeError, FileNotFoundError) as e:
                    print(f"❌ Error reading backup file: {e}")
                    return
                except Exception as e:
                    print(f"❌ Unexpected error during restoration: {e}")
                    # Ensure session is clean
                    try:
                        db.session.rollback()
                    except:
                        pass
                    return
            else:
                print("📝 No backup file found - database will start empty")
        else:
            print(f"✅ Database already has {strategy_count} strategies")
            
    except Exception as e:
        print(f"⚠️ Database initialization error: {e}")
        # Ensure session is clean
        try:
            db.session.rollback()
        except:
            pass

with app.app_context():
    # Make sure to import the models here or their tables won't be created
    import models  # noqa: F401
    
    try:
        db.create_all()
        if not is_replit:
            print("✅ Database tables created/verified successfully!")
        
        # Auto-initialize database with strategy data if empty
        initialize_database_if_needed()
        
    except Exception as e:
        print(f"⚠️ Error creating database tables: {e}")
        if not is_replit:
            print("Please check your PostgreSQL connection settings.")

# Import models after db is initialized
from models import BrokerSettings, OptionStrategy

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

# Import and register VIX API blueprint
from api.vix_api import vix_bp
app.register_blueprint(vix_bp)

# Import and register Futures API blueprint
from APP_Routes.futures_api import futures_bp
app.register_blueprint(futures_bp)

# Import and register Paper Trading blueprint (after db initialization)
from paper_trading_api import paper_trading_bp
app.register_blueprint(paper_trading_bp)

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

@app.route("/strategies")
def strategies():
    """Display all memorized option trading strategies from the books"""
    try:
        # Query all strategies using ORM
        strategies = OptionStrategy.query.order_by(OptionStrategy.name).all()
        strategies_data = [strategy.to_dict() for strategy in strategies]
        
        return render_template("strategies.html", strategies=strategies_data, total_count=len(strategies_data))
    except Exception as e:
        print(f"Error fetching strategies: {e}")
        return render_template("strategies.html", strategies=[], total_count=0, error=str(e))


@app.route('/api/strategies', methods=['GET'])
def get_strategies():
    """API endpoint to get all trading strategies for strategy selector"""
    try:
        # Get category filter if provided
        category = request.args.get('category')
        
        # Query strategies
        query = OptionStrategy.query.order_by(OptionStrategy.name)
        if category:
            query = query.filter(OptionStrategy.category == category)
            
        strategies = query.all()
        strategies_data = [strategy.to_dict() for strategy in strategies]
        
        return jsonify({
            'success': True,
            'strategies': strategies_data,
            'total_count': len(strategies_data)
        })
        
    except Exception as e:
        print(f"Error fetching strategies API: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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

@app.route('/admin/populate-strategies', methods=['GET'])
def populate_strategies():
    """Admin route to populate the database with option trading strategies"""
    try:
        from datetime import datetime
        
        # Define all strategies with comprehensive information
        strategies_data = [
            # Basic Strategies
            {
                'name': 'Long Call',
                'category': 'Bullish',
                'description': 'Buying a call option to profit from upward price movement. Most basic bullish strategy with limited risk and unlimited profit potential.',
                'market_condition': 'Moderately to strongly bullish',
                'risk_profile': 'Limited risk (premium paid), unlimited profit potential',
                'max_profit': 'Unlimited (Stock Price - Strike Price - Premium Paid)',
                'max_loss': 'Limited to premium paid',
                'breakeven_points': 'Strike Price + Premium Paid',
                'construction': 'Buy 1 Call Option at desired strike price and expiration',
                'adjustments': 'Adjustments when profitable: Roll up to higher strike, convert to bull call spread, take partial profits. Adjustments when losing: Roll down to lower strike, roll out to later expiration, convert to protective put, close position to limit losses.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 47',
                'examples': 'Buy 1 XYZ 100 Call for $2. Max profit: Unlimited. Max loss: $200. Breakeven: $102.'
            },
            {
                'name': 'Short Call',
                'category': 'Bearish',
                'description': 'Selling a call option to collect premium, expecting the stock to stay below the strike price. High probability but limited profit strategy.',
                'market_condition': 'Neutral to moderately bearish',
                'risk_profile': 'Limited profit (premium received), unlimited risk',
                'max_profit': 'Limited to premium received',
                'max_loss': 'Unlimited (Strike Price - Stock Price + Premium Received)',
                'breakeven_points': 'Strike Price + Premium Received',
                'construction': 'Sell 1 Call Option at desired strike price and expiration',
                'adjustments': 'Adjustments when profitable: Buy back call early, roll down to lower strike, let expire worthless. Adjustments when losing: Buy back call to limit losses, roll up and out for credit, convert to covered call, create spread by buying higher strike call.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 48',
                'examples': 'Sell 1 XYZ 105 Call for $1.50. Max profit: $150. Max loss: Unlimited. Breakeven: $106.50.'
            },
            {
                'name': 'Long Put',
                'category': 'Bearish',
                'description': 'Buying a put option to profit from downward price movement. Most basic bearish strategy with limited risk and substantial profit potential.',
                'market_condition': 'Moderately to strongly bearish',
                'risk_profile': 'Limited risk (premium paid), substantial profit potential',
                'max_profit': 'Strike Price - Premium Paid (occurs at stock price = 0)',
                'max_loss': 'Limited to premium paid',
                'breakeven_points': 'Strike Price - Premium Paid',
                'construction': 'Buy 1 Put Option at desired strike price and expiration',
                'adjustments': 'Adjustments when profitable: Roll down to lower strike, convert to bear put spread, take partial profits. Adjustments when losing: Roll up to higher strike, roll out to later expiration, convert to protective call, close position to limit losses.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 48',
                'examples': 'Buy 1 XYZ 95 Put for $3. Max profit: $9,200 (at $0). Max loss: $300. Breakeven: $92.'
            },
            {
                'name': 'Short Put',
                'category': 'Bullish',
                'description': 'Selling a put option to collect premium, expecting the stock to stay above the strike price. Used to generate income or acquire stock at lower price.',
                'market_condition': 'Neutral to moderately bullish',
                'risk_profile': 'Limited profit (premium received), substantial risk',
                'max_profit': 'Limited to premium received',
                'max_loss': 'Strike Price - Premium Received (occurs at stock price = 0)',
                'breakeven_points': 'Strike Price - Premium Received',
                'construction': 'Sell 1 Put Option at desired strike price and expiration',
                'adjustments': 'Adjustments when profitable: Buy back put early, roll up to higher strike, let expire worthless. Adjustments when losing: Buy back put to limit losses, roll down and out for credit, accept assignment if willing to own stock, create spread by buying lower strike put.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 50',
                'examples': 'Sell 1 XYZ 90 Put for $2. Max profit: $200. Max loss: $8,800 (at $0). Breakeven: $88.'
            },
            # Spread Strategies
            {
                'name': 'Bull Call Spread',
                'category': 'Bullish',
                'description': 'Buying a lower strike call and selling a higher strike call to profit from moderate upward movement with reduced cost and risk.',
                'market_condition': 'Moderately bullish',
                'risk_profile': 'Limited risk and limited profit',
                'max_profit': 'Difference in strike prices - net premium paid',
                'max_loss': 'Net premium paid',
                'breakeven_points': 'Lower strike price + net premium paid',
                'construction': 'Buy 1 Call (lower strike), Sell 1 Call (higher strike), same expiration',
                'adjustments': 'Adjustments when profitable: Close both legs early, roll up both strikes, convert to protective put. Adjustments when losing: Roll out to later expiration, close position to limit losses, convert to ratio spread, let short call expire and manage long call.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 50',
                'examples': 'Buy XYZ 100 Call for $3, Sell XYZ 105 Call for $1. Net cost: $2. Max profit: $3. Breakeven: $102.'
            },
            {
                'name': 'Bear Put Spread',
                'category': 'Bearish',
                'description': 'Buying a higher strike put and selling a lower strike put to profit from moderate downward movement with reduced cost and risk.',
                'market_condition': 'Moderately bearish',
                'risk_profile': 'Limited risk and limited profit',
                'max_profit': 'Difference in strike prices - net premium paid',
                'max_loss': 'Net premium paid',
                'breakeven_points': 'Higher strike price - net premium paid',
                'construction': 'Buy 1 Put (higher strike), Sell 1 Put (lower strike), same expiration',
                'adjustments': 'Adjustments when profitable: Close both legs early, roll down both strikes, convert to protective call. Adjustments when losing: Roll out to later expiration, close position to limit losses, convert to ratio spread, let short put expire and manage long put.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 51',
                'examples': 'Buy XYZ 95 Put for $4, Sell XYZ 90 Put for $2. Net cost: $2. Max profit: $3. Breakeven: $93.'
            },
            # Volatility Strategies
            {
                'name': 'Long Straddle',
                'category': 'Volatility',
                'description': 'Buying both a call and put at the same strike price, expecting significant price movement in either direction. Pure volatility play.',
                'market_condition': 'High volatility expected, direction unknown',
                'risk_profile': 'Limited risk, unlimited profit potential on upside, substantial profit potential on downside',
                'max_profit': 'Unlimited on upside, substantial on downside (Strike - Premium - Stock Price)',
                'max_loss': 'Total premium paid for both options',
                'breakeven_points': 'Upper: Strike + Total Premium; Lower: Strike - Total Premium',
                'construction': 'Buy 1 Call and Buy 1 Put at same strike price and expiration',
                'adjustments': 'Adjustments when profitable: Take profits on profitable leg, convert to strangle, add butterfly spread. Adjustments when losing: Roll out to later expiration, convert to calendar straddle, convert to iron butterfly, close position if volatility outlook changes.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 53',
                'examples': 'Buy XYZ 100 Call for $2.50, Buy XYZ 100 Put for $2.50. Total cost: $5. Breakeven: $95 and $105.'
            },
            {
                'name': 'Short Straddle',
                'category': 'Neutral',
                'description': 'Selling both a call and put at the same strike price, expecting low volatility and sideways movement to collect premium.',
                'market_condition': 'Low volatility expected, sideways movement',
                'risk_profile': 'Limited profit, unlimited risk',
                'max_profit': 'Total premium received from both options',
                'max_loss': 'Unlimited on both sides (minus premium received)',
                'breakeven_points': 'Upper: Strike + Total Premium; Lower: Strike - Total Premium',
                'construction': 'Sell 1 Call and Sell 1 Put at same strike price and expiration',
                'adjustments': 'Adjustments when profitable: Buy back both options early, roll to later expiration, let both expire worthless. Adjustments when losing: Buy back losing side, convert to long straddle, roll entire position out, create iron butterfly.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 2, Page 54',
                'examples': 'Sell XYZ 100 Call for $2.50, Sell XYZ 100 Put for $2.50. Total credit: $5. Breakeven: $95 and $105.'
            },
            # Advanced Strategies
            {
                'name': 'Iron Condor',
                'category': 'Neutral',
                'description': 'Combining bull put spread and bear call spread to profit from range-bound movement while collecting premium.',
                'market_condition': 'Low volatility, range-bound movement expected',
                'risk_profile': 'Limited risk and limited profit, high probability strategy',
                'max_profit': 'Net credit received when stock stays between short strikes',
                'max_loss': 'Wing spread width - net credit received',
                'breakeven_points': 'Lower: Put strike - net credit; Upper: Call strike + net credit',
                'construction': 'Sell put spread (bull put) + Sell call spread (bear call) with different strikes',
                'adjustments': 'Adjustments when profitable: Close early to capture profit, let expire worthless if staying in range, roll out to later expiration. Adjustments when tested: Close threatened side only, convert to iron butterfly, roll entire position out, adjust strikes to follow stock movement.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 7, Page 324',
                'examples': 'Sell 95-90 put spread and 105-110 call spread. Profit if XYZ stays between 95-105.'
            },
            {
                'name': 'Protective Put',
                'category': 'Insurance',
                'description': 'Buying a put option while owning the underlying stock to protect against downside risk. Portfolio insurance strategy.',
                'market_condition': 'Bullish long-term but concerned about short-term downside',
                'risk_profile': 'Limited downside risk, unlimited upside potential',
                'max_profit': 'Unlimited (stock appreciation minus put premium)',
                'max_loss': 'Stock price - Put strike price + Put premium',
                'breakeven_points': 'Stock purchase price + Put premium paid',
                'construction': 'Own 100 shares of stock + Buy 1 Put option',
                'adjustments': 'Adjustments when stock moves higher: Let put expire worthless, roll put up to higher strike, sell calls against position. Adjustments when stock moves lower: Exercise put to limit losses, roll put down and out, convert to bear put spread, sell covered calls to generate income.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 3, Page 66',
                'examples': 'Own 100 XYZ at $102, Buy XYZ 95 Put for $1. Protected below $95, cost $1. Breakeven: $103.'
            },
            {
                'name': 'Covered Call',
                'category': 'Income',
                'description': 'Selling call options against owned stock to generate income, accepting to sell stock if called away above strike price.',
                'market_condition': 'Neutral to moderately bullish, income generation',
                'risk_profile': 'Reduced risk due to income, limited upside potential',
                'max_profit': 'Strike price - stock cost + premium received',
                'max_loss': 'Stock cost - premium received (if stock goes to zero)',
                'breakeven_points': 'Stock cost - premium received',
                'construction': 'Own 100 shares of stock + Sell 1 Call option',
                'adjustments': 'Adjustments when stock moves higher: Buy back call to keep stock, roll up and out for credit, accept assignment, convert to collar. Adjustments when stock moves lower: Buy back call for profit, let call expire worthless, add protective put, roll call down and out.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 3, Page 83',
                'examples': 'Own 100 XYZ at $98, Sell XYZ 105 Call for $2. Max profit: $9 (7+2). Breakeven: $96.'
            },
            {
                'name': 'Collar',
                'category': 'Hedging',
                'description': 'Combining protective put and covered call on owned stock to create a risk-defined position with limited profit and loss.',
                'market_condition': 'Neutral, seeking protection and income',
                'risk_profile': 'Limited risk and limited profit',
                'max_profit': 'Call strike - stock cost + net credit (or minus net debit)',
                'max_loss': 'Stock cost - put strike + net debit (or minus net credit)',
                'breakeven_points': 'Stock cost +/- net debit or credit',
                'construction': 'Own stock + Buy put (lower strike) + Sell call (higher strike)',
                'adjustments': 'Adjustments when profitable: Close collar early, roll both strikes up, let call expire and sell new call higher. Adjustments when between strikes: Let both options expire worthless, roll out to later expiration, adjust strikes to new range. Adjustments when threatened: Roll threatened side out, close collar and manage stock separately.',
                'source_book': 'The Option Trader Handbook',
                'author': 'George Jabbour & Philip Budwick',
                'page_reference': 'Chapter 3, Page 94',
                'examples': 'Own 100 XYZ at $100, Buy 95 Put for $1, Sell 105 Call for $1.50. Net credit: $0.50.'
            }
        ]
        
        # Add strategies to database
        strategies_added = 0
        for strategy_data in strategies_data:
            # Check if strategy already exists
            existing = OptionStrategy.query.filter_by(name=strategy_data['name']).first()
            if not existing:
                strategy = OptionStrategy(**strategy_data)
                db.session.add(strategy)
                strategies_added += 1
        
        # Commit all changes
        db.session.commit()
        
        total_strategies = OptionStrategy.query.count()
        
        return jsonify({
            "success": True,
            "strategies_added": strategies_added,
            "total_strategies": total_strategies,
            "message": f"Successfully added {strategies_added} new strategies. Total: {total_strategies}"
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to populate strategies"
        }), 500

# Paper trading blueprint already registered above

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)