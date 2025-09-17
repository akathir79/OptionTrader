from datetime import datetime, timedelta
from app import db
from sqlalchemy import Index, CheckConstraint, Numeric
import pytz


class BrokerSettings(db.Model):
    """
    ⚠️ CRITICAL DATABASE MODEL: Stores broker credentials for live trading
    Contains access tokens and API keys - DO NOT modify field names or types!
    During development we keep user_id = 0 and do **NOT** enforce
    a foreign-key to a User table – this avoids FK-violations while
    you build the rest of the app.
    """
    __tablename__ = "broker_settings"

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, nullable=False, default=0)

    # ⚠️ CRITICAL: Broker identification fields - case sensitivity matters!
    # brokername stored as 'FYERS' (uppercase) - queries must match exactly  
    brokername      = db.Column(db.String(50),  nullable=False)
    broker_user_id  = db.Column(db.String(50),  nullable=False)

    # App registration details
    app_name        = db.Column(db.String(50))
    app_source      = db.Column(db.String(50))
    clientid        = db.Column(db.String(50))
    appkey          = db.Column(db.String(100))
    redirect_url    = db.Column(db.String(200))
    pin             = db.Column(db.String(10))
    useremail       = db.Column(db.String(120))
    usermobileno    = db.Column(db.String(15))
    pan             = db.Column(db.String(10))
    dob             = db.Column(db.Date)

    # Token management
    access_token             = db.Column(db.String(1000))
    refresh_token            = db.Column(db.String(1000))
    access_token_created_at  = db.Column(db.DateTime)
    refresh_token_created_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<BrokerSettings {self.brokername}:{self.broker_user_id}>"
    
    def is_access_token_expired(self):
        """Check if access token is expired (8 hours from creation OR at 8 AM IST, whichever is earlier)"""
        if not self.access_token_created_at:
            return True
        
        ist_tz = pytz.timezone('Asia/Kolkata')
        token_created_ist = self.access_token_created_at.replace(tzinfo=pytz.utc).astimezone(ist_tz)
        current_time_ist = datetime.now(ist_tz)
        
        # Calculate expiry as minimum of: 8 hours from creation OR next 8 AM IST
        eight_hours_later = token_created_ist + timedelta(hours=8)
        
        # Find next 8 AM IST after token creation
        if token_created_ist.hour < 8:
            # If created before 8 AM, expires at 8 AM same day
            next_8am = token_created_ist.replace(hour=8, minute=0, second=0, microsecond=0)
        else:
            # If created after 8 AM, expires at 8 AM next day
            next_8am = (token_created_ist + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
        
        # Expiry is whichever comes first: 8 hours OR next 8 AM
        expiry_time = min(eight_hours_later, next_8am)
        
        return current_time_ist > expiry_time
    
    def is_refresh_token_expired(self):
        """Check if refresh token is expired (valid for 10 days)"""
        if not self.refresh_token_created_at or not self.refresh_token:
            return True
        
        expiry_time = self.refresh_token_created_at + timedelta(days=10)
        return datetime.utcnow() > expiry_time
    
    def access_token_expires_in_minutes(self):
        """Get minutes until access token expiry (8 hours from creation OR next 8 AM IST, whichever is earlier)"""
        if not self.access_token_created_at:
            return 0
        
        ist_tz = pytz.timezone('Asia/Kolkata')
        token_created_ist = self.access_token_created_at.replace(tzinfo=pytz.utc).astimezone(ist_tz)
        current_time_ist = datetime.now(ist_tz)
        
        # Calculate expiry as minimum of: 8 hours from creation OR next 8 AM IST
        eight_hours_later = token_created_ist + timedelta(hours=8)
        
        # Find next 8 AM IST after token creation
        if token_created_ist.hour < 8:
            # If created before 8 AM, expires at 8 AM same day
            next_8am = token_created_ist.replace(hour=8, minute=0, second=0, microsecond=0)
        else:
            # If created after 8 AM, expires at 8 AM next day
            next_8am = (token_created_ist + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
        
        # Expiry is whichever comes first: 8 hours OR next 8 AM
        expiry_time = min(eight_hours_later, next_8am)
        
        time_diff = expiry_time - current_time_ist
        return max(0, int(time_diff.total_seconds() / 60))
    
    def refresh_token_expires_in_days(self):
        """Get days until refresh token expiry"""
        if not self.refresh_token_created_at or not self.refresh_token:
            return 0
        
        expiry_time = self.refresh_token_created_at + timedelta(days=10)
        time_diff = expiry_time - datetime.utcnow()
        return max(0, int(time_diff.total_seconds() / (24 * 3600)))
    
    def get_token_status(self):
        """Get comprehensive token status for notifications"""
        return {
            'broker_id': self.id,
            'brokername': self.brokername,
            'broker_user_id': self.broker_user_id,
            'access_token_expired': self.is_access_token_expired(),
            'refresh_token_expired': self.is_refresh_token_expired(),
            'access_token_expires_in_minutes': self.access_token_expires_in_minutes(),
            'refresh_token_expires_in_days': self.refresh_token_expires_in_days(),
            'has_refresh_token': bool(self.refresh_token)
        }


class MarketTime(db.Model):
    """
    Stores world stock market trading hours and holidays
    """
    __tablename__ = "market_times"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, default=0)
    
    # Market identification
    market_name = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(50), nullable=False)
    exchange_code = db.Column(db.String(10), nullable=False)
    
    # Trading hours (stored as strings in HH:MM format)
    local_open_time = db.Column(db.String(5), nullable=False)
    local_close_time = db.Column(db.String(5), nullable=False)
    
    # Timezone information
    timezone = db.Column(db.String(50), nullable=False)
    
    # Trading days (stored as comma-separated string: "1,2,3,4,5" for Mon-Fri)
    trading_days = db.Column(db.String(20), nullable=False, default="1,2,3,4,5")
    
    # Notification preferences
    notify_open = db.Column(db.Boolean, default=True)
    notify_close = db.Column(db.Boolean, default=True)
    sound_enabled = db.Column(db.Boolean, default=True)
    
    # Pre-market and after-hours (optional)
    premarket_start = db.Column(db.String(5))
    afterhours_end = db.Column(db.String(5))
    
    # Lunch break (optional)
    lunch_start = db.Column(db.String(5))
    lunch_end = db.Column(db.String(5))
    
    # Market status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<MarketTime {self.market_name} ({self.country})>"

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'market_name': self.market_name,
            'country': self.country,
            'exchange_code': self.exchange_code,
            'local_open_time': self.local_open_time,
            'local_close_time': self.local_close_time,
            'timezone': self.timezone,
            'trading_days': self.trading_days,
            'notify_open': self.notify_open,
            'notify_close': self.notify_close,
            'sound_enabled': self.sound_enabled,
            'premarket_start': self.premarket_start,
            'afterhours_end': self.afterhours_end,
            'lunch_start': self.lunch_start,
            'lunch_end': self.lunch_end,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class FuturesContract(db.Model):
    """
    Store futures contract metadata for analysis
    Maps underlying symbols to their active futures contracts with expiry tracking
    """
    __tablename__ = "futures_contracts"

    id = db.Column(db.Integer, primary_key=True)
    symbol_root = db.Column(db.String(50), nullable=False)  # e.g., 'NIFTY'
    fy_symbol = db.Column(db.String(100), nullable=False, unique=True)   # e.g., 'NSE:NIFTY25SEPFUT'
    fy_token = db.Column(db.String(50))                     # Fyers token for WebSocket
    expiry_date = db.Column(db.Date, nullable=False)
    lot_size = db.Column(db.Integer, default=50)            # Contract lot size
    underlying_symbol = db.Column(db.String(100), nullable=False)  # e.g., 'NSE:NIFTY50-INDEX'
    
    # Contract status
    is_active = db.Column(db.Boolean, default=True)
    is_near_month = db.Column(db.Boolean, default=False)    # Current near month contract
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Uniqueness constraints and performance indexes
    __table_args__ = (
        db.UniqueConstraint('symbol_root', 'expiry_date', name='uix_futures_symbol_expiry'),
        Index('ix_futures_symbol_expiry', 'symbol_root', expiry_date.desc()),
        Index('ix_futures_active_near', 'is_active', 'is_near_month'),
    )

    def __repr__(self) -> str:
        return f"<FuturesContract {self.fy_symbol} exp:{self.expiry_date}>"

    def to_dict(self):
        return {
            'id': self.id,
            'symbol_root': self.symbol_root,
            'fy_symbol': self.fy_symbol,
            'fy_token': self.fy_token,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'lot_size': self.lot_size,
            'underlying_symbol': self.underlying_symbol,
            'is_active': self.is_active,
            'is_near_month': self.is_near_month
        }


