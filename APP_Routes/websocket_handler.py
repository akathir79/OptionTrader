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
from app import db
from models import BrokerSettings
from services.fyers_service import FyersService

websocket_bp = Blueprint('websocket', __name__)

# Global WebSocket instance
fyers_ws = None
current_subscriptions = []
live_market_data = {}

def get_fyers_client():
    """Get FYERS client with access token"""
    try:
        # ⚠️ CRITICAL: Database stores 'FYERS' (uppercase) - DO NOT change case!
        # Changing to lowercase 'fyers' will break authentication completely
        broker_row = BrokerSettings.query.filter_by(brokername='FYERS').first()
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
    """Get current spot price and day open data for a symbol with gap analysis"""
    try:
        symbol = request.args.get('symbol', '')
        if not symbol:
            return jsonify({"error": "Symbol parameter required"}), 400
            
        # Use FyersService to get comprehensive quote data
        fyers_service = FyersService(user_id=0)  # Using default user_id for now
        quotes_response = fyers_service.get_quotes(symbol)
        
        if not quotes_response.get('success') or 'error' in quotes_response:
            error_msg = quotes_response.get('error', 'Failed to fetch quotes')
            return jsonify({"error": error_msg}), 500
        
        # Extract quote data from the response structure
        quotes_data = quotes_response.get('quotes', [])
        if not quotes_data:
            return jsonify({"error": "No quote data available"}), 500
        
        quote = quotes_data[0]  # Get first quote
        quote_values = quote.get('v', {})
        
        # Calculate gap analysis
        day_open = quote_values.get('open_price', 0)
        prev_close = quote_values.get('prev_close_price', 0)
        current_price = quote.get('ltp', 0)
        
        gap_abs = day_open - prev_close if (day_open and prev_close) else 0
        gap_pct = (gap_abs / prev_close * 100) if prev_close else 0
        change = current_price - prev_close if prev_close else 0
        change_pct = (change / prev_close * 100) if prev_close else 0
            
        # Return comprehensive data including day open and gap analysis
        return jsonify({
            "success": True,
            "symbol": symbol,
            "spot_price": current_price,
            "day_open": day_open,
            "prev_close": prev_close,
            "change": change,
            "change_percent": change_pct,
            "gap_abs": gap_abs,
            "gap_pct": gap_pct,
            "fyers_symbol": quote_values.get('symbol', symbol),
            "is_cached": False,
            "timestamp": quote_values.get('tt', '')
        })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@websocket_bp.route('/ws_get_option_chain', methods=['GET'])
