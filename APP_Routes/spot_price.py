from flask import Blueprint, jsonify, request
from APP_Extensions.db import db
from models import BrokerSettings
from fyers_apiv3 import fyersModel
import logging

spot_price_bp = Blueprint('spot_price', __name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def get_broker_credentials():
    """Get broker credentials from database"""
    try:
        broker_row = BrokerSettings.query.filter_by(brokername='fyers', user_id=0).first()
        if not broker_row or not broker_row.access_token or not broker_row.clientid:
            return None, None
        return broker_row.access_token, broker_row.clientid
    except Exception as e:
        logger.error(f"Database error getting broker credentials: {e}")
        return None, None

@spot_price_bp.route('/get_spot_price', methods=['GET'])
def get_spot_price():
    """Get current spot price for a symbol"""
    try:
        symbol = request.args.get('symbol')
        if not symbol:
            return jsonify({"error": "Symbol parameter required"}), 400
        
        # Get broker credentials
        access_token, client_id = get_broker_credentials()
        if not access_token or not client_id:
            return jsonify({"error": "Broker credentials not found"}), 403
        
        # Initialize FYERS model
        fyers = fyersModel.FyersModel(
            client_id=str(client_id), 
            token=access_token, 
            is_async=False, 
            log_path=""
        )
        
        # Get spot price
        spot_data = fyers.quotes({"symbols": symbol})
        
        if not spot_data:
            return jsonify({"error": "No data received from FYERS"}), 500
            
        if spot_data.get('s') == 'ok' and spot_data.get('d'):
            spot_price = spot_data['d'][0]['v'].get('lp', 0)
            return jsonify({
                "symbol": symbol,
                "spot_price": spot_price,
                "status": "success"
            })
        else:
            error_msg = spot_data.get('message', 'Unknown error')
            return jsonify({"error": f"FYERS API Error: {error_msg}"}), 500
            
    except Exception as e:
        logger.error(f"Error getting spot price: {e}")
        return jsonify({"error": "Internal server error"}), 500