class FuturesPrice(db.Model):
    """
    Store historical futures price data with derived analytics
    Core table for basis analysis, carry calculations, and arbitrage detection
    """
    __tablename__ = "futures_prices"

    id = db.Column(db.Integer, primary_key=True)
    contract_id = db.Column(db.Integer, db.ForeignKey('futures_contracts.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    
    # OHLCV data - using Numeric for precision
    open_price = db.Column(Numeric(18, 6))
    high_price = db.Column(Numeric(18, 6))
    low_price = db.Column(Numeric(18, 6))
    close_price = db.Column(Numeric(18, 6), nullable=False)  # Futures price (F)
    volume = db.Column(db.BigInteger)
    
    # Corresponding spot data
    spot_price = db.Column(Numeric(18, 6), nullable=False)   # Spot price (S) at same timestamp
    
    # Derived analytics fields
    basis = db.Column(Numeric(18, 6))                    # F - S
    basis_pct = db.Column(Numeric(10, 6))               # (F/S - 1) * 100
    fair_value = db.Column(Numeric(18, 6))              # Theoretical fair futures price
    fv_gap = db.Column(Numeric(18, 6))                  # Actual F - Fair F (mispricing)
    carry_annualized = db.Column(Numeric(10, 6))        # Annualized carry rate
    
    # Additional fields for analysis
    days_to_expiry = db.Column(db.Integer)
    risk_free_rate = db.Column(Numeric(10, 6))          # Rate used in calculation
    dividend_yield = db.Column(Numeric(10, 6))          # Dividend yield used
    
    # Relationship
    contract = db.relationship('FuturesContract', backref='price_history')
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Uniqueness constraints and performance indexes
    __table_args__ = (
        db.UniqueConstraint('contract_id', 'timestamp', name='uix_futures_price_contract_time'),
        Index('ix_futures_price_contract_time', 'contract_id', timestamp.desc()),
    )

    def __repr__(self) -> str:
        return f"<FuturesPrice {self.contract_id} @{self.timestamp} F:{self.close_price} S:{self.spot_price}>"

    def to_dict(self):
        return {
            'id': self.id,
            'contract_id': self.contract_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'open_price': self.open_price,
            'high_price': self.high_price,
            'low_price': self.low_price,
            'close_price': self.close_price,
            'volume': self.volume,
            'spot_price': self.spot_price,
            'basis': self.basis,
            'basis_pct': self.basis_pct,
            'fair_value': self.fair_value,
            'fv_gap': self.fv_gap,
            'carry_annualized': self.carry_annualized,
            'days_to_expiry': self.days_to_expiry,
            'risk_free_rate': self.risk_free_rate,
            'dividend_yield': self.dividend_yield
        }


class ExpirySpread(db.Model):
    """
    Store spread calculations between different expiry contracts
    Used for calendar spread analysis and roll yield tracking
    """
    __tablename__ = "expiry_spreads"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    
    # Contract references
    f1_contract_id = db.Column(db.Integer, db.ForeignKey('futures_contracts.id'), nullable=False)  # Near month
    f2_contract_id = db.Column(db.Integer, db.ForeignKey('futures_contracts.id'), nullable=False)  # Far month
    
    # Spread data - using Numeric for precision
    spread = db.Column(Numeric(18, 6))          # F2 - F1 (calendar spread)
    spread_pct = db.Column(Numeric(10, 6))      # (F2/F1 - 1) * 100
    roll_yield = db.Column(Numeric(10, 6))      # Expected yield from rolling position
    
    # Relationships
    f1_contract = db.relationship('FuturesContract', foreign_keys=[f1_contract_id])
    f2_contract = db.relationship('FuturesContract', foreign_keys=[f2_contract_id])
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Uniqueness constraints, performance indexes, and data integrity
    __table_args__ = (
        db.UniqueConstraint('f1_contract_id', 'f2_contract_id', 'timestamp', name='uix_expiry_spread_contracts_time'),
        Index('ix_expiry_spread_f1_time', 'f1_contract_id', timestamp.desc()),
        Index('ix_expiry_spread_f2_time', 'f2_contract_id', timestamp.desc()),
        CheckConstraint('f1_contract_id != f2_contract_id', name='chk_expiry_spread_different_contracts'),
    )

    def __repr__(self) -> str:
        return f"<ExpirySpread F1:{self.f1_contract_id} F2:{self.f2_contract_id} @{self.timestamp}>"

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'f1_contract_id': self.f1_contract_id,
            'f2_contract_id': self.f2_contract_id,
            'spread': self.spread,
            'spread_pct': self.spread_pct,
            'roll_yield': self.roll_yield
        }


class AnalysisSnapshot(db.Model):
    """
    Store futures analysis results and trading signals
    Provides summary insights and actionable conclusions
    """
    __tablename__ = "analysis_snapshots"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    underlying_symbol = db.Column(db.String(100), nullable=False)
    
    # Analysis results (stored as JSON)
    signals_json = db.Column(db.Text)     # JSON containing signals array
    summary_text = db.Column(db.Text)     # Human readable summary
    
    # Key metrics snapshot - using Numeric for precision
    current_basis = db.Column(Numeric(18, 6))
    basis_zscore = db.Column(Numeric(10, 6))
    regime = db.Column(db.String(20))     # 'contango', 'backwardation', 'normal'
    confidence_score = db.Column(Numeric(5, 2))  # 0-100 confidence in signals
    
    # Opportunity categories
    arbitrage_opportunity = db.Column(db.Boolean, default=False)
    calendar_opportunity = db.Column(db.Boolean, default=False)
    volatility_opportunity = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Performance indexes
    __table_args__ = (
        Index('ix_analysis_snapshot_symbol_time', 'underlying_symbol', timestamp.desc()),
    )

    def __repr__(self) -> str:
        return f"<AnalysisSnapshot {self.underlying_symbol} @{self.timestamp} regime:{self.regime}>"

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'underlying_symbol': self.underlying_symbol,
            'signals_json': self.signals_json,
            'summary_text': self.summary_text,
            'current_basis': self.current_basis,
            'basis_zscore': self.basis_zscore,
            'regime': self.regime,
            'confidence_score': self.confidence_score,
            'arbitrage_opportunity': self.arbitrage_opportunity,
            'calendar_opportunity': self.calendar_opportunity,
            'volatility_opportunity': self.volatility_opportunity
        }


