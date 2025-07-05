"""
Three Card Synchronization Backend
Handles server-side coordination between Symbol Selection, Option Chain, and Payoff Chart components
"""

from flask import Blueprint, request, jsonify, session
import json
import logging
from datetime import datetime

# Create blueprint for three-card synchronization routes
three_card_sync_bp = Blueprint('three_card_sync', __name__)

# In-memory storage for session-based synchronization state
# In production, this should be stored in Redis or database
sync_sessions = {}

@three_card_sync_bp.route('/sync/state', methods=['GET'])
def get_sync_state():
    """Get current synchronization state for the session"""
    try:
        session_id = session.get('session_id', 'default')
        
        if session_id not in sync_sessions:
            sync_sessions[session_id] = {
                'current_symbol': None,
                'current_expiry': None,
                'current_spot_price': None,
                'positions': [],
                'last_updated': None
            }
        
        return jsonify({
            'success': True,
            'sync_state': sync_sessions[session_id]
        })
        
    except Exception as e:
        logging.error(f"Error getting sync state: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@three_card_sync_bp.route('/sync/symbol', methods=['POST'])
def update_sync_symbol():
    """Update current symbol in synchronization state"""
    try:
        data = request.get_json()
        symbol = data.get('symbol')
        session_id = session.get('session_id', 'default')
        
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol is required'
            }), 400
        
        # Initialize session if not exists
        if session_id not in sync_sessions:
            sync_sessions[session_id] = {
                'current_symbol': None,
                'current_expiry': None,
                'current_spot_price': None,
                'positions': [],
                'last_updated': None
            }
        
        # Update symbol
        sync_sessions[session_id]['current_symbol'] = symbol
        sync_sessions[session_id]['last_updated'] = datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'message': f'Symbol updated to {symbol}',
            'sync_state': sync_sessions[session_id]
        })
        
    except Exception as e:
        logging.error(f"Error updating sync symbol: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@three_card_sync_bp.route('/sync/expiry', methods=['POST'])
def update_sync_expiry():
    """Update current expiry in synchronization state"""
    try:
        data = request.get_json()
        expiry = data.get('expiry')
        session_id = session.get('session_id', 'default')
        
        if not expiry:
            return jsonify({
                'success': False,
                'error': 'Expiry is required'
            }), 400
        
        # Initialize session if not exists
        if session_id not in sync_sessions:
            sync_sessions[session_id] = {
                'current_symbol': None,
                'current_expiry': None,
                'current_spot_price': None,
                'positions': [],
                'last_updated': None
            }
        
        # Update expiry
        sync_sessions[session_id]['current_expiry'] = expiry
        sync_sessions[session_id]['last_updated'] = datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'message': f'Expiry updated to {expiry}',
            'sync_state': sync_sessions[session_id]
        })
        
    except Exception as e:
        logging.error(f"Error updating sync expiry: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@three_card_sync_bp.route('/sync/spot_price', methods=['POST'])
def update_sync_spot_price():
    """Update current spot price in synchronization state"""
    try:
        data = request.get_json()
        spot_price = data.get('spot_price')
        session_id = session.get('session_id', 'default')
        
        if spot_price is None:
            return jsonify({
                'success': False,
                'error': 'Spot price is required'
            }), 400
        
        # Initialize session if not exists
        if session_id not in sync_sessions:
            sync_sessions[session_id] = {
                'current_symbol': None,
                'current_expiry': None,
                'current_spot_price': None,
                'positions': [],
                'last_updated': None
            }
        
        # Update spot price
        sync_sessions[session_id]['current_spot_price'] = float(spot_price)
        sync_sessions[session_id]['last_updated'] = datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'message': f'Spot price updated to {spot_price}',
            'sync_state': sync_sessions[session_id]
        })
        
    except Exception as e:
        logging.error(f"Error updating sync spot price: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@three_card_sync_bp.route('/sync/positions', methods=['GET', 'POST'])
def manage_sync_positions():
    """Get or update positions in synchronization state"""
    try:
        session_id = session.get('session_id', 'default')
        
        # Initialize session if not exists
        if session_id not in sync_sessions:
            sync_sessions[session_id] = {
                'current_symbol': None,
                'current_expiry': None,
                'current_spot_price': None,
                'positions': [],
                'last_updated': None
            }
        
        if request.method == 'GET':
            return jsonify({
                'success': True,
                'positions': sync_sessions[session_id]['positions']
            })
        
        elif request.method == 'POST':
            data = request.get_json()
            action = data.get('action', 'update')
            
            if action == 'add':
                position = data.get('position')
                if not position:
                    return jsonify({
                        'success': False,
                        'error': 'Position data is required'
                    }), 400
                
                # Add position with timestamp
                position['created_at'] = datetime.utcnow().isoformat()
                sync_sessions[session_id]['positions'].append(position)
                
            elif action == 'update':
                positions = data.get('positions', [])
                sync_sessions[session_id]['positions'] = positions
                
            elif action == 'clear':
                sync_sessions[session_id]['positions'] = []
                
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unknown action: {action}'
                }), 400
            
            sync_sessions[session_id]['last_updated'] = datetime.utcnow().isoformat()
            
            return jsonify({
                'success': True,
                'message': f'Positions {action} successful',
                'positions': sync_sessions[session_id]['positions']
            })
        
    except Exception as e:
        logging.error(f"Error managing sync positions: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@three_card_sync_bp.route('/sync/export', methods=['GET'])
def export_sync_state():
    """Export complete synchronization state"""
    try:
        session_id = session.get('session_id', 'default')
        
        if session_id not in sync_sessions:
            return jsonify({
                'success': False,
                'error': 'No sync state found for session'
            }), 404
        
        return jsonify({
            'success': True,
            'sync_state': sync_sessions[session_id],
            'export_timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"Error exporting sync state: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@three_card_sync_bp.route('/sync/import', methods=['POST'])
def import_sync_state():
    """Import complete synchronization state"""
    try:
        data = request.get_json()
        sync_state = data.get('sync_state')
        session_id = session.get('session_id', 'default')
        
        if not sync_state:
            return jsonify({
                'success': False,
                'error': 'Sync state data is required'
            }), 400
        
        # Validate sync state structure
        required_keys = ['current_symbol', 'current_expiry', 'current_spot_price', 'positions']
        if not all(key in sync_state for key in required_keys):
            return jsonify({
                'success': False,
                'error': 'Invalid sync state structure'
            }), 400
        
        # Import sync state
        sync_state['last_updated'] = datetime.utcnow().isoformat()
        sync_sessions[session_id] = sync_state
        
        return jsonify({
            'success': True,
            'message': 'Sync state imported successfully',
            'sync_state': sync_sessions[session_id]
        })
        
    except Exception as e:
        logging.error(f"Error importing sync state: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@three_card_sync_bp.route('/sync/validate', methods=['POST'])
def validate_sync_consistency():
    """Validate consistency between cards"""
    try:
        data = request.get_json()
        session_id = session.get('session_id', 'default')
        
        # Get current states from each card
        symbol_card_state = data.get('symbol_card_state', {})
        option_chain_state = data.get('option_chain_state', {})
        payoff_chart_state = data.get('payoff_chart_state', {})
        
        # Check for inconsistencies
        inconsistencies = []
        
        # Check symbol consistency
        symbols = [
            symbol_card_state.get('symbol'),
            option_chain_state.get('symbol'),
            payoff_chart_state.get('symbol')
        ]
        if len(set(filter(None, symbols))) > 1:
            inconsistencies.append('Symbol mismatch between cards')
        
        # Check expiry consistency
        expiries = [
            symbol_card_state.get('expiry'),
            option_chain_state.get('expiry'),
            payoff_chart_state.get('expiry')
        ]
        if len(set(filter(None, expiries))) > 1:
            inconsistencies.append('Expiry mismatch between cards')
        
        # Check spot price consistency (with tolerance)
        spot_prices = [
            symbol_card_state.get('spot_price'),
            option_chain_state.get('spot_price'),
            payoff_chart_state.get('spot_price')
        ]
        valid_prices = [p for p in spot_prices if p is not None]
        if valid_prices and max(valid_prices) - min(valid_prices) > 1.0:
            inconsistencies.append('Spot price mismatch between cards')
        
        return jsonify({
            'success': True,
            'is_consistent': len(inconsistencies) == 0,
            'inconsistencies': inconsistencies,
            'checked_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logging.error(f"Error validating sync consistency: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def cleanup_old_sessions():
    """Clean up old session data (should be called periodically)"""
    current_time = datetime.utcnow()
    sessions_to_remove = []
    
    for session_id, session_data in sync_sessions.items():
        last_updated = session_data.get('last_updated')
        if last_updated:
            try:
                last_update_time = datetime.fromisoformat(last_updated)
                # Remove sessions older than 24 hours
                if (current_time - last_update_time).total_seconds() > 86400:
                    sessions_to_remove.append(session_id)
            except:
                # Remove sessions with invalid timestamps
                sessions_to_remove.append(session_id)
    
    for session_id in sessions_to_remove:
        del sync_sessions[session_id]
    
    return len(sessions_to_remove)

@three_card_sync_bp.route('/sync/cleanup', methods=['POST'])
def cleanup_sync_sessions():
    """Manual cleanup of old sync sessions"""
    try:
        cleaned_count = cleanup_old_sessions()
        
        return jsonify({
            'success': True,
            'message': f'Cleaned up {cleaned_count} old sessions',
            'active_sessions': len(sync_sessions)
        })
        
    except Exception as e:
        logging.error(f"Error cleaning up sync sessions: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500