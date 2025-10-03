# Trading Platform

## Overview

This Flask-based trading platform provides live trading functionality with support for multiple brokers, comprehensive options chain analysis, and market data visualization. Its purpose is to offer a robust, modular, and user-friendly environment for real-time trading operations, focusing on options trading strategies and market insights. The platform aims to be a versatile tool for traders, integrating various data sources and broker services to provide a unified trading experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend
- **Framework**: Flask web application with SQLAlchemy ORM.
- **Database**: PostgreSQL (configurable via `DATABASE_URL`).
- **Modularity**: Blueprint-based routing for organized code.
- **API**: REST endpoints for broker authentication and market data.

### Frontend
- **Templating**: Jinja2 with base template inheritance.
- **Styling**: Bootstrap 5 for responsive design.
- **Interactivity**: Vanilla JS with modular components.
- **UI Components**: Resizable panels, carousels, and modal dialogs.
- **UI/UX Decisions**:
    - Professional styling for option chain tables.
    - Dynamic yellow highlighting for In-The-Money (ITM) calls and puts.
    - Real-time payoff chart with dynamic spot price, breakeven lines, zoom/pan, crosshairs, and simplified tooltips.
    - Microcharts in option chain table for historical data visualization.
    - World Market Clock with real-time status, notifications, sound controls, and persistent user preferences.

### Technical Implementations & Feature Specifications
- **Broker Management**: Handles authentication, token management, and CRUD operations for broker settings, supporting multiple integrations (e.g., Fyers).
- **Symbol Selection**: Fetches expiry dates for index symbols (NIFTY, BANKNIFTY) and provides lookup/filtering, integrating with external CSV data.
- **Live Trading Interface**: Displays real-time options chain with ATM (At-the-Money) strike highlighting and ITM/OTM color coding.
- **Position Tracking Synchronization**: Critical logic ensures three primary arrays are always in sync: `window.activeLots` (individual lots), `window.globalPositions` (aggregated positions), and `window.closedTrades` (closed trade records). All position modifications must update these three arrays and trigger UI updates for tables and payoff charts. Netting logic for positions is precisely managed across these arrays.
- **Real-Time Order Execution** (October 2025):
  - **Position Table**: Enhanced with Order Type dropdown, Stop Loss input, Trailing SL checkbox, and Execute button (▶️) for each position
  - **Order Confirmation Modal**: Interactive modal allows editing all order parameters before execution (symbol, quantity, order type, limit/stop prices, stop loss %, product type, validity)
  - **Backend API**: `/api/place_real_order` endpoint with comprehensive validation:
    - Input validation: Symbol (non-empty string), quantity (positive integer), order type (1-4), action (1/-1), product type (INTRADAY/MARGIN/CNC/CO/BO/MTF)
    - Enum conversion: Converts string values ("BUY" → 1, "MARKET" → 2) to numeric codes expected by Fyers API
    - Stop loss calculation: Automatically calculates stop loss price from percentage and entry price (BUY: SL = entry × (1 - SL%/100), SELL: SL = entry × (1 + SL%/100))
    - Broker credential management: Retrieves stored access token and client ID from database
    - Error handling: Clear error messages for validation failures and broker-side rejections
  - **Data Flow**: Play button → Modal (editable) → Backend validation → Fyers API → Order confirmation/rejection
  - **Security**: Broker credentials retrieved from database, no exposure in frontend code
  - **Limitations**: Trailing stop loss requires separate monitoring system (not directly supported by Fyers place_order API)
- **Payoff Chart**: Dynamic strike range adaptation - automatically extracts min/max strikes from loaded option chain table with buffer, works with any symbol/expiry combination
- **Data Flow**: User authentication, symbol selection triggering API calls, real-time market data fetching via broker APIs, live options data display, and payoff chart visualization.
- **Deployment**: Uses environment variables for configuration (`DATABASE_URL`, `DEBUG`), modular file structure (blueprints, static, templates), and SQLAlchemy for database management.

## External Dependencies

### Python Packages
- `Flask`: Web framework.
- `Flask-SQLAlchemy`: ORM for database interaction.
- `requests`: HTTP requests.
- `pytz`: Timezone handling.
- `fyers_apiv3`: (Optional) Fyers broker integration.

### Frontend Libraries
- `Bootstrap 5`: CSS framework.
- `Font Awesome`: Icons.
- Public Fyers CSV data (e.g., `public.fyers.in/sym_details/NSE_FO.csv`) for symbol information.

### Data Sources
- NSE/BSE CSV files: Options symbols and expiry dates.
- Broker APIs: Real-time market data, order execution, historical data (e.g., Fyers API v3 for market data, order management, and WebSocket streams).

## FYERS API v3 Integration Guide

