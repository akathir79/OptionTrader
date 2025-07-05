from APP_Extensions.db import db
from datetime import datetime


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

    brokername      = db.Column(db.String(50),  nullable=False)
    broker_user_id  = db.Column(db.String(50),  nullable=False)

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

    access_token             = db.Column(db.String(1000))
    refresh_token            = db.Column(db.String(1000))
    access_token_created_at  = db.Column(db.DateTime)
    refresh_token_created_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<BrokerSettings {self.brokername}:{self.broker_user_id}>"


class Position(db.Model):
    """
    Stores current option positions for synchronized trading
    """
    __tablename__ = "positions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, default=0)
    
    symbol = db.Column(db.String(100), nullable=False)
    strike = db.Column(db.Float, nullable=False)
    expiry = db.Column(db.String(20), nullable=False)
    option_type = db.Column(db.String(4), nullable=False)  # 'CE' or 'PE'
    action = db.Column(db.String(4), nullable=False)  # 'BUY' or 'SELL'
    quantity = db.Column(db.Integer, nullable=False)
    entry_price = db.Column(db.Float, nullable=False)
    current_price = db.Column(db.Float, nullable=False)
    lot_size = db.Column(db.Integer, nullable=False, default=75)
    
    trade_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Position {self.symbol} {self.strike} {self.option_type} {self.action} {self.quantity}>"

    def to_dict(self):
        return {
            'id': self.id,
            'symbol': self.symbol,
            'strike': self.strike,
            'expiry': self.expiry,
            'option_type': self.option_type,
            'action': self.action,
            'quantity': self.quantity,
            'entry_price': self.entry_price,
            'current_price': self.current_price,
            'lot_size': self.lot_size,
            'pnl': (self.current_price - self.entry_price) * self.quantity if self.action == 'BUY' else (self.entry_price - self.current_price) * self.quantity,
            'trade_date': self.trade_date.strftime('%d-%m-%Y %H:%M:%S') if self.trade_date else '',
            'created_at': self.created_at.strftime('%d-%m-%Y %H:%M:%S') if self.created_at else ''
        }