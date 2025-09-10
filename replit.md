# Trading Platform

## Overview

This is a Flask-based trading platform that provides live trading functionality with support for multiple brokers, options chain analysis, and market data visualization. The application features a modular architecture with separate components for broker management, symbol selection, and trading interfaces.

## System Architecture

### Backend Architecture
- **Framework**: Flask web application with SQLAlchemy ORM
- **Database**: PostgreSQL (configurable via DATABASE_URL environment variable)
- **Modular Design**: Blueprint-based routing system for organized code structure
- **API Integration**: REST endpoints for broker authentication and market data

### Frontend Architecture
- **Template Engine**: Jinja2 with base template inheritance
- **CSS Framework**: Bootstrap 5 for responsive design
- **JavaScript**: Vanilla JS with modular components for interactive features
- **UI Components**: Resizable panels, carousels, and modal dialogs

### Database Schema
- **BrokerSettings Model**: Stores broker credentials and access tokens
  - Supports multiple brokers per user
  - Includes token management with timestamps
  - Development-friendly with default user_id=0

## Key Components

### 1. Broker Management (`APP_Routes/broker_settings.py`)
- Handles broker authentication and token management
- Supports multiple broker integrations (Fyers SDK ready)
- RESTful API endpoints for CRUD operations on broker settings
- Token refresh and validation mechanisms

### 2. Symbol Selection (`APP_Routes/symbol_selector.py`)
- Fetches expiry dates for index symbols (NIFTY, BANKNIFTY, etc.)
- Integrates with external CSV data sources (NSE/BSE)
- Provides symbol lookup and filtering capabilities

### 3. Live Trading Interface (`templates/live_trade.html`)
- Real-time options chain display
- ATM (At-the-Money) strike highlighting
- ITM/OTM color coding for options
- Payoff chart visualization
- Market data carousel

### 4. Frontend Controllers
- **ChartController**: Manages chart visibility and fullscreen modes
- **ResizableLayout**: Handles drag-and-drop panel resizing
- **MarketDataCarousel**: Navigation for market data display
- **SymbolSelector**: Dynamic symbol and expiry selection

## Data Flow

1. **User Authentication**: Broker credentials stored in BrokerSettings model
2. **Symbol Selection**: Index/exchange selection triggers API calls to fetch symbols and expiry dates
3. **Market Data**: Real-time data fetched via broker APIs using stored access tokens
4. **Options Chain**: Live options data displayed with visual indicators for ITM/OTM status
5. **Chart Integration**: Payoff calculations and visualization based on selected options

## External Dependencies

### Python Packages
- Flask and Flask-SQLAlchemy for web framework and ORM
- requests for HTTP API calls
- pytz for timezone handling
- fyers_apiv3 (optional) for Fyers broker integration

### Frontend Libraries
- Bootstrap 5 for UI components
- Font Awesome for icons
- CSV data from public.fyers.in for symbol information

### Data Sources
- NSE/BSE CSV files for options symbols and expiry dates
- Broker APIs for real-time market data and order execution

## Deployment Strategy

### Environment Configuration
- DATABASE_URL for PostgreSQL connection
- DEBUG mode enabled for development
- Port 5000 default with host binding for containerization

### File Structure
- Modular blueprint organization in APP_Routes/
- Static assets in static/ directory
- Templates with inheritance in templates/
- Database extensions in APP_Extensions/

### Database Management
- SQLAlchemy models with automatic table creation
- Development-friendly foreign key handling
- Token expiration tracking for security

## User Preferences

Preferred communication style: Simple, everyday language.

## CRITICAL SYNCHRONIZATION LOGIC - DO NOT BREAK

### Position Tracking Arrays (PRESERVE THIS LOGIC)
The app uses THREE synchronized arrays that MUST always stay in sync:

1. **window.activeLots** - Array of individual lot objects (used for button badge counts)
2. **window.globalPositions** - Object with aggregated position data (used for active trades table & position cards)  
3. **window.closedTrades** - Array of closed trade records (used for closed trades table)

### Synchronization Rules (CRITICAL - NEVER BREAK)
**Every position modification MUST update ALL THREE arrays:**