### Overview
The trading platform integrates with Fyers API v3 for broker connectivity, live market data, and order management. This section documents the complete API structure for development reference.

### Authentication Flow (3-Step Process)

#### Step 1: Generate Auth Code
- **Endpoint**: `https://api-t1.fyers.in/api/v3/generate-authcode`
- **Parameters**:
  - `client_id`: App ID (e.g., "SPXXXXE7-100")
  - `redirect_uri`: Redirect URL after login
  - `response_type`: Always "code"
  - `state`: Random value for security
- **Response**: Auth code for Step 2

#### Step 2: Validate Auth Code
- **Endpoint**: `https://api-t1.fyers.in/api/v3/validate-authcode`
- **Parameters**:
  - `grant_type`: Always "authorization_code"
  - `appIdHash`: SHA-256 of (api_id + ":" + app_secret)
  - `code`: Auth code from Step 1
- **Response**: Access token and refresh token

#### Step 3: Use Access Token
- **Authorization Header**: `{api_id}:{access_token}`
- **Token Validity**: Access token expires daily, refresh token valid for 15 days

### Python SDK Integration

#### Installation
```bash
pip install fyers_apiv3
```

#### Basic Usage
```python
from fyers_apiv3 import fyersModel
from fyers_apiv3.FyersWebsocket import data_ws

# Initialize Fyers client
client_id = "XC4XXXXM-100"
access_token = "eyJ0eXXXXXXXX2c5-Y3RgS8wR14g"
fyers = fyersModel.FyersModel(client_id=client_id, token=access_token)
```

### WebSocket Implementations

#### 1. Market Data WebSocket (Real-time Quotes)
- **Purpose**: Live price data, LTP, volume, OI updates
- **SDK Class**: `FyersDataSocket`
- **Data Types**: SymbolUpdate, MarketDepth, Full
- **Connection**: Automatic reconnection supported
- **Usage**:
```python
def on_message(message):
    print("Response:", message)

fyers_ws = data_ws.FyersDataSocket(
    access_token=f"{client_id}:{access_token}",
    on_message=on_message,
    on_error=on_error,
    on_close=on_close,
    on_connect=on_open
)
fyers_ws.connect()
fyers_ws.subscribe(symbols=['NSE:SBIN-EQ'], data_type="SymbolUpdate")
```

#### 2. Order WebSocket (Order/Trade Updates)
- **Endpoint**: `wss://socket.fyers.in/trade/v3`
- **Purpose**: Real-time order status, trade confirmations, position updates
- **Subscription Types**: orders, trades, positions, edis, pricealerts
- **Message Format**: JSON with action-based updates
- **Subscribe Message**:
```json
{"T": "SUB_ORD", "SLIST": ["orders", "trades", "positions"], "SUB_T": 1}
```

#### 3. Tick-by-Tick (TBT) WebSocket [Advanced]
- **Endpoint**: `wss://rtsocket-api.fyers.in/versova`
- **Purpose**: 50-level market depth, granular trade data
- **Format**: Protobuf responses for efficiency
- **Availability**: NFO instruments only (NSE F&O)
- **Data Mode**: Incremental updates with initial snapshots

### API Rate Limits
- **Per Second**: 10 requests
- **Per Minute**: 200 requests  
- **Per Day**: 100,000 requests
- **User Blocking**: Blocked for remainder of day if per-minute limit exceeded 3+ times

### Common Error Codes
- `-8`: Token expired
- `-15`: Invalid token provided
- `-16`: Server unable to authenticate token
- `-17`: Token invalid or expired
- `-50`: Invalid parameters passed
- `-99`: Order placement rejected
- `-300`: Invalid symbol provided
- `-352`: Invalid App ID provided
- `-429`: API rate limit exceeded
- `400`: Bad request/invalid input
- `401`: Authorization error
- `403`: Permission denied
- `500`: Internal server error

### Symbol Master Files (CSV Format)
- **NSE Equity Derivatives**: https://public.fyers.in/sym_details/NSE_FO.csv
- **NSE Capital Market**: https://public.fyers.in/sym_details/NSE_CM.csv
- **NSE Currency Derivatives**: https://public.fyers.in/sym_details/NSE_CD.csv
- **BSE Capital Market**: https://public.fyers.in/sym_details/BSE_CM.csv
- **BSE Equity Derivatives**: https://public.fyers.in/sym_details/BSE_FO.csv
- **MCX Commodity**: https://public.fyers.in/sym_details/MCX_COM.csv

#### Symbol Format
- **Structure**: `EXCHANGE:SYMBOL-SEGMENT`
- **Examples**: 
  - `NSE:NIFTY50-INDEX`
  - `NSE:BANKNIFTY25JAN51000CE`
  - `NSE:SBIN-EQ`

### Key API Endpoints

#### Market Data
- **Quotes**: `/api/v3/quotes` - Get current quotes for symbols
- **Market Depth**: `/api/v3/depth` - Get market depth data
- **Historical Data**: `/api/v3/history` - Historical price data
- **Market Status**: `/api/v3/market-status` - Exchange status

#### Order Management  
- **Place Order**: `/api/v3/orders` (POST)
- **Modify Order**: `/api/v3/orders` (PUT)
- **Cancel Order**: `/api/v3/orders/{order_id}` (DELETE)
- **Order Book**: `/api/v3/orders` (GET)

#### Place Order Parameters (2025 Update)
Single order placement via `fyers.place_order(data)`:

| Parameter | Type | Required | Values | Description |
|-----------|------|----------|--------|-------------|
| `symbol` | string | ✅ Yes | e.g., `NSE:NIFTY25O0724950CE` | Exchange:Symbol format |
| `qty` | integer | ✅ Yes | > 0 | Order quantity (must be multiple of lot size) |
| `type` | integer | ✅ Yes | `1`, `2`, `3`, `4` | 1=Limit, 2=Market, 3=Stop, 4=StopLimit |
| `side` | integer | ✅ Yes | `1`, `-1` | 1=Buy, -1=Sell |
| `productType` | string | ✅ Yes | `CNC`, `INTRADAY`, `MARGIN`, `CO`, `BO`, `MTF` | Product type |
| `limitPrice` | float | Conditional | > 0 | Required for type 1 (Limit) or 4 (StopLimit) |
| `stopPrice` | float | Conditional | > 0 | Required for type 3 (Stop) or 4 (StopLimit) |
| `validity` | string | ✅ Yes | `DAY`, `IOC` | Order validity (GTT not supported via API) |
| `disclosedQty` | integer | No | ≥ 0 | Disclosed qty for iceberg orders (default: 0) |
| `offlineOrder` | boolean | ✅ Yes | `true`, `false` | AMO (After Market Order) flag |
| `stopLoss` | float | Conditional | > 0 | Stop-loss price for CO/BO orders |
| `takeProfit` | float | Conditional | > 0 | Take-profit/target price for BO orders |
| `orderTag` | string | No | Custom string | Tag for order identification (optional) |

**Example Request:**
```python
data = {
    "symbol": "NSE:NIFTY25O0724950CE",
    "qty": 75,
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
response = fyers.place_order(data)
```

**Important Notes:**
- Boolean values must be Python `True`/`False` (not strings)
- For market orders (type=2), set `limitPrice` and `stopPrice` to 0
- For limit orders (type=1), `limitPrice` is required
- Stop-loss and trailing stop-loss require separate monitoring system (not directly in place_order)
- API endpoint: `https://api-t1.fyers.in/api/v3/orders` (paper) or `https://api.fyers.in/api/v3/orders` (live)

#### Portfolio & Positions
- **Positions**: `/api/v3/positions` - Current positions
- **Holdings**: `/api/v3/holdings` - Long-term holdings
- **Funds**: `/api/v3/funds` - Account balance and margins
- **Tradebook**: `/api/v3/tradebook` - Trade history

### Security Best Practices
1. Never share `app_secret` - store securely in environment variables
2. Never expose `access_token` in frontend code
3. Use controlled redirect URIs (not public endpoints)
4. Implement proper token refresh mechanisms
5. Validate `state` parameter for security
6. Use HTTPS for all API communications

### Integration with Current Platform
The existing BrokerSettings model in the platform already supports Fyers:
- Stores `client_id`, `app_secret`, `access_token`, `refresh_token`
- Handles token refresh automatically
- Provides API endpoints for broker management
- Integrates with symbol selector for Fyers data

### WebSocket Handler Integration
The platform's existing WebSocket handler (`static/js/websocket_handler.js`) should be extended to:
- Connect to Fyers market data WebSocket
- Subscribe to relevant symbols based on user selection
- Update option chain table with live prices
- Handle connection errors and reconnection
- Manage subscription state for performance

### Performance Considerations
- **Connection Management**: Reuse WebSocket connections, implement proper cleanup
- **Subscription Optimization**: Only subscribe to required symbols
- **Rate Limit Handling**: Implement request queuing and retry mechanisms
- **Data Processing**: Handle incremental updates efficiently for TBT data
- **Memory Management**: Clean up unused subscriptions and data

### Development Environment Setup
1. Install fyers_apiv3: `pip install fyers_apiv3`
2. Create Fyers app at https://myapi.fyers.in
3. Configure redirect URI for development
4. Store credentials in environment variables
5. Test authentication flow in development
6. Implement WebSocket connections for live data