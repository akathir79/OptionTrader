# symbol_selector.py

from flask import Blueprint, request, jsonify
import requests, csv, datetime
from io import StringIO
from models import BrokerSettings  # for retrieving tokens


symbol_selector_bp = Blueprint('symbol_selector', __name__)

# ---------------------------------------------------------
#  /get_expiry_dates  — INDEX symbols
# ---------------------------------------------------------
@symbol_selector_bp.route('/get_expiry_dates')
def get_expiry_dates():
    allowed = {"NIFTY", "NIFTY50", "BANKNIFTY", "NIFTYNXT50", "FINNIFTY",
               "MIDCPNIFTY", "SENSEX", "BANKEX"}
    sym = request.args.get('symbol', '').upper().strip()
    if not sym:
        return jsonify({"error": "No symbol provided"}), 400
    if sym not in allowed:
        return jsonify({"expiry_list": []})

    csv_url = ("https://public.fyers.in/sym_details/BSE_FO.csv"
               if sym in {"SENSEX", "BANKEX"}
               else "https://public.fyers.in/sym_details/NSE_FO.csv")

    resp = requests.get(csv_url)
    if resp.status_code != 200:
        return jsonify({"error": f"Could not fetch CSV from {csv_url}"}), 500

    unique = set()
    for row in csv.reader(StringIO(resp.text)):
        if len(row) < 2:
            continue
        desc = row[1].strip()
        if desc.startswith(sym + " "):
            parts = desc.split()
            if len(parts) >= 4:
                y, m, d = parts[1:4]
                try:
                    dt = datetime.date(2000+int(y),
                                       datetime.datetime.strptime(m, '%b').month,
                                       int(d))
                    unique.add(dt.strftime('%d-%b-%y').upper())
                except ValueError:
                    continue

    expiry_list = sorted(unique,
                         key=lambda s: datetime.datetime.strptime(s, "%d-%b-%y"))
    return jsonify({"expiry_list": expiry_list})

# ---------------------------------------------------------
#  /othersymbolexpiry  — NON-index symbols
# ---------------------------------------------------------
@symbol_selector_bp.route('/othersymbolexpiry')
def othersymbolexpiry():
    exchange = request.args.get('exchange', '').strip()
    sym = request.args.get('symbol', '').upper().strip()
    if not exchange or not sym:
        return jsonify({"error": "Missing exchange and/or symbol parameter"}), 400

    url_map = {
        "NSE":  "https://public.fyers.in/sym_details/NSE_FO.csv",
        "BSE":  "https://public.fyers.in/sym_details/BSE_FO.csv",
        "MCX":  "https://public.fyers.in/sym_details/MCX_COM.csv",
        "Crypto": "https://public.fyers.in/sym_details/NSE_CD.csv",
        "NSE–Commodity": "https://public.fyers.in/sym_details/NSE_COM.csv"
    }
    csv_url = url_map.get(exchange)
    if not csv_url:
        return jsonify({"error": "Invalid exchange provided"}), 400

    resp = requests.get(csv_url)
    if resp.status_code != 200:
        return jsonify({"error": f"Could not fetch CSV from {csv_url}"}), 500

    unique = set()
    for row in csv.reader(StringIO(resp.text)):
        if len(row) < 2:  # need description column
            continue
        desc = row[1].strip()
        if desc.startswith(sym + " "):
            parts = desc.split()
            if len(parts) >= 4:
                y, m, d = parts[1:4]
                try:
                    dt = datetime.date(2000+int(y),
                                       datetime.datetime.strptime(m, '%b').month,
                                       int(d))
                    unique.add(dt.strftime('%d-%b-%y').upper())
                except ValueError:
                    continue

    expiry_list = sorted(unique,
                         key=lambda s: datetime.datetime.strptime(s, "%d-%b-%y"))
    return jsonify({"expiry_list": expiry_list})

# ---------------------------------------------------------
#  Symbol-loader endpoints used by JS
# ---------------------------------------------------------
@symbol_selector_bp.route('/get_nse_symbols')
def get_nse_symbols():
    return _symbol_list('https://public.fyers.in/sym_details/NSE_FO.csv',
                        exclude={"NIFFTY", "NIFTYNXT50", "BANKNIFTY",
                                 "MIDCPNIFTY", "FINNIFTY"})

@symbol_selector_bp.route('/get_bse_symbols')
def get_bse_symbols():
    return _symbol_list('https://public.fyers.in/sym_details/BSE_FO.csv',
                        exclude={"SENSEX", "BANKEX"})

@symbol_selector_bp.route('/get_mcx_symbols')
def get_mcx_symbols():
    return _symbol_list('https://public.fyers.in/sym_details/MCX_COM.csv')

@symbol_selector_bp.route('/get_crypto_symbols')
def get_crypto_symbols():
    return _symbol_list('https://public.fyers.in/sym_details/NSE_CD.csv')

