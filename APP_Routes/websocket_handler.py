"""
WebSocket handler for live option chain data
"""
from fyers_apiv3 import fyersModel
from fyers_apiv3.FyersWebsocket import data_ws
from flask import Blueprint, request, jsonify
import logging
import json
import threading
from datetime import datetime
import pytz
from APP_Extensions.db import db
from models import BrokerSettings

websocket_bp = Blueprint('websocket', __name__)

# Global WebSocket instance
fyers_ws = None
current_subscriptions = []

def get_fyers_client():
    """Get FYERS client with access token"""
    try:
        broker_row = BrokerSettings.query.filter_by(brokername='fyers').first()
        if not broker_row or not broker_row.access_token:
            return None, "No FYERS access token found"
            
        access_token = broker_row.access_token
        client_id = broker_row.clientid
        
        fyers = fyersModel.FyersModel(
            client_id=client_id, 
            token=access_token, 
            is_async=False, 
            log_path=""
        )
        
        return fyers, None
    except Exception as e:
        return None, str(e)

@websocket_bp.route('/get_spot_price', methods=['GET'])
def get_spot_price():
    """Get current spot price for a symbol"""
    try:
        symbol = request.args.get('symbol', '')
        if not symbol:
            return jsonify({"error": "Symbol parameter required"}), 400
            
        fyers, error = get_fyers_client()
        if error:
            return jsonify({"error": error}), 500
            
        # Get spot price
        spot_data = fyers.quotes({"symbols": symbol})
        
        if spot_data.get('s') == 'ok' and spot_data.get('d'):
            spot_price = spot_data['d'][0]['v'].get('lp', 0)
            return jsonify({
                "success": True,
                "symbol": symbol,
                "spot_price": spot_price,
                "timestamp": datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
            })
        else:
            return jsonify({"error": "Failed to get spot price"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@websocket_bp.route('/ws_get_option_chain', methods=['GET'])
def get_option_chain():
    """Get option chain data with WebSocket subscription"""
    try:
        symbol = request.args.get('symbol', '')
        strike_count_param = request.args.get('strike_count', '15')
        expiry_timestamp = request.args.get('expiry_timestamp', '')
        
        # Handle "ALL" option - FYERS API supports up to 100 strikes
        if strike_count_param.upper() == 'ALL':
            strike_count = 100
        else:
            try:
                strike_count = int(strike_count_param)
            except ValueError:
                strike_count = 15
        
        print(f"OPTION CHAIN REQUEST: symbol='{symbol}', strike_count={strike_count}, expiry='{expiry_timestamp}'")
        
        if not symbol:
            print("ERROR: No symbol provided")
            return jsonify({"error": "Symbol parameter required"}), 400
            
        fyers, error = get_fyers_client()
        if error:
            return jsonify({"error": error}), 500
            
        # Get spot price first
        spot_data = fyers.quotes({"symbols": symbol})
        spot_price = 0
        if spot_data.get('s') == 'ok' and spot_data.get('d'):
            spot_price = spot_data['d'][0]['v'].get('lp', 0)
            
        # Get expiry data if no expiry provided
        if not expiry_timestamp:
            data = {"symbol": symbol, "strikecount": 1, "timestamp": ""}
            response = fyers.optionchain(data=data)
            
            if response.get('s') == 'ok':
                expiry_data = response.get('data', {}).get('expiryData', [])
                print(f"EXPIRY DATA RECEIVED: {expiry_data}")
                return jsonify({
                    "success": True,
                    "expiry_data": [{"date": exp["date"], "expiry": exp["expiry"]} for exp in expiry_data],
                    "strikes": [],
                    "spot_price": spot_price,
                    "message": "Select expiry to load option chain"
                })
            else:
                return jsonify({"error": f"Failed to get expiry data: {response.get('message', 'Unknown error')}"}), 500
        
        # Convert date format to timestamp if needed
        # Frontend sends "28-AUG-25" but FYERS expects timestamp like "1756375200"
        converted_timestamp = expiry_timestamp
        
        # If expiry_timestamp looks like a date (contains letters), convert it
        if expiry_timestamp and any(c.isalpha() for c in expiry_timestamp):
            print(f"CONVERTING DATE FORMAT: {expiry_timestamp}")
            
            # First get all expiry data to find the matching timestamp
            data_for_expiry = {"symbol": symbol, "strikecount": 1, "timestamp": ""}
            expiry_response = fyers.optionchain(data=data_for_expiry)
            
            if expiry_response.get('s') == 'ok':
                expiry_data = expiry_response.get('data', {}).get('expiryData', [])
                
                # Convert "28-AUG-25" to "28-08-2025" format to match
                try:
                    from datetime import datetime
                    # Parse "28-AUG-25" format
                    date_obj = datetime.strptime(expiry_timestamp, "%d-%b-%y")
                    # Format as "28-08-2025"
                    formatted_date = date_obj.strftime("%d-%m-%Y")
                    
                    # Find matching timestamp
                    for exp in expiry_data:
                        if exp['date'] == formatted_date:
                            converted_timestamp = exp['expiry']
                            print(f"FOUND MATCHING TIMESTAMP: {formatted_date} -> {converted_timestamp}")
                            break
                    else:
                        print(f"NO MATCHING TIMESTAMP FOUND FOR: {formatted_date}")
                        return jsonify({"error": f"Invalid expiry date: {expiry_timestamp}"}), 400
                        
                except ValueError as e:
                    print(f"DATE PARSING ERROR: {e}")
                    return jsonify({"error": f"Invalid date format: {expiry_timestamp}"}), 400
            else:
                return jsonify({"error": "Failed to get expiry data for conversion"}), 500
        
        print(f"USING TIMESTAMP: {converted_timestamp}")
        
        # Get option chain with expiry
        data = {
            "symbol": symbol,
            "strikecount": strike_count,
            "timestamp": converted_timestamp
        }
        
        response = fyers.optionchain(data=data)
        
        if response.get('s') != 'ok':
            return jsonify({"error": f"FYERS API Error: {response.get('message', 'Unknown error')}"}), 500
            
        option_data = response.get('data', {})
        options_list = option_data.get('optionsChain', [])
        
        # Print option chain data to console
        print(f"\n=== OPTION CHAIN DATA ===")
        print(f"Symbol: {symbol}")
        print(f"Expiry: {expiry_timestamp}")
        print(f"Spot Price: {spot_price}")
        print(f"Total Options: {len(options_list)}")
        print(f"Option Data Sample: {options_list[:3] if options_list else 'No data'}")
        print(f"========================\n")
        
        if not options_list:
            return jsonify({"error": "No option data found"}), 500
            
        # Calculate ATM strike
        atm_strike = min(options_list, key=lambda x: abs(x['strike_price'] - spot_price))['strike_price']
        
        # Group by strike price
        strikes = {}
        symbols_to_subscribe = [symbol]  # Include spot symbol
        
        for option in options_list:
            strike = option.get('strike_price', 0)
            if strike <= 0:
                continue
                
            if strike not in strikes:
                strikes[strike] = {
                    'strike': strike,
                    'ce_ltp': 0, 'pe_ltp': 0,
                    'ce_symbol': '', 'pe_symbol': '',
                    'ce_oi': 0, 'pe_oi': 0,
                    'ce_oich': 0, 'pe_oich': 0,
                    'ce_oichp': 0, 'pe_oichp': 0,
                    'ce_volume': 0, 'pe_volume': 0,
                    'ce_bid': 0, 'pe_bid': 0,
                    'ce_ask': 0, 'pe_ask': 0,
                    'ce_bid_qty': 0, 'pe_bid_qty': 0,
                    'ce_ask_qty': 0, 'pe_ask_qty': 0,
                    'ce_ltpch': 0, 'pe_ltpch': 0,
                    'ce_ltpchp': 0, 'pe_ltpchp': 0,
                    'ce_prev_oi': 0, 'pe_prev_oi': 0,
                    'is_atm': strike == atm_strike
                }
                
            if option.get('option_type') == 'CE':
                strikes[strike]['ce_ltp'] = option.get('ltp', 0)
                strikes[strike]['ce_symbol'] = option.get('symbol', '')
                strikes[strike]['ce_oi'] = option.get('oi', 0)
                strikes[strike]['ce_oich'] = option.get('oich', 0)
                strikes[strike]['ce_oichp'] = option.get('oichp', 0)
                strikes[strike]['ce_volume'] = option.get('volume', 0)
                strikes[strike]['ce_bid'] = option.get('bid', 0)
                strikes[strike]['ce_ask'] = option.get('ask', 0)
                strikes[strike]['ce_ltpch'] = option.get('ltpch', 0)
                strikes[strike]['ce_ltpchp'] = option.get('ltpchp', 0)
                strikes[strike]['ce_prev_oi'] = option.get('prev_oi', 0)
                if option.get('symbol'):
                    symbols_to_subscribe.append(option.get('symbol'))
            elif option.get('option_type') == 'PE':
                strikes[strike]['pe_ltp'] = option.get('ltp', 0)
                strikes[strike]['pe_symbol'] = option.get('symbol', '')
                strikes[strike]['pe_oi'] = option.get('oi', 0)
                strikes[strike]['pe_oich'] = option.get('oich', 0)
                strikes[strike]['pe_oichp'] = option.get('oichp', 0)
                strikes[strike]['pe_volume'] = option.get('volume', 0)
                strikes[strike]['pe_bid'] = option.get('bid', 0)
                strikes[strike]['pe_ask'] = option.get('ask', 0)
                strikes[strike]['pe_ltpch'] = option.get('ltpch', 0)
                strikes[strike]['pe_ltpchp'] = option.get('ltpchp', 0)
                strikes[strike]['pe_prev_oi'] = option.get('prev_oi', 0)
                if option.get('symbol'):
                    symbols_to_subscribe.append(option.get('symbol'))
        
        strike_list = sorted(strikes.values(), key=lambda x: x['strike'])
        
        # Print final processed strikes data
        print(f"\n=== PROCESSED STRIKES DATA ===")
        print(f"Total strikes processed: {len(strike_list)}")
        print(f"ATM Strike: {atm_strike}")
        print(f"Symbols to subscribe: {len(symbols_to_subscribe)}")
        for i, strike in enumerate(strike_list):
            print(f"Strike {i+1}: {strike['strike']} - CE LTP: {strike['ce_ltp']}, PE LTP: {strike['pe_ltp']}")
        print(f"==============================\n")
        
        # Start WebSocket subscription
        start_websocket_subscription(symbols_to_subscribe)
        
        return jsonify({
            "success": True,
            "strikes": strike_list,
            "total_strikes": len(strike_list),
            "spot_price": spot_price,
            "atm_strike": atm_strike,
            "ws_subscribed": symbols_to_subscribe,
            "timestamp": datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def start_websocket_subscription(symbols):
    """Start WebSocket subscription for given symbols"""
    global fyers_ws, current_subscriptions
    
    try:
        # Close existing connection if any
        if fyers_ws:
            try:
                fyers_ws.close_connection()
            except:
                pass
        
        broker_row = BrokerSettings.query.filter_by(brokername='fyers').first()
        if not broker_row or not broker_row.access_token:
            print("No FYERS access token found for WebSocket")
            return
            
        access_token = broker_row.access_token
        client_id = broker_row.clientid
        
        def on_message(message):
            """Handle WebSocket messages"""
            try:
                global latest_option_data
                # Process incoming tick data and store in global variable
                if isinstance(message, dict) and 'symbol' in message:
                    # Store the latest data for this symbol
                    latest_option_data[message['symbol']] = message

            except Exception as e:
                print(f"WebSocket message error: {str(e)}")

        def on_error(error):
            print(f"WebSocket error: {str(error)}")

        def on_close(ws):
            print("WebSocket connection closed")

        def on_open(ws):
            print("WebSocket connection opened")
            try:
                fyers_ws.subscribe(symbols=symbols)
                fyers_ws.keep_alive()
                print(f"Subscribed to {len(symbols)} symbols")
            except Exception as e:
                print(f"Subscription error: {str(e)}")

        # Initialize WebSocket
        fyers_ws = data_ws.FyersDataSocket(
            access_token=f"{client_id}:{access_token}",
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )

        # Connect WebSocket and subscribe
        fyers_ws.connect()
        
        # Subscribe to symbols after connection
        try:
            fyers_ws.subscribe(symbols=symbols)
            fyers_ws.keep_running()
            print(f"WebSocket connected and subscribed to {len(symbols)} symbols")
            current_subscriptions = symbols
        except Exception as e:
            print(f"Subscription error: {str(e)}")
        
    except Exception as e:
        print(f"WebSocket start error: {str(e)}")

@websocket_bp.route('/stop_websocket', methods=['POST'])
def stop_websocket():
    """Stop WebSocket subscription"""
    global fyers_ws, current_subscriptions
    
    try:
        if fyers_ws:
            fyers_ws.unsubscribe()
            fyers_ws.close_connection()
            fyers_ws = None
            current_subscriptions = []
            return jsonify({"success": True, "message": "WebSocket stopped"})
        else:
            return jsonify({"success": True, "message": "No active WebSocket connection"})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@websocket_bp.route('/websocket_status', methods=['GET'])
def websocket_status():
    """Get WebSocket connection status"""
    global fyers_ws, current_subscriptions
    
    return jsonify({
        "connected": fyers_ws is not None,
        "subscriptions": len(current_subscriptions),
        "symbols": current_subscriptions
    })

@websocket_bp.route('/start_websocket_subscription', methods=['POST'])
def start_websocket_subscription():
    """Auto-start WebSocket subscription for option chain"""
    try:
        data = request.get_json()
        symbol = data.get('symbol')
        expiry = data.get('expiry')
        strikes = data.get('strikes', [])
        
        if not symbol or not expiry or not strikes:
            return jsonify({"success": False, "error": "Missing required parameters"}), 400
        
        # Extract option symbols from strikes data
        symbols = []
        for strike in strikes:
            if 'ce_symbol' in strike and strike['ce_symbol']:
                symbols.append(strike['ce_symbol'])
            if 'pe_symbol' in strike and strike['pe_symbol']:
                symbols.append(strike['pe_symbol'])
        
        # Add underlying symbol for spot price
        symbols.append(symbol)
        
        if not symbols:
            return jsonify({"success": False, "error": "No valid symbols found"}), 400
        
        # Start WebSocket with extracted symbols
        start_websocket_with_symbols(symbols)
        
        return jsonify({
            "success": True, 
            "message": f"WebSocket started for {len(symbols)} symbols",
            "symbols_count": len(symbols)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Global variable to store latest option data
latest_option_data = {}

@websocket_bp.route('/get_realtime_option_data', methods=['GET'])
def get_realtime_option_data():
    """Get real-time option data updates from WebSocket messages"""
    try:
        symbol = request.args.get('symbol', '')
        expiry = request.args.get('expiry', '')
        
        if not symbol or not expiry:
            return jsonify({"success": False, "error": "Symbol and expiry parameters required"}), 400
            
        # Extract option updates from latest_option_data
        option_updates = []
        for ws_symbol, data in latest_option_data.items():
            # Check if this symbol matches the current expiry and underlying
            # Dynamic expiry pattern extraction from format like "17-JUL-25" -> "25717"
            expiry_pattern = None
            if expiry and "-" in expiry:
                try:
                    # Parse date like "17-JUL-25" -> "25717"
                    day, month, year = expiry.split("-")
                    month_map = {"JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
                                "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12"}
                    if month in month_map:
                        expiry_pattern = f"{year}{month_map[month]}{day.zfill(2)}"  # e.g., "257717"
                except:
                    pass
                    
            if expiry_pattern and expiry_pattern in ws_symbol and ('CE' in ws_symbol or 'PE' in ws_symbol):
                option_updates.append({
                    'symbol': ws_symbol,
                    'ltp': data.get('ltp', 0),
                    'vol_traded_today': data.get('vol_traded_today', 0),
                    'bid_price': data.get('bid_price', 0),
                    'ask_price': data.get('ask_price', 0),
                    'bid_size': data.get('bid_size', 0),
                    'ask_size': data.get('ask_size', 0),
                    'ch': data.get('ch', 0),
                    'chp': data.get('chp', 0)
                })
        
        return jsonify({
            "success": True,
            "option_updates": option_updates,
            "timestamp": datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500