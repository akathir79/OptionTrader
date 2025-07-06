"""
Historical Data API for Option Price Microcharts
Fetches FYERS historical data for option symbols
"""

from flask import Blueprint, request, jsonify
import logging
from datetime import datetime, timedelta
from fyers_apiv3 import fyersModel
from models import BrokerSettings

historical_bp = Blueprint('historical', __name__)

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

@historical_bp.route('/api/option_history/<symbol>')
def get_option_history(symbol):
    """Get historical price data for option microchart"""
    try:
        # Get FYERS client
        fyers, error = get_fyers_client()
        if error:
            return jsonify({"error": error}), 500
        
        # Get date range (last 7 days to ensure we get weekday data)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        # Format dates for FYERS API
        from_date = start_date.strftime("%Y-%m-%d")
        to_date = end_date.strftime("%Y-%m-%d")
        
        print(f"FETCHING HISTORICAL DATA FOR: {symbol}")
        print(f"Date Range: {from_date} to {to_date}")
        
        # FYERS historical data request
        data = {
            "symbol": symbol,
            "resolution": "5",  # 5-minute intervals
            "date_format": "1",
            "range_from": from_date,
            "range_to": to_date,
            "cont_flag": "1"
        }
        
        response = fyers.history(data=data)
        
        print(f"FYERS HISTORY RESPONSE: {response}")
        
        if response.get('s') == 'no_data':
            print(f"FYERS HISTORY: No data available for {symbol}")
            return jsonify({
                "symbol": symbol,
                "prices": [],
                "timestamps": [],
                "message": "No historical data available"
            })
        elif response.get('s') != 'ok':
            print(f"FYERS HISTORY ERROR: {response}")
            return jsonify({"error": f"FYERS API Error: {response.get('message', 'Unknown error')}"}), 500
            
        # Extract price data
        candles = response.get('candles', [])
        
        if not candles:
            return jsonify({
                "symbol": symbol,
                "prices": [],
                "timestamps": [],
                "message": "No historical data available"
            })
        
        # Process candles data: [timestamp, open, high, low, close, volume]
        prices = []
        timestamps = []
        
        for candle in candles:
            if len(candle) >= 5:
                timestamps.append(int(candle[0]))  # Unix timestamp
                prices.append(float(candle[4]))    # Close price
        
        print(f"PROCESSED DATA: {len(prices)} price points for {symbol}")
        
        return jsonify({
            "symbol": symbol,
            "prices": prices,
            "timestamps": timestamps,
            "count": len(prices)
        })
        
    except Exception as e:
        print(f"HISTORICAL DATA ERROR: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@historical_bp.route('/api/batch_option_history', methods=['POST'])
def get_batch_option_history():
    """Get historical data for multiple option symbols"""
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        
        if not symbols:
            return jsonify({"error": "No symbols provided"}), 400
            
        # Get FYERS client
        fyers, error = get_fyers_client()
        if error:
            return jsonify({"error": error}), 500
        
        # Get date range (last 24 hours)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=1)
        from_date = start_date.strftime("%Y-%m-%d")
        to_date = end_date.strftime("%Y-%m-%d")
        
        results = {}
        
        for symbol in symbols:
            try:
                # FYERS historical data request
                hist_data = {
                    "symbol": symbol,
                    "resolution": "5",  # 5-minute intervals
                    "date_format": "1",
                    "range_from": from_date,
                    "range_to": to_date,
                    "cont_flag": "1"
                }
                
                response = fyers.history(data=hist_data)
                
                if response.get('s') == 'ok':
                    candles = response.get('candles', [])
                    prices = [float(candle[4]) for candle in candles if len(candle) >= 5]
                    timestamps = [int(candle[0]) for candle in candles if len(candle) >= 5]
                    
                    results[symbol] = {
                        "prices": prices,
                        "timestamps": timestamps,
                        "count": len(prices)
                    }
                else:
                    results[symbol] = {
                        "prices": [],
                        "timestamps": [],
                        "count": 0,
                        "error": response.get('message', 'No data')
                    }
                    
            except Exception as e:
                results[symbol] = {
                    "prices": [],
                    "timestamps": [],
                    "count": 0,
                    "error": str(e)
                }
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500