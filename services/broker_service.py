"""
Unified Broker Service for managing multiple trading APIs
Supports: Fyers, Zerodha Kite, Upstox, 5paisa, Samco
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

# Trading API imports
try:
    from fyers_apiv3 import fyersModel
except ImportError:
    fyersModel = None

try:
    from kiteconnect import KiteConnect, KiteTicker
except ImportError:
    KiteConnect = None
    KiteTicker = None

try:
    import upstox_client
except ImportError:
    upstox_client = None

try:
    from py5paisa import FivePaisaClient
except ImportError:
    FivePaisaClient = None

try:
    from snapi_py_client.snapi_bridge import StockNoteConnector
except ImportError:
    try:
        from stocknotebridge import StockNoteConnector
    except ImportError:
        StockNoteConnector = None

from app import db
from models import BrokerSettings

logger = logging.getLogger(__name__)


class BrokerType(Enum):
    """Supported broker types"""
    FYERS = "fyers"
    ZERODHA = "zerodha"
    UPSTOX = "upstox"
    FIVEPAISA = "5paisa"
    SAMCO = "samco"


class BrokerService:
    """Unified service for managing multiple trading brokers"""
    
    def __init__(self, user_id: int = 0):
        self.user_id = user_id
        self._clients = {}  # Cache for authenticated clients
        
    def get_broker_settings(self, broker_type: BrokerType) -> Optional[BrokerSettings]:
        """Get broker settings from database"""
        return BrokerSettings.query.filter_by(
            user_id=self.user_id,
            brokername=broker_type.value
        ).first()
    
    def save_broker_settings(self, broker_type: BrokerType, config: Dict[str, Any]) -> BrokerSettings:
        """Save broker configuration to database"""
        settings = self.get_broker_settings(broker_type)
        
        if not settings:
            settings = BrokerSettings()
            settings.user_id = self.user_id
            settings.brokername = broker_type.value
        
        # Update common fields
        for field, value in config.items():
            if hasattr(settings, field):
                setattr(settings, field, value)
        
        # Set token creation timestamp
        if 'access_token' in config:
            settings.access_token_created_at = datetime.utcnow()
        
        db.session.add(settings)
        db.session.commit()
        return settings
    
    def is_broker_configured(self, broker_type: BrokerType) -> bool:
        """Check if broker is properly configured"""
        settings = self.get_broker_settings(broker_type)
        if not settings:
            return False
        
        # Check broker-specific required fields
        required_fields = self._get_required_fields(broker_type)
        return all(getattr(settings, field, None) for field in required_fields)
    
    def _get_required_fields(self, broker_type: BrokerType) -> List[str]:
        """Get required configuration fields for each broker"""
        field_map = {
            BrokerType.FYERS: ['clientid', 'appkey', 'redirect_url'],
            BrokerType.ZERODHA: ['appkey'],
            BrokerType.UPSTOX: ['appkey'],
            BrokerType.FIVEPAISA: ['app_name', 'app_source', 'broker_user_id', 'appkey'],
            BrokerType.SAMCO: ['broker_user_id']
        }
        return field_map.get(broker_type, [])
    
    def create_client(self, broker_type: BrokerType) -> Optional[Any]:
        """Create authenticated client for the specified broker"""
        if broker_type in self._clients:
            return self._clients[broker_type]
        
        settings = self.get_broker_settings(broker_type)
        if not settings:
            logger.error(f"No settings found for broker: {broker_type.value}")
            return None
        
        client = None
        try:
            if broker_type == BrokerType.FYERS:
                client = self._create_fyers_client(settings)
            elif broker_type == BrokerType.ZERODHA:
                client = self._create_zerodha_client(settings)
            elif broker_type == BrokerType.UPSTOX:
                client = self._create_upstox_client(settings)
            elif broker_type == BrokerType.FIVEPAISA:
                client = self._create_5paisa_client(settings)
            elif broker_type == BrokerType.SAMCO:
                client = self._create_samco_client(settings)
            
            if client:
                self._clients[broker_type] = client
                logger.info(f"Successfully created client for {broker_type.value}")
            
        except Exception as e:
            logger.error(f"Failed to create client for {broker_type.value}: {str(e)}")
        
        return client
    
    def _create_fyers_client(self, settings: BrokerSettings) -> Optional[Any]:
        """Create Fyers client"""
        if not fyersModel:
            logger.error("Fyers SDK not available")
            return None
        
        if not settings.access_token or settings.is_access_token_expired():
            logger.error("Fyers access token not available or expired")
            return None
        
        return fyersModel.FyersModel(
            token=settings.access_token,
            is_async=False,
            client_id=settings.clientid,
            log_path=""
        )
    
    def _create_zerodha_client(self, settings: BrokerSettings) -> Optional[Any]:
        """Create Zerodha Kite client"""
        if not KiteConnect:
            logger.error("Kite Connect SDK not available")
            return None
        
        kite = KiteConnect(api_key=settings.appkey)
        
        if settings.access_token and not settings.is_access_token_expired():
            kite.set_access_token(settings.access_token)
        else:
            logger.error("Zerodha access token not available or expired")
            return None
        
        return kite
    
    def _create_upstox_client(self, settings: BrokerSettings) -> Optional[Any]:
        """Create Upstox client"""
        if not upstox_client:
            logger.error("Upstox SDK not available")
            return None
        
        if not settings.access_token or settings.is_access_token_expired():
            logger.error("Upstox access token not available or expired")
            return None
        
        configuration = upstox_client.Configuration()
        configuration.access_token = settings.access_token
        
        return upstox_client.ApiClient(configuration)
    
    def _create_5paisa_client(self, settings: BrokerSettings) -> Optional[Any]:
        """Create 5paisa client"""
        if not FivePaisaClient:
            logger.error("5paisa SDK not available")
            return None
        
        cred = {
            "APP_NAME": settings.app_name,
            "APP_SOURCE": settings.app_source,
            "USER_ID": settings.broker_user_id,
            "PASSWORD": os.environ.get("FIVEPAISA_PASSWORD", ""),
            "USER_KEY": settings.appkey,
            "ENCRYPTION_KEY": os.environ.get("FIVEPAISA_ENCRYPTION_KEY", "")
        }
        
        client = FivePaisaClient(cred=cred)
        
        if settings.access_token and not settings.is_access_token_expired():
            client.set_access_token(settings.access_token, settings.broker_user_id)
        else:
            logger.warning("5paisa client created but requires authentication")
        
        return client
    
    def _create_samco_client(self, settings: BrokerSettings) -> Optional[Any]:
        """Create Samco client"""
        if not StockNoteConnector:
            logger.error("Samco SDK not available")
            return None
        
        client = StockNoteConnector()
        
        if settings.access_token and not settings.is_access_token_expired():
            # Set access token if available
            client.access_token = settings.access_token
        else:
            logger.warning("Samco client created but requires authentication")
        
        return client
    
    def get_all_configured_brokers(self) -> List[BrokerType]:
        """Get list of all configured brokers for the user"""
        configured = []
        for broker_type in BrokerType:
            if self.is_broker_configured(broker_type):
                configured.append(broker_type)
        return configured
    
    def get_broker_status(self, broker_type: BrokerType) -> Dict[str, Any]:
        """Get comprehensive status of a broker"""
        settings = self.get_broker_settings(broker_type)
        
        if not settings:
            return {
                'configured': False,
                'authenticated': False,
                'status': 'Not configured'
            }
        
        is_configured = self.is_broker_configured(broker_type)
        has_valid_token = settings.access_token and not settings.is_access_token_expired()
        
        status = "Ready"
        if not is_configured:
            status = "Incomplete configuration"
        elif not has_valid_token:
            status = "Authentication required"
        
        return {
            'configured': is_configured,
            'authenticated': has_valid_token,
            'status': status,
            'broker_user_id': settings.broker_user_id,
            'token_status': settings.get_token_status() if settings else None
        }
    
    def refresh_access_token(self, broker_type: BrokerType) -> bool:
        """Refresh access token for the specified broker"""
        settings = self.get_broker_settings(broker_type)
        if not settings or not settings.refresh_token:
            return False
        
        try:
            if broker_type == BrokerType.FYERS:
                return self._refresh_fyers_token(settings)
            elif broker_type == BrokerType.ZERODHA:
                return self._refresh_zerodha_token(settings)
            elif broker_type == BrokerType.UPSTOX:
                return self._refresh_upstox_token(settings)
            # 5paisa and Samco typically don't use refresh tokens
            
        except Exception as e:
            logger.error(f"Failed to refresh token for {broker_type.value}: {str(e)}")
        
        return False
    
    def _refresh_fyers_token(self, settings: BrokerSettings) -> bool:
        """Refresh Fyers access token using Fyers API v3 refresh flow"""
        try:
            # Import the refresh function from broker_settings
            from APP_Routes.broker_settings import _fyers_refresh
            
            # Call the working refresh function
            new_access_token = _fyers_refresh(settings)
            
            # Update the database with the new token
            settings.access_token = new_access_token
            settings.access_token_created_at = datetime.utcnow()
            
            # Commit changes to database
            from app import db
            db.session.commit()
            
            # Clear cached client to ensure new token is used
            self.clear_client_cache(BrokerType.FYERS)
            
            logger.info(f"Successfully refreshed Fyers access token for {settings.broker_user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to refresh Fyers token: {str(e)}")
            return False
    
    def _refresh_zerodha_token(self, settings: BrokerSettings) -> bool:
        """Refresh Zerodha access token"""
        # Zerodha tokens are daily tokens that need to be regenerated
        # This would need login flow re-authentication
        return False
    
    def _refresh_upstox_token(self, settings: BrokerSettings) -> bool:
        """Refresh Upstox access token"""
        # Implementation depends on Upstox refresh token flow
        return False
    
    def clear_client_cache(self, broker_type: Optional[BrokerType] = None):
        """Clear cached clients"""
        if broker_type:
            self._clients.pop(broker_type, None)
        else:
            self._clients.clear()