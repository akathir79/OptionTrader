# ---------------------------------------------------------------------
# Token expiry monitoring API endpoints for bell notification system
# ---------------------------------------------------------------------
from flask import Blueprint, jsonify
from app import db
from models import BrokerSettings
import logging

bp = Blueprint("token_monitor", __name__, url_prefix="/api/token-monitor")
logger = logging.getLogger(__name__)

def _json_error(msg: str, status: int = 400):
    return jsonify(error=msg), status

def _rows():
    # TODO: Replace with proper user session filtering when authentication is implemented
    # For now, use user_id=0 as per existing broker_settings pattern
    return BrokerSettings.query.filter_by(user_id=0)

@bp.get("/status")
def get_token_status():
    """Get token expiry status for all brokers - used by bell notification system"""
    try:
        brokers = _rows().all()
        token_statuses = []
        
        for broker in brokers:
            status = broker.get_token_status()
            # Only include brokers with tokens
            if broker.access_token:
                token_statuses.append(status)
        
        return jsonify({
            "brokers": token_statuses,
            "total_brokers": len(token_statuses),
            "expired_access_tokens": sum(1 for s in token_statuses if s['access_token_expired']),
            "expired_refresh_tokens": sum(1 for s in token_statuses if s['refresh_token_expired']),
        })
    
    except Exception as e:
        logger.error(f"Error getting token status: {e}")
        return _json_error(f"Error getting token status: {str(e)}", 500)

@bp.get("/notifications")
def get_token_notifications():
    """Get token expiry notifications for bell dropdown"""
    try:
        brokers = _rows().all()
        notifications = []
        
        for broker in brokers:
            status = broker.get_token_status()
            
            # Include broker even if no access token (for "create token" notifications)
            
            # Access token notifications
            if status['access_token_expired']:
                notifications.append({
                    'type': 'error',
                    'broker_id': broker.id,
                    'brokername': status['brokername'],
                    'broker_user_id': status['broker_user_id'],
                    'message': f"{status['brokername']} ({status['broker_user_id']}) access token has expired",
                    'action': 'refresh_access',
                    'priority': 'high',
                    'supports_refresh_token': bool(broker.refresh_token),
                    'supports_access_token': True
                })
            elif status['access_token_expires_in_minutes'] <= 60:  # Warning 1 hour before expiry
                notifications.append({
                    'type': 'warning',
                    'broker_id': broker.id,
                    'brokername': status['brokername'],
                    'broker_user_id': status['broker_user_id'],
                    'message': f"{status['brokername']} ({status['broker_user_id']}) access token expires in {status['access_token_expires_in_minutes']} minutes",
                    'action': 'refresh_access',
                    'priority': 'medium',
                    'supports_refresh_token': bool(broker.refresh_token),
                    'supports_access_token': True
                })
            
            # Refresh token notifications (if broker supports refresh tokens)
            if status['has_refresh_token']:
                if status['refresh_token_expired']:
                    notifications.append({
                        'type': 'error',
                        'broker_id': broker.id,
                        'brokername': status['brokername'],
                        'broker_user_id': status['broker_user_id'],
                        'message': f"{status['brokername']} ({status['broker_user_id']}) refresh token has expired - need new access token",
                        'action': 'create_access',
                        'priority': 'high',
                        'supports_refresh_token': True,
                        'supports_access_token': True
                    })
                elif status['refresh_token_expires_in_days'] <= 2:  # Warning 2 days before expiry
                    notifications.append({
                        'type': 'warning',
                        'broker_id': broker.id,
                        'brokername': status['brokername'],
                        'broker_user_id': status['broker_user_id'],
                        'message': f"{status['brokername']} ({status['broker_user_id']}) refresh token expires in {status['refresh_token_expires_in_days']} days",
                        'action': 'create_access',
                        'priority': 'medium',
                        'supports_refresh_token': True,
                        'supports_access_token': True
                    })
        
        return jsonify({
            "notifications": notifications,
            "count": len(notifications)
        })
    
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        return _json_error(f"Error getting notifications: {str(e)}", 500)