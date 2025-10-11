# FYERS API - Complete Python Guide for Stocks & Options Trading

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [Authentication](#authentication)
3. [User Data APIs](#user-data-apis)
4. [Order Placement](#order-placement)
5. [Transaction Management](#transaction-management)
6. [GTT Orders](#gtt-orders)
7. [Market Data APIs](#market-data-apis)
8. [WebSocket APIs](#websocket-apis)
9. [Error Codes & Rate Limits](#error-codes--rate-limits)

---

## Installation & Setup

### Python Library Installation
```bash
pip install fyers-apiv3
```

**Supported Python Versions**: 3.8 to 3.12

### Latest Version
- Python SDK: v3.1.7

---

## Authentication

### Step 1: Generate Auth Code

```python
from fyers_apiv3 import fyersModel

# API Credentials
client_id = "SPXXXXE7-100"
secret_key = "N********B"
redirect_uri = "https://trade.fyers.in/api-login/redirect-uri/index.html"
response_type = "code"  
state = "sample_state"

# Create session model
session = fyersModel.SessionModel(
    client_id=client_id,
    secret_key=secret_key,
    redirect_uri=redirect_uri,
    response_type=response_type
)

# Generate auth code
response = session.generate_authcode()
print(response)
```

### Step 2: Generate Access Token

```python
from fyers_apiv3 import fyersModel

client_id = "SPXXXXE7-100"
secret_key = "N********B"
redirect_uri = "https://trade.fyers.in/api-login/redirect-uri/index.html"
response_type = "code" 
grant_type = "authorization_code"

# Auth code from Step 1
auth_code = "eyJ0eXAi*******.eyJpc3MiOiJhcGkubG9********.r_65Awa1kGdsNTAgD******"

# Create session
session = fyersModel.SessionModel(
    client_id=client_id,
    secret_key=secret_key, 
    redirect_uri=redirect_uri, 
    response_type=response_type, 
    grant_type=grant_type
)

# Set auth code and generate token
session.set_token(auth_code)
response = session.generate_token()
print(response)
```

**Success Response:**
```json
{
  "s": "ok",
  "code": 200,
  "message": "",
  "access_token": "eyJ0eXAiOi***.eyJpc3MiOiJh***.HrSubihiFKXOpUOj_7***",
  "refresh_token": "eyJ0eXAiO***.eyJpc3MiOiJh***.67mXADDLrrleuEH_EE***"
}
```

### Initialize FyersModel

```python
from fyers_apiv3 import fyersModel

client_id = "XC4XXXXM-100"
access_token = "eyJ0eXXXXXXXX2c5-Y3RgS8wR14g"

# Synchronous mode
fyers = fyersModel.FyersModel(
    client_id=client_id, 
    token=access_token,
    is_async=False, 
    log_path=""
)

# Asynchronous mode
fyers = fyersModel.FyersModel(
    client_id=client_id, 
    token=access_token,
    is_async=True, 
    log_path=""
)
```

---

## User Data APIs

### Get Profile

```python
from fyers_apiv3 import fyersModel

client_id = "XC4XXXXM-100"
access_token = "eyJ0eXXXXXXXX2c5-Y3RgS8wR14g"

fyers = fyersModel.FyersModel(
    client_id=client_id, 
    token=access_token,
    is_async=False, 
    log_path=""
)

response = fyers.get_profile()
print(response)
```

### Get Funds

```python
response = fyers.funds()
print(response)
```

### Holdings

```python
response = fyers.holdings()
print(response)
```

---

## Order Placement

### Order Types Guide

#### 1. Limit Order (type=1)
```python
data = {
    "symbol": "NSE:SBIN-EQ",
    "qty": 100,
    "type": 1,  # Limit Order
    "side": 1,  # 1=Buy, -1=Sell
    "productType": "INTRADAY",
    "limitPrice": 100,
    "stopPrice": 0,
    "validity": "DAY",
    "stopLoss": 0,
    "takeProfit": 0,
    "offlineOrder": False,
    "disclosedQty": 0
}
```

#### 2. Market Order (type=2)
```python
data = {
    "symbol": "NSE:SBIN-EQ",
    "qty": 100,
    "type": 2,  # Market Order
    "side": 1,
    "productType": "INTRADAY",
    "limitPrice": 0,
    "stopPrice": 0,
    "validity": "DAY",
    "stopLoss": 0,
    "takeProfit": 0,
    "offlineOrder": False,
    "disclosedQty": 0
}
```

#### 3. Stop Order / SL-M (type=3)
```python
data = {
    "symbol": "NSE:SBIN-EQ",
    "qty": 100,
    "type": 3,  # Stop Order (SL-M)
    "side": 1,
    "productType": "INTRADAY",
    "limitPrice": 0,
    "stopPrice": 100,  # Trigger price
    "validity": "DAY",
    "stopLoss": 0,
    "takeProfit": 0,
    "offlineOrder": False,
    "disclosedQty": 0
}
```

#### 4. Stop Limit Order / SL-L (type=4)
```python
data = {
    "symbol": "NSE:SBIN-EQ",
    "qty": 100,
    "type": 4,  # Stop Limit Order (SL-L)
    "side": 1,
    "productType": "INTRADAY",
    "limitPrice": 100,
    "stopPrice": 95,  # Trigger price
    "validity": "DAY",
    "stopLoss": 0,
    "takeProfit": 0,
    "offlineOrder": False,
    "disclosedQty": 0
}
```

### Product Types
- **INTRADAY**: Same day buy/sell
- **CNC**: Delivery (equity only)
- **MARGIN**: Derivatives carry forward
- **CO**: Cover Order (requires stopLoss)
- **BO**: Bracket Order (requires stopLoss & takeProfit)
- **MTF**: Margin Trading Facility

### Single Order Placement

```python
from fyers_apiv3 import fyersModel

client_id = "XC4XXXXM-100"
access_token = "eyJ0eXXXXXXXX2c5-Y3RgS8wR14g"

fyers = fyersModel.FyersModel(
    client_id=client_id, 
    token=access_token,
    is_async=False, 
    log_path=""
)

# Place order
data = {
    "symbol": "NSE:IDEA-EQ",
    "qty": 100,
    "type": 2,  # Market order
    "side": 1,  # Buy
    "productType": "INTRADAY",
    "limitPrice": 0,
    "stopPrice": 0,
    "validity": "DAY",
    "disclosedQty": 0,
    "offlineOrder": False,
    "stopLoss": 0,
    "takeProfit": 0
}

response = fyers.place_order(data=data)
print(response)
```

### Multi Order Placement (up to 10 orders)

```python
data = [
    {
        "symbol": "NSE:SBIN-EQ",
        "qty": 10,
        "type": 2,
        "side": 1,
        "productType": "INTRADAY",
        "limitPrice": 0,
        "stopPrice": 0,
        "validity": "DAY",
        "disclosedQty": 0,
        "offlineOrder": False
    },
    {
        "symbol": "NSE:IDEA-EQ",
        "qty": 5,
        "type": 2,
        "side": 1,
        "productType": "INTRADAY",
        "limitPrice": 0,
        "stopPrice": 0,
        "validity": "DAY",
        "disclosedQty": 0,
        "offlineOrder": False
    }
]

response = fyers.place_basket_orders(data=data)
print(response)
```

### Options Order Example

```python
# Call Option
data = {
    "symbol": "NSE:NIFTY25JAN24000CE",  # Format: Exchange:Symbol
    "qty": 50,  # Lot size multiples
    "type": 2,  # Market order
    "side": 1,  # Buy
    "productType": "MARGIN",
    "limitPrice": 0,
    "stopPrice": 0,
    "validity": "DAY",
    "disclosedQty": 0,
    "offlineOrder": False
}

response = fyers.place_order(data=data)
print(response)

# Put Option
data = {
    "symbol": "NSE:NIFTY25JAN24000PE",
    "qty": 50,
    "type": 2,
    "side": 1,
    "productType": "MARGIN",
    "limitPrice": 0,
    "stopPrice": 0,
    "validity": "DAY",
    "disclosedQty": 0,
    "offlineOrder": False
}

response = fyers.place_order(data=data)
print(response)
```

---

## Transaction Management

### Get Orders

```python
response = fyers.orderbook()
print(response)
```

### Get Positions

```python
response = fyers.positions()
print(response)
```

### Get Trades

```python
response = fyers.tradebook()
print(response)
```

### Get Trades by Order Tag

```python
# Filter by order tag
# Use curl or requests for GET parameter
import requests

headers = {
    "Authorization": f"{client_id}:{access_token}"
}

url = "https://api-t1.fyers.in/api/v3/tradebook?order_tag=1:MyTag"
response = requests.get(url, headers=headers)
print(response.json())
```

### Modify Order

```python
orderId = "8102710298291"

data = {
    "id": orderId, 
    "type": 1,  # New order type
    "limitPrice": 61049, 
    "qty": 1
}

response = fyers.modify_order(data=data)
print(response)
```

### Modify Multiple Orders

```python
data = [
    {
        "id": "8102710298291",
        "type": 1,
        "limitPrice": 61049,
        "qty": 1
    },
    {
        "id": "8102710298292",
        "type": 1,
        "limitPrice": 61049,
        "qty": 1
    }
]

response = fyers.modify_basket_orders(data=data)
print(response)
```

### Cancel Order

```python
# Using SDK (note: use curl for DELETE in production)
import requests

headers = {
    "Authorization": f"{client_id}:{access_token}",
    "Content-Type": "application/json"
}

data = {"id": "52009227353"}

response = requests.delete(
    "https://api-t1.fyers.in/api/v3/orders/sync",
    headers=headers,
    json=data
)
print(response.json())
```

### Cancel Multiple Orders

```python
from fyers_apiv3 import fyersModel

data = [
    {"id": "808058117761"},
    {"id": "808058117762"}
]

response = fyers.cancel_basket_orders(data=data)
print(response)
```

### Exit Positions

#### Exit All Positions
```python
data = {}
response = fyers.exit_positions(data=data)
print(response)
```

#### Exit Specific Position
```python
data = {
    "id": "NSE:SBIN-EQ-BO"
}
response = fyers.exit_positions(data=data)
print(response)
```

#### Exit by Segment, Side & Product Type
```python
data = {
    "segment": [10],  # 10=CM, 11=FO, 12=CD, 20=COM
    "side": [1, -1],  # 1=Buy, -1=Sell
    "productType": ["INTRADAY", "CNC"]
}

response = fyers.exit_positions(data=data)
print(response)
```

### Convert Position

```python
data = {
    "symbol": "NSE:SBIN-EQ",
    "positionSide": 1,  # 1=Long, -1=Short
    "convertQty": 10,
    "convertFrom": "INTRADAY",
    "convertTo": "CNC"
}

response = fyers.convert_position(data=data)
print(response)
```

---

## GTT Orders

### Place GTT Order

```python
# Single trigger GTT
data = {
    "symbol": "NSE:SBIN-EQ",
    "qty": 5,
    "type": 1,  # Limit order
    "side": 1,  # Buy
    "productType": "CNC",
    "limitPrice": 1020,
    "stopPrice": 0,
    "validity": "DAY",
    "disclosedQty": 0,
    "offlineOrder": False,
    "stopLoss": 0,
    "takeProfit": 0,
    "trigger_prices": {
        "trigger_price_1": 1020
    },
    "order_tag": "GTT_Order"
}

response = fyers.place_gtt(data=data)
print(response)
```

### Place OCO (One-Cancels-Other) Order

```python
# OCO - Two trigger prices
data = {
    "symbol": "NSE:SBIN-EQ",
    "qty1": 5,
    "qty2": 5,
    "type1": 1,
    "type2": 1,
    "side1": 1,  # First leg buy
    "side2": -1,  # Second leg sell
    "productType": "CNC",
    "limitPrice1": 1020,
    "limitPrice2": 620,
    "stopPrice1": 0,
    "stopPrice2": 0,
    "trigger_prices": {
        "trigger_price_1": 1020,  # Target
        "trigger_price_2": 620    # Stop loss
    }
}

response = fyers.place_gtt(data=data)
print(response)
```

### Get GTT Orders

```python
response = fyers.gtt_orderbook()
print(response)
```

### Modify GTT Order

```python
data = {
    "gtt_id": "25012400002074",
    "qty": 10,
    "limitPrice": 1050,
    "trigger_prices": {
        "trigger_price_1": 1050
    }
}

response = fyers.modify_gtt(data=data)
print(response)
```

### Cancel GTT Order

```python
data = {
    "id": "25012400002074"
}

response = fyers.delete_gtt(data=data)
print(response)
```

---

## Market Data APIs

### Historical Data

```python
from fyers_apiv3 import fyersModel

client_id = "XC4XXXXM-100"
access_token = "eyJ0eXXXXXXXX2c5-Y3RgS8wR14g"

fyers = fyersModel.FyersModel(
    client_id=client_id, 
    is_async=False, 
    token=access_token, 
    log_path=""
)

data = {
    "symbol": "NSE:SBIN-EQ",
    "resolution": "D",  # D, 1, 5, 15, 60, etc.
    "date_format": "0",  # 0=epoch, 1=yyyy-mm-dd
    "range_from": "1690895316",
    "range_to": "1691068173",
    "cont_flag": "1"  # Continuous data
}

response = fyers.history(data=data)
print(response)
```

**Available Resolutions:**
- Seconds: `5S`, `10S`, `15S`, `30S`, `45S`
- Minutes: `1`, `2`, `3`, `5`, `10`, `15`, `20`, `30`, `60`, `120`, `240`
- Daily: `D` or `1D`

### Quotes (up to 50 symbols)

```python
data = {
    "symbols": "NSE:SBIN-EQ,NSE:IDEA-EQ,NSE:NIFTY50-INDEX"
}

response = fyers.quotes(data=data)
print(response)
```

### Market Depth

```python
data = {
    "symbol": "NSE:SBIN-EQ",
    "ohlcv_flag": "1"  # Include OHLCV data
}

response = fyers.depth(data=data)
print(response)
```

### Option Chain

```python
data = {
    "symbol": "NSE:TCS-EQ",
    "strikecount": 5,  # Number of strikes (max 50)
    "timestamp": ""  # Optional timestamp
}

response = fyers.optionchain(data=data)
print(response)
```

**Response includes:**
- ATM (At-The-Money) strike
- OTM (Out-of-The-Money) CE & PE
- ITM (In-The-Money) CE & PE
- Greeks, IV, OI data

---

## WebSocket APIs

### Order/Position Updates WebSocket

```python
from fyers_apiv3.FyersWebsocket import order_ws

def onOrder(message):
    print("Order Response:", message)

def onPosition(message):
    print("Position Response:", message)

def onTrade(message):
    print("Trade Response:", message)

def onGeneral(message):
    print("General Response:", message)

def onerror(message):
    print("Error:", message)

def onclose(message):
    print("Connection closed:", message)

def onopen():
    # Subscribe to updates
    data_type = "OnOrders,OnTrades,OnPositions,OnGeneral"
    fyers.subscribe(data_type=data_type)
    fyers.keep_running()

# Access token
access_token = "Xxxxx67IM-100:eyJxxxxxxIUzI1NiJ9..."

# Create WebSocket instance
fyers = order_ws.FyersOrderSocket(
    access_token=access_token,
    write_to_file=False,
    log_path="",
    on_connect=onopen,
    on_close=onclose,
    on_error=onerror,
    on_general=onGeneral,
    on_orders=onOrder,
    on_positions=onPosition,
    on_trades=onTrade
)

# Connect
fyers.connect()
```

### Market Data WebSocket

```python
from fyers_apiv3.FyersWebsocket import data_ws

def onmessage(message):
    print("Response:", message)

def onerror(message):
    print("Error:", message)

def onclose(message):
    print("Connection closed:", message)

def onopen():
    data_type = "SymbolUpdate"
    symbols = ['NSE:SBIN-EQ', 'NSE:NIFTY50-INDEX']
    fyers.subscribe(symbols=symbols, data_type=data_type)
    fyers.keep_running()

access_token = "XC4XXXXXXM-100:eXXXXXXXXXXXXfZNSBoLo"

fyers = data_ws.FyersDataSocket(
    access_token=access_token,
    log_path="",
    litemode=False,
    write_to_file=False,
    reconnect=True,
    on_connect=onopen,
    on_close=onclose,
    on_error=onerror,
    on_message=onmessage
)

fyers.connect()
```

### Tick-by-Tick (TBT) WebSocket - 50 Level Depth

```python
from fyers_apiv3.FyersWebsocket.tbt_ws import FyersTbtSocket, SubscriptionModes

def onopen():
    print("Connection opened")
    mode = SubscriptionModes.DEPTH
    Channel = '1'
    symbols = ['NSE:NIFTY25MARFUT', 'NSE:BANKNIFTY25MARFUT']
    
    fyers.subscribe(symbol_tickers=symbols, channelNo=Channel, mode=mode)
    fyers.switchChannel(resume_channels=[Channel], pause_channels=[])
    fyers.keep_running()

def on_depth_update(ticker, message):
    print(f"Ticker: {ticker}")
    print(f"Total Buy Qty: {message.tbq}")
    print(f"Total Sell Qty: {message.tsq}")
    print(f"Bids: {message.bidprice}")
    print(f"Asks: {message.askprice}")
    print(f"Bid Qty: {message.bidqty}")
    print(f"Ask Qty: {message.askqty}")

def onerror(message):
    print("Error:", message)

def onclose(message):
    print("Connection closed:", message)

access_token = "XCXXXXXXM-100:eyJ0tHfZNSBoLo"

fyers = FyersTbtSocket(
    access_token=access_token,
    write_to_file=False,
    log_path="",
    on_open=onopen,
    on_close=onclose,
    on_error=onerror,
    on_depth_update=on_depth_update
)

fyers.connect()
```

---

## Error Codes & Rate Limits

### Common Error Codes

| Code | Description |
|------|-------------|
| -8 | Token Expired |
| -15 | Invalid Token |
| -16 | Unable to authenticate token |
| -17 | Invalid or Expired Token |
| -50 | Invalid parameters |
| -51 | Invalid Order ID |
| -53 | Invalid Position ID |
| -99 | Order placement rejected |
| -300 | Invalid symbol |
| -352 | Invalid App ID / No position to exit |
| -429 | Rate limit exceeded |
| 400 | Invalid multi-leg order input |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request |
| 401 | Authorization error |
| 403 | Permission error |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Rate Limits

| Timeframe | Limit |
|-----------|-------|
| Per Second | 10 |
| Per Minute | 200 |
| Per Day | 100,000 |

**Note**: User blocked for rest of day if per-minute limit exceeded 3+ times.

---

## Appendix

### Symbol Format

**Equity**: `NSE:SBIN-EQ`, `BSE:RELIANCE-EQ`

**Index**: `NSE:NIFTY50-INDEX`, `NSE:NIFTYBANK-INDEX`

**Futures**: `NSE:NIFTY25MARFUT`, `NSE:BANKNIFTY25MARFUT`

**Options**: `NSE:NIFTY25MAR24000CE`, `NSE:BANKNIFTY25MAR50000PE`

### Exchange Codes

| Code | Exchange |
|------|----------|
| 10 | NSE |
| 11 | MCX |
| 12 | BSE |

### Segment Codes

| Code | Segment |
|------|---------|
| 10 | Capital Market (CM) |
| 11 | Equity Derivatives (FO) |
| 12 | Currency Derivatives (CD) |
| 20 | Commodity Derivatives (COM) |

### Instrument Types

| Code | Type |
|------|------|
| 0 | EQUITY |
| 10 | INDEX |
| 11 | FUTIDX |
| 12 | FUTIVX |
| 13 | FUTSTK |
| 14 | OPTIDX |
| 15 | OPTSTK |

---

## Best Practices

1. **Never share** `app_secret` or `access_token`
2. Use **proper error handling** for all API calls
3. **Validate tick size** before order placement
4. **Check lot size** for derivatives
5. Use **order tags** for tracking (max 30 chars, alphanumeric)
6. Enable **logging** for debugging (`log_path` parameter)
7. Use **webhooks** for real-time order updates
8. Maintain **snapshot + diff** for TBT WebSocket data
9. **Handle rate limits** gracefully with retry logic
10. Use **async mode** for high-frequency operations

---

## Quick Reference - Common Operations

### Place Stock Order
```python
# Market Buy
fyers.place_order(data={
    "symbol": "NSE:SBIN-EQ",
    "qty": 10,
    "type": 2,
    "side": 1,
    "productType": "CNC",
    "limitPrice": 0,
    "stopPrice": 0,
    "validity": "DAY",
    "disclosedQty": 0,
    "offlineOrder": False
})
```

### Place Option Order
```python
# Buy Call Option
fyers.place_order(data={
    "symbol": "NSE:NIFTY25JAN24000CE",
    "qty": 50,
    "type": 2,
    "side": 1,
    "productType": "MARGIN",
    "limitPrice": 0,
    "stopPrice": 0,
    "validity": "DAY",
    "disclosedQty": 0,
    "offlineOrder": False
})
```

### Get Real-time Option Chain
```python
# NIFTY Option Chain
fyers.optionchain(data={
    "symbol": "NSE:NIFTY50-INDEX",
    "strikecount": 10
})
```

### Exit All Positions
```python
fyers.exit_positions(data={})
```

---

**Documentation Version**: v3.1.7  
**Last Updated**: January 2025  
**Support**: api-support@fyers.in  
**Community**: FYERS API Community Forum
