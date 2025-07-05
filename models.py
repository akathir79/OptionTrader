from datetime import datetime
from APP_Extensions.db import db

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

    # optional / supporting fields
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

    # token columns (kept for future use)
    access_token             = db.Column(db.String(1000))
    refresh_token            = db.Column(db.String(1000))
    access_token_created_at  = db.Column(db.DateTime)
    refresh_token_created_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<BrokerSettings {self.brokername} | {self.broker_user_id}>"