"""
Paper Trading API - Risk-free virtual trading functionality
Provides endpoints for managing virtual portfolios, placing paper trades, and tracking P&L
"""

from flask import Blueprint, request, jsonify
from database import get_db_connection
import logging
from decimal import Decimal
from datetime import datetime, date
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
paper_trading_bp = Blueprint('paper_trading', __name__)

def get_paper_portfolio(user_id='default_user'):
    """Get or create paper trading portfolio for user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get existing portfolio
        cur.execute("""
            SELECT id, balance, initial_balance, total_pnl, created_at, updated_at
            FROM paper_portfolios 
            WHERE user_id = %s
        """, (user_id,))
        
        portfolio = cur.fetchone()
        
        if not portfolio:
            # Create new portfolio with $100,000 virtual money
            cur.execute("""
                INSERT INTO paper_portfolios (user_id, balance, initial_balance, total_pnl)
                VALUES (%s, 100000.00, 100000.00, 0.00)
                RETURNING id, balance, initial_balance, total_pnl, created_at, updated_at
            """, (user_id,))
            portfolio = cur.fetchone()
            conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'id': portfolio[0],
            'balance': float(portfolio[1]),
            'initial_balance': float(portfolio[2]),
            'total_pnl': float(portfolio[3]),
            'created_at': portfolio[4].isoformat() if portfolio[4] else None,
            'updated_at': portfolio[5].isoformat() if portfolio[5] else None
        }
        
    except Exception as e:
        logger.error(f"Error getting paper portfolio: {str(e)}")
        return None

def get_paper_trading_settings(user_id='default_user'):
    """Get paper trading settings for user"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT is_paper_mode, risk_tolerance, max_position_size, daily_loss_limit
            FROM paper_trading_settings 
            WHERE user_id = %s
        """, (user_id,))
        
        settings = cur.fetchone()
        cur.close()
        conn.close()
        
        if settings:
            return {
                'is_paper_mode': settings[0],
                'risk_tolerance': settings[1],
                'max_position_size': float(settings[2]),
                'daily_loss_limit': float(settings[3])
            }
        else:
            return {
                'is_paper_mode': False,
                'risk_tolerance': 'MODERATE',
                'max_position_size': 10000.00,
                'daily_loss_limit': 5000.00
            }
            
    except Exception as e:
        logger.error(f"Error getting paper trading settings: {str(e)}")
        return {
            'is_paper_mode': False,
            'risk_tolerance': 'MODERATE',
            'max_position_size': 10000.00,
            'daily_loss_limit': 5000.00
        }

@paper_trading_bp.route('/api/paper_trading/portfolio', methods=['GET'])
def get_portfolio():
    """Get paper trading portfolio status"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        portfolio = get_paper_portfolio(user_id)
        
        if portfolio:
            # Get active positions
            conn = get_db_connection()
            cur = conn.cursor()
            
            cur.execute("""
                SELECT symbol, option_type, strike_price, expiry_date, 
                       SUM(CASE WHEN trade_type = 'BUY' THEN quantity ELSE -quantity END) as net_quantity,
                       AVG(entry_price) as avg_entry_price,
                       SUM(pnl) as total_pnl
                FROM paper_trades 
                WHERE portfolio_id = %s AND status = 'OPEN'
                GROUP BY symbol, option_type, strike_price, expiry_date
                HAVING SUM(CASE WHEN trade_type = 'BUY' THEN quantity ELSE -quantity END) != 0
            """, (portfolio['id'],))
            
            positions = cur.fetchall()
            cur.close()
            conn.close()
            
            portfolio['positions'] = []
            for pos in positions:
                portfolio['positions'].append({
                    'symbol': pos[0],
                    'option_type': pos[1],
                    'strike_price': float(pos[2]) if pos[2] else None,
                    'expiry_date': pos[3].isoformat() if pos[3] else None,
                    'quantity': pos[4],
                    'avg_entry_price': float(pos[5]),
                    'pnl': float(pos[6])
                })
            
            return jsonify({
                'success': True,
                'portfolio': portfolio
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
        user_id = request.args.get('user_id', 'default_user')
        settings = get_paper_trading_settings(user_id)
        return jsonify({
            'success': True,
            'settings': settings
        })
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
        user_id = data.get('user_id', 'default_user')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Update or insert settings
        cur.execute("""
            INSERT INTO paper_trading_settings 
            (user_id, is_paper_mode, risk_tolerance, max_position_size, daily_loss_limit, updated_at)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                is_paper_mode = EXCLUDED.is_paper_mode,
                risk_tolerance = EXCLUDED.risk_tolerance,
                max_position_size = EXCLUDED.max_position_size,
                daily_loss_limit = EXCLUDED.daily_loss_limit,
                updated_at = EXCLUDED.updated_at
        """, (
            user_id,
            data.get('is_paper_mode', False),
            data.get('risk_tolerance', 'MODERATE'),
            data.get('max_position_size', 10000.00),
            data.get('daily_loss_limit', 5000.00)
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Settings updated successfully'
        })
        
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
        user_id = data.get('user_id', 'default_user')
        
        # Validate required fields
        required_fields = ['symbol', 'trade_type', 'quantity', 'price']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Get portfolio
        portfolio = get_paper_portfolio(user_id)
        if not portfolio:
            return jsonify({
                'success': False,
                'error': 'Portfolio not found'
            }), 404
        
        # Calculate trade value
        trade_value = float(data['quantity']) * float(data['price'])
        
        # Check if user has enough balance for buy orders
        if data['trade_type'].upper() == 'BUY' and trade_value > portfolio['balance']:
            return jsonify({
                'success': False,
                'error': 'Insufficient balance for this trade'
            }), 400
        
        # Execute the trade
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Insert trade record
        cur.execute("""
            INSERT INTO paper_trades 
            (portfolio_id, symbol, trade_type, option_type, strike_price, expiry_date, 
             quantity, entry_price, status, executed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'OPEN', CURRENT_TIMESTAMP)
            RETURNING id
        """, (
            portfolio['id'],
            data['symbol'],
            data['trade_type'].upper(),
            data.get('option_type'),
            data.get('strike_price'),
            data.get('expiry_date'),
            data['quantity'],
            data['price']
        ))
        
        trade_id = cur.fetchone()[0]
        
        # Update portfolio balance
        if data['trade_type'].upper() == 'BUY':
            new_balance = portfolio['balance'] - trade_value
        else:  # SELL
            new_balance = portfolio['balance'] + trade_value
        
        cur.execute("""
            UPDATE paper_portfolios 
            SET balance = %s, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """, (new_balance, portfolio['id']))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'trade_id': trade_id,
            'message': f'Paper trade executed successfully',
            'trade_details': {
                'symbol': data['symbol'],
                'trade_type': data['trade_type'].upper(),
                'quantity': data['quantity'],
                'price': data['price'],
                'trade_value': trade_value,
                'new_balance': new_balance
            }
        })
        
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
        user_id = request.args.get('user_id', 'default_user')
        limit = int(request.args.get('limit', 50))
        
        portfolio = get_paper_portfolio(user_id)
        if not portfolio:
            return jsonify({
                'success': False,
                'error': 'Portfolio not found'
            }), 404
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, symbol, trade_type, option_type, strike_price, expiry_date,
                   quantity, entry_price, exit_price, pnl, status, executed_at, closed_at
            FROM paper_trades 
            WHERE portfolio_id = %s 
            ORDER BY executed_at DESC 
            LIMIT %s
        """, (portfolio['id'], limit))
        
        trades = cur.fetchall()
        cur.close()
        conn.close()
        
        trade_list = []
        for trade in trades:
            trade_list.append({
                'id': trade[0],
                'symbol': trade[1],
                'trade_type': trade[2],
                'option_type': trade[3],
                'strike_price': float(trade[4]) if trade[4] else None,
                'expiry_date': trade[5].isoformat() if trade[5] else None,
                'quantity': trade[6],
                'entry_price': float(trade[7]),
                'exit_price': float(trade[8]) if trade[8] else None,
                'pnl': float(trade[9]),
                'status': trade[10],
                'executed_at': trade[11].isoformat() if trade[11] else None,
                'closed_at': trade[12].isoformat() if trade[12] else None
            })
        
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

@paper_trading_bp.route('/api/paper_trading/reset_portfolio', methods=['POST'])
def reset_portfolio():
    """Reset paper trading portfolio to initial state"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'default_user')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Close all open trades
        cur.execute("""
            UPDATE paper_trades 
            SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP 
            WHERE portfolio_id = (
                SELECT id FROM paper_portfolios WHERE user_id = %s
            ) AND status = 'OPEN'
        """, (user_id,))
        
        # Reset portfolio balance
        cur.execute("""
            UPDATE paper_portfolios 
            SET balance = initial_balance, total_pnl = 0.00, updated_at = CURRENT_TIMESTAMP 
            WHERE user_id = %s
        """, (user_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Paper trading portfolio reset successfully'
        })
        
    except Exception as e:
        logger.error(f"Error in reset_portfolio: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500