@symbol_selector_bp.route('/get_NSE_Commodity_symbols')
def get_NSE_Commodity_symbols():
    return _symbol_list('https://public.fyers.in/sym_details/NSE_COM.csv')

# ---------------------------------------------------------
#  Helper
# ---------------------------------------------------------
def _symbol_list(url, exclude=None):
    exclude = exclude or set()
    try:
        resp = requests.get(url); resp.raise_for_status()
        symbols = sorted({row[13].strip() for row in
                          csv.reader(StringIO(resp.text))
                          if len(row) > 13 and row[13].strip()
                          and row[13].strip() not in exclude})
        return jsonify({"symbols": symbols})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@symbol_selector_bp.route('/get_option_chain')
def get_option_chain():
    symbol = request.args.get('symbol', '').upper().strip()
    expiry = request.args.get('expiry', '').strip()
    if not symbol or not expiry:
        return jsonify({"error": "Missing symbol and/or expiry"}), 400

    # retrieve access_token for FYERS (user_id=0)
    row = BrokerSettings.query.filter_by(user_id=0, brokername='fyers').first()
    if not row or not row.access_token:
        return jsonify({"error": "No FYERS token stored"}), 403

    url = "https://api.fyers.in/api/v3/options-chain"
    headers = {
        "Authorization": f"Bearer {row.access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "symbol": symbol,
        "expiry": expiry,
        "strikeWidth": 100,      # adjust as needed
        "range": 10              # number of strikes above/below ATM
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=10)
    if resp.status_code != 200:
        return jsonify({"error": "FYERS API error", "details": resp.text}), 502

    return jsonify(resp.json())

# ---------------------------------------------------------
#  Symbol Lookup with Lot Size
# ---------------------------------------------------------
@symbol_selector_bp.route('/lookup_symbol_and_lot_size')
def lookup_symbol_and_lot_size():
    """Find symbol and lot size based on selection type"""
    selection_type = request.args.get('type', '').strip()  # 'index' or 'exchange'
    symbol = request.args.get('symbol', '').upper().strip()
    exchange = request.args.get('exchange', '').strip()
    
    if not selection_type or not symbol:
        return jsonify({"error": "Missing type and/or symbol parameter"}), 400
    
    if selection_type == 'index':
        return _lookup_index_symbol(symbol)
    elif selection_type == 'exchange':
        if not exchange:
            return jsonify({"error": "Missing exchange parameter for exchange type"}), 400
        return _lookup_exchange_symbol(exchange, symbol)
    else:
        return jsonify({"error": "Invalid type. Use 'index' or 'exchange'"}), 400

def _lookup_index_symbol(symbol):
    """Lookup index symbols like NIFTY 50, BANK NIFTY, etc."""
    # Index symbol mapping - normalize input for matching
    symbol_normalized = symbol.upper().replace(" ", "").replace("NIFTY", "NIFTY")
    
    index_symbols = {
        "NIFTY": "NSE:NIFTY50-INDEX",  # Handle "NIFTY" from frontend
        "NIFTY50": "NSE:NIFTY50-INDEX",
        "NIFTYNEXT50": "NSE:NIFTYNXT50-INDEX",
        "BANKNIFTY": "NSE:NIFTYBANK-INDEX", 
        "FINNIFTY": "NSE:FINNIFTY-INDEX",
        "MIDCPNIFTY": "NSE:NIFTYMIDCAP-INDEX",
        "SENSEX": "BSE:SENSEX-INDEX",
        "BANKEX": "BSE:BANKEX-INDEX"
    }
    
    # First check direct mapping
    if symbol_normalized in index_symbols:
        symbol_code = index_symbols[symbol_normalized]
        exchange_code = "BSE" if symbol_normalized in {"SENSEX", "BANKEX"} else "NSE"
        csv_url = f"https://public.fyers.in/sym_details/{exchange_code}_FO.csv" if exchange_code == "NSE" else "https://public.fyers.in/sym_details/BSE_FO.csv"
        
        # Get lot size from derivatives CSV
        try:
            resp = requests.get(csv_url)
            resp.raise_for_status()
            
            # Look for the index symbol in derivatives to get lot size
            symbol_lookup = symbol_normalized.replace("NIFTY", "NIFTY").replace("50", "")
            if symbol_lookup == "NIFTY":
                symbol_lookup = "NIFTY"
            elif symbol_lookup == "BANKNIFTY":
                symbol_lookup = "BANKNIFTY"
            
            for row in csv.reader(StringIO(resp.text)):
                if len(row) >= 14 and symbol_lookup in row[13].strip().upper():
                    lot_size = row[3] if len(row) > 3 else "1"  # Column 3 has lot size
                    return jsonify({
                        "symbol_code": symbol_code,
                        "lot_size": lot_size,
                        "found": True
                    })
                    
            # Default lot size for indices
            default_lots = {"NIFTY": "75", "NIFTY50": "75", "BANKNIFTY": "15", "FINNIFTY": "25", 
                          "MIDCPNIFTY": "50", "SENSEX": "20", "BANKEX": "15"}
            
            return jsonify({
                "symbol_code": symbol_code,
                "lot_size": default_lots.get(symbol_normalized, "1"),
                "found": True
            })
            
        except Exception as e:
            return jsonify({"error": f"Failed to fetch lot size: {str(e)}"}), 500
    
    return jsonify({"found": False, "error": "Index symbol not found"})

