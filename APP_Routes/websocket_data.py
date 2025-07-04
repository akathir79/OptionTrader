from fyers_apiv3 import fyersModel
from fyers_apiv3.FyersWebsocket import data_ws
from flask import Blueprint, request, jsonify
import logging
import json
import threading
import time
from datetime import datetime
import pytz
from APP_Extensions.db import db
from models import BrokerSettings

websocket_bp = Blueprint('websocket', __name__)

# Global WebSocket connection
fyers_ws = None
subscribed_symbols = set()
live_data = {}
spot_prices = {}

def get_access_token():
    """Get FYERS access token from database"""
    broker_row = BrokerSettings.query.filter_by(brokername='fyers', user_id=0).first()
    if not broker_row or not broker_row.access_token:
        return None, None
    return broker_row.access_token, broker_row.clientid

@websocket_bp.route('/start_websocket', methods=['POST'])
def start_websocket():
    """Initialize WebSocket connection"""
    global fyers_ws
    
    try:
        access_token, client_id = get_access_token()
        if not access_token:
            return jsonify({"error": "No FYERS access token found"}), 403
        
        if fyers_ws:
            return jsonify({"message": "WebSocket already connected", "status": "running"}), 200
        
        def on_message(message):
            """Handle incoming WebSocket data"""
            try:
                data = json.loads(message)
                symbol = data.get('symbol', '')
                
                if symbol:
                    live_data[symbol] = {
                        'ltp': data.get('ltp', 0),
                        'open': data.get('open_price', 0),
                        'high': data.get('high_price', 0),
                        'low': data.get('low_price', 0),
                        'volume': data.get('volume', 0),
                        'oi': data.get('oi', 0),
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # Store spot prices separately for index symbols
                    if 'INDEX' in symbol:
                        spot_prices[symbol] = data.get('ltp', 0)
                        
                    print(f"Live data updated: {symbol} = {data.get('ltp', 0)}")
                    
            except Exception as e:
                print(f"WebSocket message error: {str(e)}")

        def on_error(error):
            print(f"WebSocket error: {str(error)}")

        def on_close():
            print("WebSocket connection closed")
            global fyers_ws
            fyers_ws = None

        def on_open():
            print("WebSocket connection opened successfully")

        # Initialize WebSocket
        fyers_ws = data_ws.FyersDataSocket(
            access_token=f"{client_id}:{access_token}",
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,

        )

        # Start WebSocket in a separate thread
        ws_thread = threading.Thread(target=fyers_ws.connect)
        ws_thread.daemon = True
        ws_thread.start()
        
        # Give it a moment to connect
        time.sleep(2)
        
        return jsonify({
            "message": "WebSocket started successfully",
            "status": "connected"
        }), 200
        
    except Exception as e:
        print(f"WebSocket start error: {str(e)}")
        return jsonify({"error": f"Failed to start WebSocket: {str(e)}"}), 500

@websocket_bp.route('/subscribe_symbols', methods=['POST'])
def subscribe_symbols():
    """Subscribe to symbols for live data"""
    global fyers_ws, subscribed_symbols
    
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        
        if not symbols:
            return jsonify({"error": "No symbols provided"}), 400
            
        if not fyers_ws:
            return jsonify({"error": "WebSocket not connected. Start WebSocket first."}), 400
        
        # Subscribe to new symbols
        new_symbols = [s for s in symbols if s not in subscribed_symbols]
        if new_symbols:
            fyers_ws.subscribe(symbols=new_symbols)
            subscribed_symbols.update(new_symbols)
            
        return jsonify({
            "message": f"Subscribed to {len(new_symbols)} new symbols",
            "new_symbols": new_symbols,
            "total_subscribed": len(subscribed_symbols)
        }), 200
        
    except Exception as e:
        print(f"Subscribe error: {str(e)}")
        return jsonify({"error": f"Failed to subscribe: {str(e)}"}), 500

@websocket_bp.route('/get_live_data', methods=['GET'])
def get_live_data():
    """Get current live data for subscribed symbols"""
    try:
        symbol = request.args.get('symbol', '')
        
        if symbol:
            data = live_data.get(symbol, {})
            if data:
                return jsonify({"symbol": symbol, "data": data}), 200
            else:
                return jsonify({"error": f"No live data for symbol {symbol}"}), 404
        else:
            # Return all live data
            return jsonify({
                "live_data": live_data,
                "spot_prices": spot_prices,
                "subscribed_count": len(subscribed_symbols)
            }), 200
            
    except Exception as e:
        print(f"Get live data error: {str(e)}")
        return jsonify({"error": f"Failed to get live data: {str(e)}"}), 500

@websocket_bp.route('/get_option_chain_live', methods=['POST'])
def get_option_chain_live():
    """Get option chain with live data and WebSocket subscription"""
    try:
        data = request.get_json()
        symbol = data.get('symbol', '')
        expiry = data.get('expiry', '')
        strike_count = data.get('strike_count', 10)
        
        if not symbol or not expiry:
            return jsonify({"error": "Symbol and expiry are required"}), 400
        
        access_token, client_id = get_access_token()
        if not access_token:
            return jsonify({"error": "No FYERS access token found"}), 403
        
        # Initialize FYERS model
        if not client_id:
            return jsonify({"error": "Client ID not found"}), 403
            
        fyers = fyersModel.FyersModel(client_id=str(client_id), token=access_token, is_async=False, log_path="")
        
        # Get spot price
        spot_data = fyers.quotes({"symbols": symbol})
        spot_price = 0
        if spot_data and spot_data.get('s') == 'ok' and spot_data.get('d'):
            spot_price = spot_data['d'][0]['v'].get('lp', 0)
        
        # Get option chain
        option_data = {
            "symbol": symbol,
            "strikecount": strike_count,
            "timestamp": expiry
        }
        
        response = fyers.optionchain(data=option_data)
        
        if not response or response.get('s') != 'ok':
            return jsonify({"error": f"FYERS API Error: {response.get('message', 'Unknown error') if response else 'No response'}"}), 500
        
        option_chain = response.get('data', {})
        options_list = option_chain.get('optionsChain', [])
        
        if not options_list:
            return jsonify({"error": "No option data found"}), 404
        
        # Calculate ATM strike
        atm_strike = min(options_list, key=lambda x: abs(x['strike_price'] - spot_price))['strike_price']
        
        # Group by strike price and prepare for WebSocket
        strikes = {}
        symbols_to_subscribe = [symbol]  # Include spot symbol
        
        for option in options_list:
            strike = option.get('strike_price', 0)
            if strike <= 0:
                continue
            
            if strike not in strikes:
                strikes[strike] = {
                    'strike': strike,
                    'ce_ltp': 0,
                    'pe_ltp': 0,
                    'ce_symbol': '',
                    'pe_symbol': '',
                    'ce_oi': 0,
                    'pe_oi': 0,
                    'ce_iv': 0,
                    'pe_iv': 0,
                    'is_atm': strike == atm_strike,
                    'ce_change': 0,
                    'pe_change': 0
                }
            
            if option.get('option_type') == 'CE':
                strikes[strike]['ce_ltp'] = option.get('ltp', 0)
                strikes[strike]['ce_symbol'] = option.get('symbol', '')
                strikes[strike]['ce_oi'] = option.get('oi', 0)
                strikes[strike]['ce_iv'] = option.get('iv', 0)
                strikes[strike]['ce_change'] = option.get('ch', 0)
                symbols_to_subscribe.append(option.get('symbol'))
            elif option.get('option_type') == 'PE':
                strikes[strike]['pe_ltp'] = option.get('ltp', 0)
                strikes[strike]['pe_symbol'] = option.get('symbol', '')
                strikes[strike]['pe_oi'] = option.get('oi', 0)
                strikes[strike]['pe_iv'] = option.get('iv', 0)
                strikes[strike]['pe_change'] = option.get('ch', 0)
                symbols_to_subscribe.append(option.get('symbol'))
        
        strike_list = sorted(strikes.values(), key=lambda x: x['strike'])
        
        # Subscribe to all option symbols for live data
        if symbols_to_subscribe:
            # Create request object for subscription
            from flask import g
            temp_request = type('Request', (), {'get_json': lambda: {'symbols': symbols_to_subscribe}})()
            
            # Subscribe to symbols
            global fyers_ws, subscribed_symbols
            if fyers_ws:
                new_symbols = [s for s in symbols_to_subscribe if s not in subscribed_symbols]
                if new_symbols:
                    fyers_ws.subscribe(symbols=new_symbols)
                    subscribed_symbols.update(new_symbols)
            
        return jsonify({
            "success": True,
            "strikes": strike_list,
            "spot_price": spot_price,
            "atm_strike": atm_strike,
            "total_strikes": len(strike_list),
            "subscribed_symbols": len(symbols_to_subscribe),
            "expiry": expiry
        }), 200
        
    except Exception as e:
        print(f"Option chain live error: {str(e)}")
        return jsonify({"error": f"Failed to get option chain: {str(e)}"}), 500

@websocket_bp.route('/stop_websocket', methods=['POST'])
def stop_websocket():
    """Stop WebSocket connection and unsubscribe from all symbols"""
    global fyers_ws, subscribed_symbols, live_data, spot_prices
    
    try:
        if fyers_ws:
            fyers_ws.unsubscribe()
            fyers_ws.close_connection()
            fyers_ws = None
            
        # Clear data
        subscribed_symbols.clear()
        live_data.clear()
        spot_prices.clear()
        
        return jsonify({
            "message": "WebSocket stopped and data cleared",
            "status": "disconnected"
        }), 200
        
    except Exception as e:
        print(f"Stop WebSocket error: {str(e)}")
        return jsonify({"error": f"Failed to stop WebSocket: {str(e)}"}), 500

@websocket_bp.route('/websocket_status', methods=['GET'])
def websocket_status():
    """Get WebSocket connection status"""
    try:
        return jsonify({
            "connected": fyers_ws is not None,
            "subscribed_symbols": len(subscribed_symbols),
            "live_data_count": len(live_data),
            "spot_prices": spot_prices
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get status: {str(e)}"}), 500