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

## Changelog

Changelog:
- July 05, 2025. Updated ITM highlighting to use subtle yellow background (#fff3cd) matching reference design, while keeping existing logic intact
- July 05, 2025. Enhanced option chain table with professional styling, removed column visibility controls, disabled ATM row highlighting, and added dynamic yellow highlighting for ITM calls and puts based on real-time ATM calculations
- July 04, 2025. Initial setup