def _lookup_exchange_symbol(exchange, symbol):
    """Lookup exchange symbols and get lot size"""
    url_map = {
        "NSE": "https://public.fyers.in/sym_details/NSE_CM.csv",
        "BSE": "https://public.fyers.in/sym_details/BSE_CM.csv", 
        "MCX": "https://public.fyers.in/sym_details/MCX_COM.csv",
        "Crypto": "https://public.fyers.in/sym_details/NSE_CD.csv",
        "NSE Commodity": "https://public.fyers.in/sym_details/NSE_COM.csv"
    }
    
    csv_url = url_map.get(exchange)
    if not csv_url:
        return jsonify({"error": "Invalid exchange provided"}), 400
    
    try:
        resp = requests.get(csv_url)
        resp.raise_for_status()
        
        # Generate symbol codes based on exchange
        symbol_code = ""
        if exchange == "NSE":
            symbol_code = f"NSE:{symbol}-EQ"
        elif exchange == "BSE":
            symbol_code = f"BSE:{symbol}-A"
        elif exchange == "MCX":
            # For MCX, find current month expiry
            now = datetime.datetime.now()
            month = now.strftime("%b").upper()
            year = str(now.year)[-2:]
            symbol_code = f"MCX:{symbol}{year}{month}FUT"
        elif exchange == "Crypto":
            # For NSE Currency derivatives, find current month expiry
            now = datetime.datetime.now()
            month = now.strftime("%b").upper()
            year = str(now.year)[-2:]
            symbol_code = f"NSE:{symbol}{year}{month}FUT"
        elif exchange == "NSE Commodity":
            # For NSE Commodity, find current month expiry
            now = datetime.datetime.now()
            month = now.strftime("%b").upper()
            year = str(now.year)[-2:]
            symbol_code = f"NSE:{symbol}{year}{month}FUT"
        else:
            symbol_code = f"{exchange}:{symbol}"
        
        # For NSE and BSE equity derivatives, we need to look in their respective FO.csv files for lot size
        if exchange == "NSE":
            # Use NSE_FO.csv for NSE equity derivatives lot size
            deriv_resp = requests.get("https://public.fyers.in/sym_details/NSE_FO.csv")
            deriv_resp.raise_for_status()
            
            # Extract base symbol from the symbol (e.g., SBIN from SBIN-EQ)
            base_symbol = symbol.split('-')[0] if '-' in symbol else symbol
            
            for row in csv.reader(StringIO(deriv_resp.text)):
                if len(row) >= 14 and row[13].strip().upper() == base_symbol:
                    # Column 3 (index 3) has lot size according to your example
                    lot_size = row[3] if len(row) > 3 and row[3].strip() else "1"
                    return jsonify({
                        "symbol_code": symbol_code,
                        "lot_size": lot_size,
                        "found": True
                    })
        elif exchange == "BSE":
            # Use BSE_FO.csv for BSE equity derivatives lot size
            deriv_resp = requests.get("https://public.fyers.in/sym_details/BSE_FO.csv")
            deriv_resp.raise_for_status()
            
            # Extract base symbol from the symbol (e.g., HDFCBANK from HDFCBANK-A)
            base_symbol = symbol.split('-')[0] if '-' in symbol else symbol
            
            for row in csv.reader(StringIO(deriv_resp.text)):
                if len(row) >= 14 and row[13].strip().upper() == base_symbol:
                    # Column 3 (index 3) has lot size
                    lot_size = row[3] if len(row) > 3 and row[3].strip() else "1"
                    return jsonify({
                        "symbol_code": symbol_code,
                        "lot_size": lot_size,
                        "found": True
                    })
        
        # For other exchanges (MCX, Crypto, NSE Commodity), find lot size from their respective CSV files
        for row in csv.reader(StringIO(resp.text)):
            if len(row) >= 14 and row[13].strip().upper() == symbol:
                lot_size = row[3] if len(row) > 3 and row[3].strip() else "1"  # Column 3 has lot size
                return jsonify({
                    "symbol_code": symbol_code,
                    "lot_size": lot_size,
                    "found": True
                })
        
        # Default lot size if not found
        return jsonify({
            "symbol_code": symbol_code,
            "lot_size": "1",
            "found": True
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to lookup symbol: {str(e)}"}), 500