1. **Buy/Sell Button Clicks (handleButtonClick function)**:
   - Updates window.activeLots (add/remove individual lots)
   - Updates window.globalPositions (increment/decrement aggregated counts)
   - During NETTING: Updates both arrays to remove closed positions

2. **Lots Column +/- Buttons (adjustLots function)**:
   - Updates window.globalPositions 
   - Syncs window.activeLots to match
   - Calls same update functions

3. **Position Card +/- Buttons (handleExpirySpecificPositionChange function)**:
   - Updates window.globalPositions
   - Syncs window.activeLots to match  
   - Calls same update functions

### Required Update Function Calls (ALWAYS CALL THESE)
After ANY position change, MUST call:
```javascript
updateActiveTradesTable();    // Updates active trades display
updateClosedTradesTable();    // Updates closed trades display  
updateCurrentPositionsTable(); // Updates position cards
createPayoffChartFromOptionChain(); // Updates payoff chart
```

### Netting Logic (PRESERVE EXACTLY)
When opposite positions net out:
1. Update window.activeLots (remove closed lot)
2. **CRITICAL**: Also update window.globalPositions (reduce lot count)
3. Add to window.closedTrades (record closed trade)
4. If globalPositions lots reach zero, delete the position entry

### Badge Count Calculation (PRESERVE)
Button badges calculate from window.activeLots filtering, NOT from counters:
```javascript
const remainingLots = window.activeLots.filter(lot => /* conditions */).length;
```

## Changelog

Changelog:
- September 10, 2025. CRITICAL PRESERVATION: Documented complete synchronization logic to prevent future breakage - all position modification systems now properly sync window.activeLots, window.globalPositions, and window.closedTrades arrays with mandatory update function calls
- September 09, 2025. URGENT: Position synchronization broken - Buy/Sell button badges show counts but Current Positions card shows "No positions yet" - the three-way sync between buttons, positions table, and payoff chart that was working perfectly has been disrupted by recent changes to handleButtonClick function
- July 07, 2025. Implemented comprehensive real-time payoff chart updates with dynamic spot price and breakeven line synchronization - the system now polls WebSocket data every 1 second to update the blue spot price vertical line and automatically recalculates red dashed breakeven lines based on current positions, with immediate updates triggered by Buy/Sell button clicks and support for both single and complex multi-leg option strategies
- July 06, 2025. Enhanced payoff chart with interactive features: zoom/pan functionality (drag to zoom, Shift+drag to pan), crosshairs with value labels, reset zoom button, simplified tooltip, removed title and legend for maximum space utilization, and improved horizontal label display for Breakeven and Spot price indicators with professional font styling
- July 06, 2025. Enhanced historical data system with 4-day range and 1-minute resolution - providing 1125 granular price points for real-time market analysis, added tick data endpoint for high-frequency data access, and optimized date ranges to capture weekday trading sessions
- July 06, 2025. Fixed microcharts display issue in option chain table - resolved historical data API to properly handle FYERS "no_data" responses, added debug logging for chart loading process, and implemented proper fallback display with chart icons when historical data isn't available for options
- July 05, 2025. Enhanced World Market Clock with individual market notification and sound controls, allowing per-market toggle switches for open/close notifications and sound alerts, plus bulk control buttons for managing all markets at once
- July 05, 2025. Added notification and sound muting controls to World Market Clock system with global toggle switches, visual status indicators on Markets button, and persistent user preferences stored in localStorage
- July 05, 2025. Added comprehensive World Market Clock feature with popup interface, CRUD operations for market times, real-time status monitoring, notification system with sound alerts, and database-driven market management supporting 10 major global exchanges including BSE and MCX
- July 05, 2025. Updated ITM highlighting to use subtle yellow background (#fff3cd) matching reference design, while keeping existing logic intact
- July 05, 2025. Enhanced option chain table with professional styling, removed column visibility controls, disabled ATM row highlighting, and added dynamic yellow highlighting for ITM calls and puts based on real-time ATM calculations
- July 04, 2025. Initial setup