class PaperPortfolio(db.Model):
    """
    Paper trading portfolio - virtual trading account for risk-free practice
    """
    __tablename__ = "paper_portfolios"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False, default='default_user')  # Session-based user identification
    
    # Portfolio balances
    balance = db.Column(Numeric(18, 2), nullable=False, default=100000.00)  # Current available balance
    initial_balance = db.Column(Numeric(18, 2), nullable=False, default=100000.00)  # Starting balance
    total_pnl = db.Column(Numeric(18, 2), nullable=False, default=0.00)  # Total profit/loss
    
    # Portfolio statistics
    total_trades = db.Column(db.Integer, default=0)
    winning_trades = db.Column(db.Integer, default=0)
    losing_trades = db.Column(db.Integer, default=0)
    
    # Risk management
    daily_loss_limit = db.Column(Numeric(18, 2), default=5000.00)
    max_position_size = db.Column(Numeric(18, 2), default=10000.00)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trades = db.relationship('PaperTrade', backref='portfolio', lazy='dynamic', cascade='all, delete-orphan')
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('user_id', name='uix_paper_portfolio_user'),
        Index('ix_paper_portfolio_user', 'user_id'),
    )

    def __repr__(self) -> str:
        return f"<PaperPortfolio user:{self.user_id} balance:{self.balance}>"

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'balance': float(self.balance),
            'initial_balance': float(self.initial_balance),
            'total_pnl': float(self.total_pnl),
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'daily_loss_limit': float(self.daily_loss_limit),
            'max_position_size': float(self.max_position_size),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class OptionStrategy(db.Model):
    """
    Option trading strategies from books and educational sources
    """
    __tablename__ = "option_strategies"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100))
    description = db.Column(db.Text)
    market_condition = db.Column(db.String(200))
    risk_profile = db.Column(db.String(200))
    max_profit = db.Column(db.Text)
    max_loss = db.Column(db.Text)
    breakeven_points = db.Column(db.Text)
    construction = db.Column(db.Text)
    adjustments = db.Column(db.Text)
    source_book = db.Column(db.String(300))
    author = db.Column(db.String(200))
    page_reference = db.Column(db.String(50))
    examples = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Performance index
    __table_args__ = (
        Index('ix_option_strategies_name_category', 'name', 'category'),
    )

    def __repr__(self) -> str:
        return f"<OptionStrategy {self.name} ({self.category})>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'market_condition': self.market_condition,
            'risk_profile': self.risk_profile,
            'max_profit': self.max_profit,
            'max_loss': self.max_loss,
            'breakeven_points': self.breakeven_points,
            'construction': self.construction,
            'adjustments': self.adjustments,
            'source_book': self.source_book,
            'author': self.author,
            'page_reference': self.page_reference,
            'examples': self.examples,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PaperTrade(db.Model):
    """
    Individual paper trades - virtual buy/sell transactions
    """
    __tablename__ = "paper_trades"

    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('paper_portfolios.id'), nullable=False)
    
    # Trade identification
    symbol = db.Column(db.String(100), nullable=False)
    trade_type = db.Column(db.String(10), nullable=False)  # 'BUY' or 'SELL'
    option_type = db.Column(db.String(10))  # 'CE', 'PE', or None for stocks/indices
    strike_price = db.Column(Numeric(18, 2))
    expiry_date = db.Column(db.Date)
    
    # Trade details
    quantity = db.Column(db.Integer, nullable=False)
    entry_price = db.Column(Numeric(18, 6), nullable=False)
    exit_price = db.Column(Numeric(18, 6))
    
    # P&L calculation
    pnl = db.Column(Numeric(18, 2), default=0.00)
    pnl_pct = db.Column(Numeric(10, 4), default=0.00)
    
    # Trade status
    status = db.Column(db.String(20), default='OPEN')  # 'OPEN', 'CLOSED', 'CANCELLED'
    
    # Timestamps
    executed_at = db.Column(db.DateTime, default=datetime.utcnow)
    closed_at = db.Column(db.DateTime)
    
    # Additional metadata
    notes = db.Column(db.Text)
    order_type = db.Column(db.String(20), default='MARKET')  # 'MARKET', 'LIMIT', 'STOP'
    
    # Constraints and indexes
    __table_args__ = (
        Index('ix_paper_trade_portfolio_symbol', 'portfolio_id', 'symbol'),
        Index('ix_paper_trade_status_executed', 'status', 'executed_at'),
        CheckConstraint('quantity > 0', name='chk_paper_trade_positive_quantity'),
        CheckConstraint('entry_price > 0', name='chk_paper_trade_positive_entry_price'),
    )

    def __repr__(self) -> str:
        return f"<PaperTrade {self.trade_type} {self.quantity} {self.symbol} @{self.entry_price}>"

    def calculate_pnl(self, current_price=None):
        """Calculate current P&L based on current price or exit price"""
        if self.status == 'CLOSED' and self.exit_price:
            if self.trade_type == 'BUY':
                self.pnl = (self.exit_price - self.entry_price) * self.quantity
            else:  # SELL
                self.pnl = (self.entry_price - self.exit_price) * self.quantity
        elif current_price and self.status == 'OPEN':
            if self.trade_type == 'BUY':
                self.pnl = (current_price - self.entry_price) * self.quantity
            else:  # SELL
                self.pnl = (self.entry_price - current_price) * self.quantity
        
        # Calculate percentage P&L
        if self.entry_price and self.entry_price > 0:
            trade_value = self.entry_price * self.quantity
            self.pnl_pct = (self.pnl / trade_value) * 100 if trade_value > 0 else 0
        
        return float(self.pnl)

    def to_dict(self):
        return {
            'id': self.id,
            'portfolio_id': self.portfolio_id,
            'symbol': self.symbol,
            'trade_type': self.trade_type,
            'option_type': self.option_type,
            'strike_price': float(self.strike_price) if self.strike_price else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'quantity': self.quantity,
            'entry_price': float(self.entry_price),
            'exit_price': float(self.exit_price) if self.exit_price else None,
            'pnl': float(self.pnl),
            'pnl_pct': float(self.pnl_pct),
            'status': self.status,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
            'notes': self.notes,
            'order_type': self.order_type
        }


