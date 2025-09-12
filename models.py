from datetime import datetime, timedelta
from app import db
import pytz


class BrokerSettings(db.Model):
    """
    Stores per–broker credentials for every user.
    During development we keep user_id = 0 and do **NOT** enforce
    a foreign-key to a User table – this avoids FK-violations while
    you build the rest of the app.
    """
    __tablename__ = "broker_settings"

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, nullable=False, default=0)

    # Broker identification
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
        """Check if access token is expired (8 hours from creation, expires at 8 AM IST)"""
        if not self.access_token_created_at:
            return True
        
        ist_tz = pytz.timezone('Asia/Kolkata')
        token_created_ist = self.access_token_created_at.replace(tzinfo=pytz.utc).astimezone(ist_tz)
        
        # Access tokens expire at 8 AM IST daily
        current_time_ist = datetime.now(ist_tz)
        
        # If created today and it's before 8 AM, it expires at 8 AM today
        # If created yesterday and it's after 8 AM today, it's expired
        # Tokens are valid for 8 hours from 8 AM IST
        today_8am = current_time_ist.replace(hour=8, minute=0, second=0, microsecond=0)
        
        if token_created_ist.date() == current_time_ist.date():
            # Token created today - expires at next 8 AM (tomorrow)
            expiry_time = today_8am + timedelta(days=1)
        else:
            # Token created on previous day - expires at 8 AM today
            expiry_time = today_8am
        
        return current_time_ist > expiry_time
    
    def is_refresh_token_expired(self):
        """Check if refresh token is expired (valid for 10 days)"""
        if not self.refresh_token_created_at or not self.refresh_token:
            return True
        
        expiry_time = self.refresh_token_created_at + timedelta(days=10)
        return datetime.utcnow() > expiry_time
    
    def access_token_expires_in_minutes(self):
        """Get minutes until access token expiry"""
        if not self.access_token_created_at:
            return 0
        
        ist_tz = pytz.timezone('Asia/Kolkata')
        current_time_ist = datetime.now(ist_tz)
        today_8am = current_time_ist.replace(hour=8, minute=0, second=0, microsecond=0)
        
        # Determine next expiry (8 AM IST)
        if current_time_ist.hour < 8:
            expiry_time = today_8am  # Expires today at 8 AM
        else:
            expiry_time = today_8am + timedelta(days=1)  # Expires tomorrow at 8 AM
        
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