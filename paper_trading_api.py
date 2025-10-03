"""
Paper Trading API - Risk-free virtual trading functionality
Provides endpoints for managing virtual portfolios, placing paper trades, and tracking P&L
Uses SQLAlchemy ORM for database operations
"""

from flask import Blueprint, request, jsonify, session
from app import db
from models import PaperPortfolio, PaperTrade, PaperTradingSettings
import logging
from decimal import Decimal
from datetime import datetime, date
import traceback
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, case

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
paper_trading_bp = Blueprint('paper_trading', __name__)

def get_user_id():
    """
    Get user ID from session, broker settings, or return default
    Priority: Flask session > broker_user_id > default_user
    """
    # First check Flask session for explicit user_id
    if 'user_id' in session:
        return session['user_id']
    
    # Check if there's an authenticated broker user we can use
    try:
        from models import BrokerSettings
        broker_setting = BrokerSettings.query.filter_by(user_id=0).first()
        if broker_setting and broker_setting.broker_user_id:
            # Use broker_user_id as the user identifier for paper trading
            return f"broker_{broker_setting.broker_user_id}"
    except Exception as e:
        logger.debug(f"Could not get broker user ID: {e}")
    
    # Fallback to default
    return 'default_user'

def get_or_create_paper_portfolio(user_id=None):
    """Get or create paper trading portfolio for user"""
    if user_id is None:
        user_id = get_user_id()
    
    try:
        # Try to get existing portfolio
        portfolio = PaperPortfolio.query.filter_by(user_id=user_id).first()
        
        if not portfolio:
            # Create new portfolio with $100,000 virtual money
            portfolio = PaperPortfolio(
                user_id=user_id,
                balance=Decimal('100000.00'),
                initial_balance=Decimal('100000.00'),
                total_pnl=Decimal('0.00')
            )
            db.session.add(portfolio)
            db.session.commit()
            logger.info(f"Created new paper portfolio for user: {user_id}")
        
        return portfolio
        
    except SQLAlchemyError as e:
        logger.error(f"Database error getting paper portfolio: {str(e)}")
        db.session.rollback()
        return None
    except Exception as e:
        logger.error(f"Error getting paper portfolio: {str(e)}")
        return None

def get_or_create_paper_trading_settings(user_id=None):
    """Get or create paper trading settings for user"""
    if user_id is None:
        user_id = get_user_id()
    
    try:
        settings = PaperTradingSettings.query.filter_by(user_id=user_id).first()
        
        if not settings:
            # Create default settings
            settings = PaperTradingSettings(
                user_id=user_id,
                is_paper_mode=True,
                risk_tolerance='MODERATE',
                max_position_size=Decimal('10000.00'),
                daily_loss_limit=Decimal('5000.00')
            )
            db.session.add(settings)
            db.session.commit()
            logger.info(f"Created default paper trading settings for user: {user_id}")
        
        return settings
        
    except SQLAlchemyError as e:
        logger.error(f"Database error getting paper trading settings: {str(e)}")
        db.session.rollback()
        return None
    except Exception as e:
        logger.error(f"Error getting paper trading settings: {str(e)}")
        return None

def get_live_market_price(symbol):
    """
    Fetch live market price from the broker API
    Returns current market price or None if unable to fetch
    """
    try:
        # Import the existing market service
        from services.fyers_service import FyersService
        
        # Create a service instance and get current quote
        fyers_service = FyersService()
        result = fyers_service.get_quotes(symbol)
        
        if result.get('success') and result.get('quotes'):
            quote = result['quotes'][0]
            ltp = quote.get('ltp')
            if ltp:
                logger.info(f"Fetched live price for {symbol}: {ltp}")
                return Decimal(str(ltp))
        
        logger.warning(f"Could not fetch live price for {symbol}")
        return None
        
    except Exception as e:
        logger.error(f"Error fetching live price for {symbol}: {e}")
        return None

def apply_realistic_pricing(price, trade_type, settings, symbol=None):
    """
    Apply realistic pricing with live market data, slippage, and fees
    If symbol is provided, tries to fetch current market price
    """
    if not settings:
        return Decimal(str(price))
    
    # Try to get live market price if symbol is provided
    if symbol:
        live_price = get_live_market_price(symbol)
        if live_price:
            realistic_price = live_price
            logger.info(f"Using live market price for {symbol}: {realistic_price}")
        else:
            realistic_price = Decimal(str(price))
            logger.info(f"Using provided price for {symbol}: {realistic_price}")
    else:
        realistic_price = Decimal(str(price))
    
    # Apply slippage if enabled
    if settings.enable_slippage:
        slippage = realistic_price * (settings.slippage_percentage / 100)
        if trade_type.upper() == 'BUY':
            realistic_price += slippage  # Buy at higher price (unfavorable)
        else:
            realistic_price -= slippage  # Sell at lower price (unfavorable)
        
        logger.debug(f"Applied slippage: {settings.slippage_percentage}% = {slippage}")
    
    return realistic_price

@paper_trading_bp.route('/api/paper_trading/portfolio', methods=['GET'])
def get_portfolio():
    """Get paper trading portfolio status"""
    try:
        user_id = request.args.get('user_id') or get_user_id()
        portfolio = get_or_create_paper_portfolio(user_id)
        
        if portfolio:
            # Get active positions using ORM
            active_positions = db.session.query(
                PaperTrade.symbol,
                PaperTrade.option_type,
                PaperTrade.strike_price,
                PaperTrade.expiry_date,
                func.sum(
                    case(
                        (PaperTrade.trade_type == 'BUY', PaperTrade.quantity),
                        else_=PaperTrade.quantity * -1
                    )
                ).label('net_quantity'),
                func.avg(PaperTrade.entry_price).label('avg_entry_price'),
                func.sum(PaperTrade.pnl).label('total_pnl')
            ).filter(
                PaperTrade.portfolio_id == portfolio.id,
                PaperTrade.status == 'OPEN'
            ).group_by(
                PaperTrade.symbol,
                PaperTrade.option_type, 
                PaperTrade.strike_price,
                PaperTrade.expiry_date
            ).having(
                func.sum(
                    case(
                        (PaperTrade.trade_type == 'BUY', PaperTrade.quantity),
                        else_=PaperTrade.quantity * -1
                    )
                ) != 0
            ).all()
            
            portfolio_dict = portfolio.to_dict()
            portfolio_dict['positions'] = []
            
            for pos in active_positions:
                portfolio_dict['positions'].append({
                    'symbol': pos.symbol,
                    'option_type': pos.option_type,
                    'strike_price': float(pos.strike_price) if pos.strike_price else None,
                    'expiry_date': pos.expiry_date.isoformat() if pos.expiry_date else None,
                    'quantity': int(pos.net_quantity),
                    'avg_entry_price': float(pos.avg_entry_price),
                    'pnl': float(pos.total_pnl)
                })
            
            return jsonify({
                'success': True,
                'portfolio': portfolio_dict
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to get portfolio'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in get_portfolio: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@paper_trading_bp.route('/api/paper_trading/settings', methods=['GET'])
def get_settings():
    """Get paper trading settings"""
    try:
        user_id = request.args.get('user_id') or get_user_id()
        settings = get_or_create_paper_trading_settings(user_id)
        
        if settings:
            return jsonify({
                'success': True,
                'settings': settings.to_dict()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to get settings'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in get_settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@paper_trading_bp.route('/api/paper_trading/settings', methods=['POST'])
def update_settings():
    """Update paper trading settings"""
    try:
        data = request.get_json()
        user_id = data.get('user_id') or get_user_id()
        
        settings = get_or_create_paper_trading_settings(user_id)
        if not settings:
            return jsonify({
                'success': False,
                'error': 'Failed to get/create settings'
            }), 500
        
        # Update settings
        if 'is_paper_mode' in data:
            settings.is_paper_mode = data['is_paper_mode']
        if 'risk_tolerance' in data:
            settings.risk_tolerance = data['risk_tolerance']
        if 'max_position_size' in data:
            settings.max_position_size = Decimal(str(data['max_position_size']))
        if 'daily_loss_limit' in data:
            settings.daily_loss_limit = Decimal(str(data['daily_loss_limit']))
        if 'enable_slippage' in data:
            settings.enable_slippage = data['enable_slippage']
        if 'slippage_percentage' in data:
            settings.slippage_percentage = Decimal(str(data['slippage_percentage']))
        if 'enable_fees' in data:
            settings.enable_fees = data['enable_fees']
        if 'brokerage_per_trade' in data:
            settings.brokerage_per_trade = Decimal(str(data['brokerage_per_trade']))
        
        settings.updated_at = datetime.utcnow()
        
        db.session.commit()
        logger.info(f"Updated paper trading settings for user: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Settings updated successfully',
            'settings': settings.to_dict()
        })
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in update_settings: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Database error while updating settings'
        }), 500
    except Exception as e:
        logger.error(f"Error in update_settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@paper_trading_bp.route('/api/paper_trading/trade', methods=['POST'])
def execute_paper_trade():
    """Execute a paper trade (buy/sell)"""
    try:
        data = request.get_json()
        user_id = data.get('user_id') or get_user_id()
        
        # Validate required fields
        required_fields = ['symbol', 'trade_type', 'quantity', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Get portfolio and settings
        portfolio = get_or_create_paper_portfolio(user_id)
        settings = get_or_create_paper_trading_settings(user_id)
        
        if not portfolio:
            return jsonify({
                'success': False,
                'error': 'Portfolio not found'
            }), 404
        
        # Apply realistic pricing with live market data
        original_price = Decimal(str(data['price']))
        realistic_price = apply_realistic_pricing(original_price, data['trade_type'], settings, data['symbol'])
        
        # Calculate trade value with realistic pricing
        quantity = int(data['quantity'])
        trade_value = realistic_price * quantity
        
        # Apply brokerage if enabled
        if settings and settings.enable_fees:
            trade_value += settings.brokerage_per_trade
        
        # Check if user has enough balance for buy orders
        if data['trade_type'].upper() == 'BUY' and trade_value > portfolio.balance:
            return jsonify({
                'success': False,
                'error': f'Insufficient balance. Required: {trade_value}, Available: {portfolio.balance}'
            }), 400
        
        # Check position size limits
        if settings and trade_value > settings.max_position_size:
            return jsonify({
                'success': False,
                'error': f'Trade size exceeds maximum position size limit of {settings.max_position_size}'
            }), 400
        
        # Create trade record
        trade = PaperTrade(
            portfolio_id=portfolio.id,
            symbol=data['symbol'],
            trade_type=data['trade_type'].upper(),
            option_type=data.get('option_type'),
            strike_price=Decimal(str(data['strike_price'])) if data.get('strike_price') else None,
            expiry_date=datetime.strptime(data['expiry_date'], '%Y-%m-%d').date() if data.get('expiry_date') else None,
            quantity=quantity,
            entry_price=realistic_price,
            status='OPEN',
            order_type=data.get('order_type', 'MARKET')
        )
        
        db.session.add(trade)
        
        # Update portfolio balance
        if data['trade_type'].upper() == 'BUY':
            new_balance = portfolio.balance - trade_value
        else:  # SELL
            new_balance = portfolio.balance + (realistic_price * quantity) - (settings.brokerage_per_trade if settings and settings.enable_fees else 0)
        
        portfolio.balance = new_balance
        portfolio.total_trades += 1
        portfolio.updated_at = datetime.utcnow()
        
        db.session.commit()
        logger.info(f"Executed paper trade for user {user_id}: {data['trade_type']} {quantity} {data['symbol']} at {realistic_price}")
        
        return jsonify({
            'success': True,
            'trade_id': trade.id,
            'message': f'Paper trade executed successfully',
            'trade_details': {
                'symbol': data['symbol'],
                'trade_type': data['trade_type'].upper(),
                'quantity': quantity,
                'original_price': float(original_price),
                'executed_price': float(realistic_price),
                'trade_value': float(trade_value),
                'new_balance': float(new_balance),
                'slippage_applied': settings.enable_slippage if settings else False,
                'fees_applied': settings.enable_fees if settings else False
            }
        })
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in execute_paper_trade: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Database error while executing trade'
        }), 500
    except Exception as e:
        logger.error(f"Error in execute_paper_trade: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@paper_trading_bp.route('/api/paper_trading/trades', methods=['GET'])
def get_trade_history():
    """Get paper trading history"""
    try:
        user_id = request.args.get('user_id') or get_user_id()
        limit = int(request.args.get('limit', 50))
        
        portfolio = get_or_create_paper_portfolio(user_id)
        if not portfolio:
            return jsonify({
                'success': False,
                'error': 'Portfolio not found'
            }), 404
        
        trades = PaperTrade.query.filter_by(portfolio_id=portfolio.id)\
                                .order_by(PaperTrade.executed_at.desc())\
                                .limit(limit).all()
        
        trade_list = [trade.to_dict() for trade in trades]
        
        return jsonify({
            'success': True,
            'trades': trade_list
        })
        
    except Exception as e:
        logger.error(f"Error in get_trade_history: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@paper_trading_bp.route('/api/paper_trading/close_trade', methods=['POST'])
def close_trade():
    """Close an existing paper trade"""
    try:
        data = request.get_json()
        user_id = data.get('user_id') or get_user_id()
        trade_id = data.get('trade_id')
        exit_price = data.get('exit_price')
        
        if not trade_id or not exit_price:
            return jsonify({
                'success': False,
                'error': 'Missing trade_id or exit_price'
            }), 400
        
        # Get the trade
        trade = PaperTrade.query.filter_by(id=trade_id, status='OPEN').first()
        if not trade:
            return jsonify({
                'success': False,
                'error': 'Trade not found or already closed'
            }), 404
        
        # Get portfolio and settings
        portfolio = trade.portfolio
        settings = get_or_create_paper_trading_settings(user_id)
        
        # Apply realistic pricing for exit
        realistic_exit_price = apply_realistic_pricing(
            Decimal(str(exit_price)), 
            'SELL' if trade.trade_type == 'BUY' else 'BUY',
            settings,
            trade.symbol
        )
        
        # Close the trade
        trade.exit_price = realistic_exit_price
        trade.status = 'CLOSED'
        trade.closed_at = datetime.utcnow()
        
        # Calculate P&L
        pnl = trade.calculate_pnl()
        
        # Apply brokerage fees if enabled
        if settings and settings.enable_fees:
            pnl -= float(settings.brokerage_per_trade)
            trade.pnl = Decimal(str(pnl))
        
        # Update portfolio
        portfolio.balance += (realistic_exit_price * trade.quantity)
        portfolio.total_pnl += trade.pnl
        
        if trade.pnl > 0:
            portfolio.winning_trades += 1
        else:
            portfolio.losing_trades += 1
        
        portfolio.updated_at = datetime.utcnow()
        
        db.session.commit()
        logger.info(f"Closed paper trade {trade_id} for user {user_id} with P&L: {trade.pnl}")
        
        return jsonify({
            'success': True,
            'message': 'Trade closed successfully',
            'trade_details': {
                'trade_id': trade.id,
                'pnl': float(trade.pnl),
                'pnl_pct': float(trade.pnl_pct),
                'exit_price': float(realistic_exit_price),
                'new_balance': float(portfolio.balance)
            }
        })
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in close_trade: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Database error while closing trade'
        }), 500
    except Exception as e:
        logger.error(f"Error in close_trade: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@paper_trading_bp.route('/api/paper_trading/reset_portfolio', methods=['POST'])
def reset_portfolio():
    """Reset paper trading portfolio to initial state"""
    try:
        data = request.get_json()
        user_id = data.get('user_id') or get_user_id()
        
        portfolio = get_or_create_paper_portfolio(user_id)
        if not portfolio:
            return jsonify({
                'success': False,
                'error': 'Portfolio not found'
            }), 404
        
        # Close all open trades
        open_trades = PaperTrade.query.filter_by(portfolio_id=portfolio.id, status='OPEN').all()
        for trade in open_trades:
            trade.status = 'CLOSED'
            trade.closed_at = datetime.utcnow()
        
        # Reset portfolio balance and statistics
        portfolio.balance = portfolio.initial_balance
        portfolio.total_pnl = Decimal('0.00')
        portfolio.total_trades = 0
        portfolio.winning_trades = 0
        portfolio.losing_trades = 0
        portfolio.updated_at = datetime.utcnow()
        
        db.session.commit()
        logger.info(f"Reset paper trading portfolio for user: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Paper trading portfolio reset successfully',
            'portfolio': portfolio.to_dict()
        })
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in reset_portfolio: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Database error while resetting portfolio'
        }), 500
    except Exception as e:
        logger.error(f"Error in reset_portfolio: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@paper_trading_bp.route('/api/paper_trading/positions', methods=['GET'])
def get_positions():
    """Get current open positions with real-time P&L"""
    try:
        user_id = request.args.get('user_id') or get_user_id()
        
        portfolio = get_or_create_paper_portfolio(user_id)
        if not portfolio:
            return jsonify({
                'success': False,
                'error': 'Portfolio not found'
            }), 404
        
        # Get all open trades
        open_trades = PaperTrade.query.filter_by(portfolio_id=portfolio.id, status='OPEN').all()
        
        positions = []
        for trade in open_trades:
            # Get live market price for real-time P&L calculation
            current_price = get_live_market_price(trade.symbol)
            if current_price is None:
                # Fallback to entry price if live price unavailable
                current_price = trade.entry_price
                logger.warning(f"Using entry price as current price for {trade.symbol}")
            
            trade.calculate_pnl(float(current_price))
            positions.append(trade.to_dict())
        
        return jsonify({
            'success': True,
            'positions': positions
        })
        
    except Exception as e:
        logger.error(f"Error in get_positions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500