class PaperTradingSettings(db.Model):
    """
    Paper trading configuration and preferences for users
    """
    __tablename__ = "paper_trading_settings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    
    # Trading mode
    is_paper_mode = db.Column(db.Boolean, default=True)
    
    # Risk management settings
    risk_tolerance = db.Column(db.String(20), default='MODERATE')  # 'CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'
    max_position_size = db.Column(Numeric(18, 2), default=10000.00)
    daily_loss_limit = db.Column(Numeric(18, 2), default=5000.00)
    max_open_positions = db.Column(db.Integer, default=10)
    
    # Execution settings
    enable_slippage = db.Column(db.Boolean, default=True)
    slippage_percentage = db.Column(Numeric(5, 4), default=0.05)  # 0.05% default slippage
    enable_fees = db.Column(db.Boolean, default=True)
    brokerage_per_trade = db.Column(Numeric(10, 2), default=20.00)  # Fixed brokerage per trade
    
    # Notification preferences
    notify_on_fill = db.Column(db.Boolean, default=True)
    notify_on_pnl_threshold = db.Column(db.Boolean, default=True)
    pnl_notification_threshold = db.Column(Numeric(10, 2), default=1000.00)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('user_id', name='uix_paper_trading_settings_user'),
        Index('ix_paper_trading_settings_user', 'user_id'),
        CheckConstraint('max_position_size > 0', name='chk_paper_settings_positive_position_size'),
        CheckConstraint('daily_loss_limit > 0', name='chk_paper_settings_positive_loss_limit'),
    )

    def __repr__(self) -> str:
        return f"<PaperTradingSettings user:{self.user_id} mode:{self.is_paper_mode}>"

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'is_paper_mode': self.is_paper_mode,
            'risk_tolerance': self.risk_tolerance,
            'max_position_size': float(self.max_position_size),
            'daily_loss_limit': float(self.daily_loss_limit),
            'max_open_positions': self.max_open_positions,
            'enable_slippage': self.enable_slippage,
            'slippage_percentage': float(self.slippage_percentage),
            'enable_fees': self.enable_fees,
            'brokerage_per_trade': float(self.brokerage_per_trade),
            'notify_on_fill': self.notify_on_fill,
            'notify_on_pnl_threshold': self.notify_on_pnl_threshold,
            'pnl_notification_threshold': float(self.pnl_notification_threshold),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }