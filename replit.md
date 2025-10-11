# Trading Platform

## Overview
This Flask-based trading platform provides live trading functionality, supporting multiple brokers, comprehensive options chain analysis, and market data visualization. It aims to be a robust, modular, and user-friendly environment for real-time trading operations, focusing on options trading strategies and market insights, unifying various data sources and broker services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Backend
-   **Framework**: Flask web application with SQLAlchemy ORM.
-   **Database**: PostgreSQL.
-   **Modularity**: Blueprint-based routing.
-   **API**: REST endpoints for broker authentication and market data.

### Frontend
-   **Templating**: Jinja2 with base template inheritance.
-   **Styling**: Bootstrap 5 for responsive design.
-   **Interactivity**: Vanilla JS with modular components.
-   **UI/UX Decisions**:
    -   Professional styling for option chain tables with dynamic highlighting for In-The-Money (ITM) calls and puts.
    -   Real-time payoff chart with dynamic spot price, breakeven lines, zoom/pan, crosshairs, and simplified tooltips.
    -   Microcharts in option chain table for historical data.
    -   World Market Clock with real-time status, notifications, and persistent user preferences.

### Technical Implementations & Feature Specifications
-   **Broker Management**: Handles authentication, token management, and CRUD for broker settings, supporting multiple integrations (e.g., Fyers).
-   **Symbol Selection**: Fetches expiry dates for index symbols (NIFTY, BANKNIFTY) and provides lookup/filtering, integrating with external CSV data.
-   **Live Trading Interface**: Displays real-time options chain with ATM (At-the-Money) strike highlighting and ITM/OTM color coding.
-   **Position Tracking Synchronization**: Critical logic ensures `window.activeLots`, `window.globalPositions`, and `window.closedTrades` arrays are always synchronized, triggering UI updates for tables and payoff charts.
-   **Real-Time Order Execution**:
    -   **Frontend**: Position table with Order Type, Stop Loss, Trailing SL checkbox, and Execute button. Interactive Order Confirmation Modal for editing all order parameters before execution.
    -   **Multi-Broker Validation**: Frontend validation for selected broker/user ID and backend validation for credentials and order parameters via `/api/place_real_order`.
    -   **Backend API**: Handles input validation, enum conversion, stop loss calculation, dynamic retrieval of broker credentials, and broker-specific order placement (e.g., Fyers, with extensibility for Kite, 5Paisa).
    -   **Security**: Broker credentials retrieved securely from the database.
-   **Payoff Chart**: Dynamic strike range adaptation based on loaded option chain data.
-   **Data Flow**: User authentication, symbol selection triggering API calls, real-time market data fetching via broker APIs, live options data display, and payoff chart visualization.
-   **Deployment**: Uses environment variables for configuration and a modular file structure.

## External Dependencies

### Python Packages
-   `Flask`: Web framework.
-   `Flask-SQLAlchemy`: ORM for database interaction.
-   `requests`: HTTP requests.
-   `pytz`: Timezone handling.
-   `fyers_apiv3`: Fyers broker integration.

### Frontend Libraries
-   `Bootstrap 5`: CSS framework.
-   `Font Awesome`: Icons.

### Data Sources
-   Public Fyers CSV data (e.g., `public.fyers.in/sym_details/NSE_FO.csv`) for symbol information.
-   NSE/BSE CSV files: Options symbols and expiry dates.
-   Broker APIs: Real-time market data, order execution, historical data (e.g., Fyers API v3 for market data, order management, and WebSocket streams).

### Fyers API v3 Integration
-   **Authentication Flow**: 3-step process involving generating an auth code, validating it to get an access token, and using the token for API calls.
-   **Python SDK**: `fyers_apiv3` for client initialization and API interaction.
-   **WebSocket Implementations**:
    -   Market Data WebSocket (`FyersDataSocket`) for real-time quotes, LTP, volume, OI updates.
    -   Order WebSocket for real-time order status, trade confirmations, and position updates.
    -   Tick-by-Tick (TBT) WebSocket for advanced, granular market depth (NFO instruments).
-   **API Rate Limits**: Defined per second, per minute, and per day with user blocking mechanisms.
-   **Symbol Master Files**: Various CSV files for different exchanges and segments (e.g., `NSE_FO.csv`, `NSE_CM.csv`).
-   **Key API Endpoints**:
    -   **Market Data**: Quotes, Market Depth, Historical Data, Market Status.
    -   **Order Management**: Place Order, Modify Order, Cancel Order, Order Book.
    -   **Portfolio & Positions**: Positions, Holdings, Funds, Tradebook.
-   **Order Placement Parameters**: Comprehensive parameters for `fyers.place_order()` including `symbol`, `qty`, `type` (Limit, Market, Stop, StopLimit), `side` (Buy/Sell), `productType`, `limitPrice`, `stopPrice`, `validity`, `disclosedQty`, `offlineOrder`, `stopLoss`, `takeProfit`, `orderTag`.
-   **Symbol Format Specification**: Option symbols must follow exact format `{Ex}:{Ex_UnderlyingSymbol}{YY}{MMM}{Strike}{Opt_Type}` where:
    -   `{YY}` = 2-digit year (e.g., "25" for 2025)
    -   `{MMM}` = 3-character uppercase month (JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC)
    -   Example: `NSE:NIFTY25OCT24200CE` for NIFTY 24200 Call expiring in October 2025

## Recent Changes

### October 11, 2025: Fyers API v3 Symbol Format Bug Fix
-   **Issue**: Frontend was generating incorrect option symbols using YYMMDD format (e.g., "251028") instead of Fyers API v3 required YYMM format (e.g., "25OCT")
-   **Root Cause**: `formatExpiryForSymbol()` functions in both `templates/live_trade.html` and `static/js/paper_trading.js` were incorrectly formatting the expiry date
-   **Fix Applied**:
    -   Updated `formatExpiryForSymbol()` in `templates/live_trade.html` (line 3662) to generate YYMM format
    -   Updated `formatExpiryForSymbol()` in `static/js/paper_trading.js` to generate YYMM format
    -   Verified backend receives symbols from Fyers API (already correct) and frontend constructs symbols for order placement (now fixed)
-   **Impact**: Order placement now uses correct symbol format, ensuring successful execution with Fyers API v3