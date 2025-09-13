"""
Broker Authentication Service
Handles OAuth flows and token management for all supported brokers
"""

import os
import logging
import webbrowser
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from urllib.parse import parse_qs, urlparse
import requests

from services.broker_service import BrokerService, BrokerType
from models import BrokerSettings
from app import db

logger = logging.getLogger(__name__)


class BrokerAuthService:
    """Handles authentication flows for all supported brokers"""
    
    def __init__(self, user_id: int = 0):
        self.user_id = user_id
        self.broker_service = BrokerService(user_id)
    
    def get_auth_url(self, broker_type: BrokerType, config: Dict[str, Any]) -> Optional[str]:
        """Generate authentication URL for the specified broker"""
        try:
            if broker_type == BrokerType.FYERS:
                return self._get_fyers_auth_url(config)
            elif broker_type == BrokerType.ZERODHA:
                return self._get_zerodha_auth_url(config)
            elif broker_type == BrokerType.UPSTOX:
                return self._get_upstox_auth_url(config)
            elif broker_type == BrokerType.FIVEPAISA:
                return self._get_5paisa_auth_url(config)
            elif broker_type == BrokerType.SAMCO:
                # Samco uses direct login, no OAuth URL needed
                return None
                
        except Exception as e:
            logger.error(f"Failed to generate auth URL for {broker_type.value}: {str(e)}")
        
        return None
    
    def _get_fyers_auth_url(self, config: Dict[str, Any]) -> str:
        """Generate Fyers OAuth URL"""
        from fyers_apiv3 import fyersModel
        
        app_session = fyersModel.SessionModel(
            client_id=config['client_id'],
            redirect_uri=config['redirect_uri'],
            response_type="code",
            state="sample",
            secret_key=config['secret_key'],
            grant_type="authorization_code"
        )
        
        return app_session.generate_authcode()
    
    def _get_zerodha_auth_url(self, config: Dict[str, Any]) -> str:
        """Generate Zerodha OAuth URL"""
        from kiteconnect import KiteConnect
        
        kite = KiteConnect(api_key=config['api_key'])
        return kite.login_url()
    
    def _get_upstox_auth_url(self, config: Dict[str, Any]) -> str:
        """Generate Upstox OAuth URL"""
        base_url = "https://api.upstox.com/v2/login/authorization/dialog"
        params = {
            'response_type': 'code',
            'client_id': config['api_key'],
            'redirect_uri': config['redirect_uri'],
            'state': 'sample_state'
        }
        
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"
    
    def _get_5paisa_auth_url(self, config: Dict[str, Any]) -> str:
        """Generate 5paisa OAuth URL"""
        base_url = "https://dev-openapi.5paisa.com/WebVendorLogin/VLogin/Index"
        params = {
            'VendorKey': config['user_key'],
            'ResponseURL': config['redirect_uri']
        }
        
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"
    
    def handle_auth_callback(self, broker_type: BrokerType, auth_code: str, 
                           config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Handle authentication callback and generate access token"""
        try:
            if broker_type == BrokerType.FYERS:
                return self._handle_fyers_callback(auth_code, config)
            elif broker_type == BrokerType.ZERODHA:
                return self._handle_zerodha_callback(auth_code, config)
            elif broker_type == BrokerType.UPSTOX:
                return self._handle_upstox_callback(auth_code, config)
            elif broker_type == BrokerType.FIVEPAISA:
                return self._handle_5paisa_callback(auth_code, config)
            elif broker_type == BrokerType.SAMCO:
                return self._handle_samco_login(config)
                
        except Exception as e:
            logger.error(f"Failed to handle auth callback for {broker_type.value}: {str(e)}")
            return False, f"Authentication failed: {str(e)}", {}
        
        return False, "Unsupported broker type", {}
    
    def _handle_fyers_callback(self, auth_code: str, config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Handle Fyers authentication callback"""
        from fyers_apiv3 import fyersModel
        
        app_session = fyersModel.SessionModel(
            client_id=config['client_id'],
            redirect_uri=config['redirect_uri'],
            response_type="code",
            state="sample",
            secret_key=config['secret_key'],
            grant_type="authorization_code"
        )
        
        app_session.set_token(auth_code)
        response = app_session.generate_token()
        
        if response.get('s') == 'ok':
            access_token = response['access_token']
            
            # Save to database
            broker_config = {
                'clientid': config['client_id'],
                'appkey': config['secret_key'],
                'redirect_url': config['redirect_uri'],
                'access_token': access_token,
                'broker_user_id': config.get('user_id', '')
            }
            
            self.broker_service.save_broker_settings(BrokerType.FYERS, broker_config)
            
            return True, "Fyers authentication successful", {'access_token': access_token}
        
        return False, f"Fyers authentication failed: {response.get('message', 'Unknown error')}", {}
    
    def _handle_zerodha_callback(self, request_token: str, config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Handle Zerodha authentication callback"""
        from kiteconnect import KiteConnect
        
        kite = KiteConnect(api_key=config['api_key'])
        data = kite.generate_session(request_token, api_secret=config['api_secret'])
        
        access_token = data['access_token']
        
        # Save to database
        broker_config = {
            'appkey': config['api_key'],
            'access_token': access_token,
            'broker_user_id': data.get('user_id', ''),
            'useremail': data.get('email', '')
        }
        
        self.broker_service.save_broker_settings(BrokerType.ZERODHA, broker_config)
        
        return True, "Zerodha authentication successful", data
    
    def _handle_upstox_callback(self, auth_code: str, config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Handle Upstox authentication callback"""
        import upstox_client
        
        # Token exchange
        token_url = "https://api.upstox.com/v2/login/authorization/token"
        payload = {
            'code': auth_code,
            'client_id': config['api_key'],
            'client_secret': config['api_secret'],
            'redirect_uri': config['redirect_uri'],
            'grant_type': 'authorization_code'
        }
        
        response = requests.post(token_url, data=payload)
        response.raise_for_status()
        
        token_data = response.json()
        access_token = token_data['access_token']
        
        # Save to database
        broker_config = {
            'appkey': config['api_key'],
            'access_token': access_token,
            'broker_user_id': config.get('user_id', '')
        }
        
        self.broker_service.save_broker_settings(BrokerType.UPSTOX, broker_config)
        
        return True, "Upstox authentication successful", token_data
    
    def _handle_5paisa_callback(self, response_token: str, config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Handle 5paisa authentication callback"""
        from py5paisa import FivePaisaClient
        
        cred = {
            "APP_NAME": config['app_name'],
            "APP_SOURCE": config['app_source'],
            "USER_ID": config['user_id'],
            "PASSWORD": config['password'],
            "USER_KEY": config['user_key'],
            "ENCRYPTION_KEY": config['encryption_key']
        }
        
        client = FivePaisaClient(cred=cred)
        result = client.get_oauth_session(response_token)
        
        if "Logged in!!" in str(result):
            # Save to database
            broker_config = {
                'app_name': config['app_name'],
                'app_source': config['app_source'],
                'broker_user_id': config['user_id'],
                'appkey': config['user_key'],
                'access_token': 'oauth_authenticated'  # 5paisa doesn't return explicit token
            }
            
            self.broker_service.save_broker_settings(BrokerType.FIVEPAISA, broker_config)
            
            return True, "5paisa authentication successful", {'status': 'authenticated'}
        
        return False, "5paisa authentication failed", {}
    
    def _handle_samco_login(self, config: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """Handle Samco direct login"""
        try:
            from snapi_py_client.snapi_bridge import StockNoteConnector
        except ImportError:
            from stocknotebridge import StockNoteConnector
        
        samco = StockNoteConnector()
        login_result = samco.login(body={
            "userId": config['user_id'],
            "password": config['password'],
            "yob": config['year_of_birth']
        })
        
        if login_result.get('status') == 'success':
            session_token = login_result.get('sessionToken', '')
            
            # Save to database
            broker_config = {
                'broker_user_id': config['user_id'],
                'access_token': session_token
            }
            
            self.broker_service.save_broker_settings(BrokerType.SAMCO, broker_config)
            
            return True, "Samco authentication successful", login_result
        
        return False, f"Samco authentication failed: {login_result.get('message', 'Unknown error')}", {}
    
    def authenticate_with_totp(self, broker_type: BrokerType, 
                              client_code: str, totp: str, pin: str) -> Tuple[bool, str, Dict[str, Any]]:
        """Authenticate using TOTP (for brokers that support it)"""
        try:
            if broker_type == BrokerType.FIVEPAISA:
                return self._authenticate_5paisa_totp(client_code, totp, pin)
        except Exception as e:
            logger.error(f"TOTP authentication failed for {broker_type.value}: {str(e)}")
            return False, f"TOTP authentication failed: {str(e)}", {}
        
        return False, "TOTP authentication not supported for this broker", {}
    
    def _authenticate_5paisa_totp(self, client_code: str, totp: str, pin: str) -> Tuple[bool, str, Dict[str, Any]]:
        """Authenticate 5paisa using TOTP"""
        from py5paisa import FivePaisaClient
        
        # Get existing settings to reuse credentials
        settings = self.broker_service.get_broker_settings(BrokerType.FIVEPAISA)
        if not settings:
            return False, "5paisa not configured", {}
        
        cred = {
            "APP_NAME": settings.app_name,
            "APP_SOURCE": settings.app_source,
            "USER_ID": client_code,
            "PASSWORD": os.environ.get("FIVEPAISA_PASSWORD", ""),
            "USER_KEY": settings.appkey,
            "ENCRYPTION_KEY": os.environ.get("FIVEPAISA_ENCRYPTION_KEY", "")
        }
        
        client = FivePaisaClient(cred=cred)
        result = client.get_totp_session(client_code, totp, pin)
        
        if "Logged in!!" in str(result):
            # Update settings
            settings.access_token = 'totp_authenticated'
            settings.access_token_created_at = datetime.utcnow()
            db.session.commit()
            
            return True, "5paisa TOTP authentication successful", {'status': 'authenticated'}
        
        return False, "5paisa TOTP authentication failed", {}
    
    def logout_broker(self, broker_type: BrokerType) -> bool:
        """Logout and clear tokens for specified broker"""
        settings = self.broker_service.get_broker_settings(broker_type)
        if settings:
            settings.access_token = None
            settings.refresh_token = None
            settings.access_token_created_at = None
            settings.refresh_token_created_at = None
            db.session.commit()
            
            # Clear cached client
            self.broker_service.clear_client_cache(broker_type)
            
            return True
        
        return False
    
    def get_required_credentials(self, broker_type: BrokerType) -> Dict[str, Any]:
        """Get required credential fields for each broker"""
        credential_requirements = {
            BrokerType.FYERS: {
                'fields': ['client_id', 'secret_key', 'redirect_uri'],
                'auth_type': 'oauth',
                'description': 'Create app at myapi.fyers.in and get client ID and secret key'
            },
            BrokerType.ZERODHA: {
                'fields': ['api_key', 'api_secret'],
                'auth_type': 'oauth',
                'description': 'Register at developers.kite.trade to get API key and secret'
            },
            BrokerType.UPSTOX: {
                'fields': ['api_key', 'api_secret', 'redirect_uri'],
                'auth_type': 'oauth',
                'description': 'Create app at upstox.com/developer to get API credentials'
            },
            BrokerType.FIVEPAISA: {
                'fields': ['app_name', 'app_source', 'user_id', 'user_key', 'encryption_key', 'password'],
                'auth_type': 'oauth_or_totp',
                'description': 'Get API keys from 5paisa Developer API section'
            },
            BrokerType.SAMCO: {
                'fields': ['user_id', 'password', 'year_of_birth'],
                'auth_type': 'direct',
                'description': 'Use your Samco trading account credentials'
            }
        }
        
        return credential_requirements.get(broker_type, {})