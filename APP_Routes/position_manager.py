"""
Position Management API for synchronized trading
Handles position CRUD operations and payoff calculations
"""

from flask import Blueprint, request, jsonify
from APP_Extensions.db import db
from models import Position
import logging

position_bp = Blueprint('position', __name__)

@position_bp.route('/api/positions', methods=['GET'])
def get_positions():
    """Get all current positions"""
    try:
        positions = Position.query.filter_by(user_id=0).all()
        return jsonify([position.to_dict() for position in positions])
    except Exception as e:
        logging.error(f"Error getting positions: {e}")
        return jsonify({'error': 'Failed to get positions'}), 500

@position_bp.route('/api/positions', methods=['POST'])
def add_position():
    """Add a new position"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['symbol', 'strike', 'expiry', 'option_type', 'action', 'quantity', 'entry_price', 'current_price']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new position
        position = Position(
            user_id=0,
            symbol=data['symbol'],
            strike=float(data['strike']),
            expiry=data['expiry'],
            option_type=data['option_type'],
            action=data['action'],
            quantity=int(data['quantity']),
            entry_price=float(data['entry_price']),
            current_price=float(data['current_price']),
            lot_size=int(data.get('lot_size', 75))
        )
        
        db.session.add(position)
        db.session.commit()
        
        return jsonify(position.to_dict()), 201
        
    except Exception as e:
        logging.error(f"Error adding position: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to add position'}), 500

@position_bp.route('/api/positions/<int:position_id>', methods=['PUT'])
def update_position(position_id):
    """Update an existing position"""
    try:
        position = Position.query.get_or_404(position_id)
        data = request.get_json()
        
        # Update fields if provided
        if 'quantity' in data:
            position.quantity = int(data['quantity'])
        if 'current_price' in data:
            position.current_price = float(data['current_price'])
        if 'entry_price' in data:
            position.entry_price = float(data['entry_price'])
        
        db.session.commit()
        return jsonify(position.to_dict())
        
    except Exception as e:
        logging.error(f"Error updating position: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update position'}), 500

@position_bp.route('/api/positions/<int:position_id>', methods=['DELETE'])
def delete_position(position_id):
    """Delete a position"""
    try:
        position = Position.query.get_or_404(position_id)
        db.session.delete(position)
        db.session.commit()
        
        return jsonify({'message': 'Position deleted successfully'})
        
    except Exception as e:
        logging.error(f"Error deleting position: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete position'}), 500

@position_bp.route('/api/positions/clear', methods=['DELETE'])
def clear_all_positions():
    """Clear all positions"""
    try:
        Position.query.filter_by(user_id=0).delete()
        db.session.commit()
        
        return jsonify({'message': 'All positions cleared successfully'})
        
    except Exception as e:
        logging.error(f"Error clearing positions: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to clear positions'}), 500

@position_bp.route('/api/positions/payoff', methods=['GET'])
def get_payoff_data():
    """Calculate payoff data for chart"""
    try:
        positions = Position.query.filter_by(user_id=0).all()
        
        if not positions:
            return jsonify({'payoff_data': [], 'margin_info': {}})
        
        # Calculate payoff data for chart
        payoff_data = calculate_payoff_chart(positions)
        margin_info = calculate_margin_info(positions)
        
        return jsonify({
            'payoff_data': payoff_data,
            'margin_info': margin_info
        })
        
    except Exception as e:
        logging.error(f"Error calculating payoff: {e}")
        return jsonify({'error': 'Failed to calculate payoff'}), 500

def calculate_payoff_chart(positions):
    """Calculate payoff chart data"""
    if not positions:
        return []
    
    # Get strike range
    strikes = [pos.strike for pos in positions]
    min_strike = min(strikes)
    max_strike = max(strikes)
    
    # Expand range by 20% on each side
    strike_range = max_strike - min_strike
    start_strike = max(0, min_strike - strike_range * 0.2)
    end_strike = max_strike + strike_range * 0.2
    
    # Generate price points
    price_points = []
    step = max(1, (end_strike - start_strike) / 100)
    
    current_price = start_strike
    while current_price <= end_strike:
        total_pnl = 0
        
        for position in positions:
            if position.option_type == 'CE':
                # Call option
                intrinsic_value = max(0, current_price - position.strike)
                if position.action == 'BUY':
                    pnl = (intrinsic_value - position.entry_price) * position.quantity
                else:  # SELL
                    pnl = (position.entry_price - intrinsic_value) * position.quantity
            else:
                # Put option
                intrinsic_value = max(0, position.strike - current_price)
                if position.action == 'BUY':
                    pnl = (intrinsic_value - position.entry_price) * position.quantity
                else:  # SELL
                    pnl = (position.entry_price - intrinsic_value) * position.quantity
            
            total_pnl += pnl
        
        price_points.append([current_price, total_pnl])
        current_price += step
    
    return price_points

def calculate_margin_info(positions):
    """Calculate margin and P&L information"""
    total_premium = 0
    total_pnl = 0
    max_profit = 0
    max_loss = 0
    breakeven_points = []
    
    for position in positions:
        premium = position.entry_price * position.quantity
        current_pnl = position.to_dict()['pnl']
        
        if position.action == 'BUY':
            total_premium += premium
        else:  # SELL
            total_premium -= premium
        
        total_pnl += current_pnl
    
    return {
        'total_premium': round(total_premium, 2),
        'current_pnl': round(total_pnl, 2),
        'max_profit': 'Unlimited' if max_profit == float('inf') else round(max_profit, 2),
        'max_loss': 'Unlimited' if max_loss == float('-inf') else round(max_loss, 2),
        'position_count': len(positions)
    }