def get_option_chain():
    """Get option chain data with WebSocket subscription using proper Fyers API v3"""
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
        
        # Get access token from database  
        # ⚠️ CRITICAL: Must be 'FYERS' (uppercase) - matches database storage exactly
        broker_row = BrokerSettings.query.filter_by(brokername='FYERS').first()
        if not broker_row or not broker_row.access_token:
            return jsonify({"error": "No FYERS access token found"}), 500
            
        access_token = broker_row.access_token
        client_id = broker_row.clientid
        
        print(f"OPTION CHAIN: symbol={symbol}, strikes={strike_count}, expiry={expiry_timestamp}")
        
        # Initialize FYERS model
        fyers = fyersModel.FyersModel(client_id=client_id, token=access_token, is_async=False, log_path="")
        
        # Get spot price from WebSocket data instead of REST API to avoid 429 errors
        spot_price = 0
        try:
            # Try to get spot price from WebSocket live data first
            global live_market_data
            if symbol in live_market_data:
                spot_price = live_market_data[symbol].get('ltp', 0)
                print(f"SPOT PRICE FROM WEBSOCKET: {spot_price}")
            else:
                # No WebSocket data available - use REST API fallback for ATM calculation
                print(f"NO WEBSOCKET DATA FOR {symbol} - using REST API fallback for ATM")
                try:
                    from services.fyers_service import FyersService
                    fyers_service = FyersService()
                    quotes_response = fyers_service.get_quotes(symbol)
                    
                    if quotes_response.get('success') and quotes_response.get('quotes'):
                        spot_price = quotes_response['quotes'][0].get('ltp', 0)
                        print(f"SPOT PRICE FROM REST FALLBACK: {spot_price}")
                    else:
                        print(f"REST FALLBACK FAILED: {quotes_response.get('error', 'Unknown error')}")
                        spot_price = 25000  # Final fallback for market closed scenarios
                        print(f"Using final fallback spot price: {spot_price}")
                except Exception as rest_e:
                    print(f"REST API FALLBACK ERROR: {rest_e}")
                    spot_price = 25000  # Final fallback
                    print(f"Using final fallback spot price: {spot_price}")
        except Exception as e:
            print(f"SPOT PRICE WEBSOCKET ERROR: {e}")
            spot_price = 25000  # Safe fallback
        
        # Get expiry data if no expiry provided
        if not expiry_timestamp:
            data = {"symbol": symbol, "strikecount": 1, "timestamp": ""}
            response = fyers.optionchain(data=data)
            
            if response.get('s') == 'ok':
                expiry_data = response.get('data', {}).get('expiryData', [])
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
        
        if not options_list:
            return jsonify({"error": "No option data found"}), 500

        # Debug: Check first few options for oich field
        sample_options = options_list[:3]
        print("=== API RESPONSE SAMPLE ===")
        for i, opt in enumerate(sample_options):
            print(f"Option {i+1}: Type={opt.get('option_type')}, Strike={opt.get('strike_price')}")
            print(f"  Has 'oich': {'oich' in opt}, OICH Value: {opt.get('oich', 'MISSING')}")
            print(f"  Has 'oi': {'oi' in opt}, OI Value: {opt.get('oi', 'MISSING')}")
            print(f"  Available fields: {list(opt.keys())[:10]}...")  # Show first 10 fields
        print("==========================")
        
            
        # Calculate ATM strike
        atm_strike = min(options_list, key=lambda x: abs(x['strike_price'] - spot_price))['strike_price']
        
        # Group by strike price
        strikes = {}
        symbols_to_subscribe = []
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
                    'ce_volume': 0,
                    'pe_volume': 0,
                    'ce_oich': 0,
                    'pe_oich': 0,
                    'ce_bid': 0,
                    'pe_bid': 0,
                    'ce_ask': 0,
                    'pe_ask': 0,
                    'ce_bid_qty': 0,
                    'pe_bid_qty': 0,
                    'ce_ask_qty': 0,
                    'pe_ask_qty': 0,
                    'is_atm': strike == atm_strike
                }
                
            if option.get('option_type') == 'CE':
                strikes[strike]['ce_ltp'] = option.get('ltp', 0)
                strikes[strike]['ce_symbol'] = option.get('symbol', '')
                strikes[strike]['ce_oi'] = option.get('oi', 0)
                strikes[strike]['ce_volume'] = option.get('volume', 0)
                strikes[strike]['ce_oich'] = option.get('oich', 0)
                strikes[strike]['ce_bid'] = option.get('bid', 0)
                strikes[strike]['ce_ask'] = option.get('ask', 0)
                strikes[strike]['ce_bid_qty'] = option.get('bid_qty', 0)
                strikes[strike]['ce_ask_qty'] = option.get('ask_qty', 0)
                if option.get('symbol'):
                    symbols_to_subscribe.append(option.get('symbol'))
            elif option.get('option_type') == 'PE':
                strikes[strike]['pe_ltp'] = option.get('ltp', 0)
                strikes[strike]['pe_symbol'] = option.get('symbol', '')
                strikes[strike]['pe_oi'] = option.get('oi', 0)
                strikes[strike]['pe_volume'] = option.get('volume', 0)
                strikes[strike]['pe_oich'] = option.get('oich', 0)
                strikes[strike]['pe_bid'] = option.get('bid', 0)
                strikes[strike]['pe_ask'] = option.get('ask', 0)
                strikes[strike]['pe_bid_qty'] = option.get('bid_qty', 0)
                strikes[strike]['pe_ask_qty'] = option.get('ask_qty', 0)
                if option.get('symbol'):
                    symbols_to_subscribe.append(option.get('symbol'))
        
        strike_list = sorted(strikes.values(), key=lambda x: x['strike'])
        
        # Print final processed strikes data
        print(f"\n=== PROCESSED STRIKES DATA ===")
        print(f"Total strikes processed: {len(strike_list)}")
        print(f"ATM Strike: {atm_strike}")
        print(f"Symbols to subscribe: {len(symbols_to_subscribe)}")
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
        print(f"OPTION CHAIN ERROR: {str(e)}")
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
        
        # ⚠️ CRITICAL: 'FYERS' case sensitivity - DO NOT modify!
        broker_row = BrokerSettings.query.filter_by(brokername='FYERS').first()
        if not broker_row or not broker_row.access_token:
            print("No FYERS access token found for WebSocket")
            return
            
        access_token = broker_row.access_token
        client_id = broker_row.clientid
        
        def on_message(message):
            """Handle WebSocket messages"""
            try:
                # Process incoming tick data
                print(f"WebSocket message: {message}")
                
                # Store live data in global variable for frontend polling
                global live_market_data
                if message and 'symbol' in message:
                    symbol = message['symbol']
                    live_market_data[symbol] = {
                        'ltp': message.get('ltp', 0),
                        'volume': message.get('vol_traded_today', 0),
                        'total_buy_qty': message.get('tot_buy_qty', 0),  # Correct field name
                        'total_sell_qty': message.get('tot_sell_qty', 0),  # Add sell qty too
                        'change': message.get('ch', 0),
                        'bid': message.get('bid_price', 0),
                        'ask': message.get('ask_price', 0),
                        'open_price': message.get('open_price', 0),
                        'prev_close_price': message.get('prev_close_price', 0),
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # Check if this is a main market data symbol (spot, futures, VIX)
                    if symbol.endswith('-INDEX') or symbol in ['NSE:INDIAVIX-INDEX']:
                        print(f"📈 MAIN MARKET DATA UPDATE: {symbol} = {message.get('ltp', 0)}")
            except Exception as e:
                print(f"WebSocket message error: {str(e)}")

        def on_error(error):
            print(f"WebSocket error: {str(error)}")

        def on_close(close_status_code=None, close_msg=None):
            print(f"WebSocket connection closed: {close_status_code} - {close_msg}")

        def on_open():
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

@websocket_bp.route('/update_subscriptions', methods=['POST'])
def update_subscriptions():
    """Update WebSocket subscriptions with new symbols"""
    global fyers_ws, current_subscriptions, live_market_data
    
    try:
        data = request.get_json()
        new_symbols = data.get('symbols', [])
        
        if not fyers_ws:
            return jsonify({"error": "No active WebSocket connection"}), 400
            
        # Clear cache for clean data
        live_market_data.clear()
        
        # Unsubscribe from old symbols if any
        if current_subscriptions:
            print(f"Unsubscribing from {len(current_subscriptions)} old symbols")
            fyers_ws.unsubscribe(symbols=current_subscriptions)
            
        # Subscribe to new symbols
        if new_symbols:
            print(f"Subscribing to {len(new_symbols)} new symbols")
            fyers_ws.subscribe(symbols=new_symbols)
            current_subscriptions = new_symbols
            
            return jsonify({
                "success": True, 
                "message": f"Updated subscriptions to {len(new_symbols)} symbols",
                "symbols": new_symbols
            })
        else:
            current_subscriptions = []
            return jsonify({
                "success": True, 
                "message": "Cleared all subscriptions"
            })
            
    except Exception as e:
        print(f"Subscription update error: {str(e)}")
        return jsonify({"error": f"Failed to update subscriptions: {str(e)}"}), 500

@websocket_bp.route('/stop_websocket', methods=['POST'])
def stop_websocket():
    """Stop WebSocket subscription"""
    global fyers_ws, current_subscriptions, live_market_data
    
    try:
        if fyers_ws:
            fyers_ws.unsubscribe()
            fyers_ws.close_connection()
            fyers_ws = None
            current_subscriptions = []
            live_market_data.clear()
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

@websocket_bp.route('/live_market_data', methods=['GET'])
def get_live_market_data():
    """Get live market data for frontend polling"""
    global live_market_data
    
    return jsonify({
        "success": True,
        "data": live_market_data,
        "count": len(live_market_data),
        "timestamp": datetime.now().isoformat()
    })