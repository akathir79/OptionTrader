"""
Fyers API v3 Service
Dedicated service for Fyers broker integration with complete functionality
"""

import os
import logging
import json
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from urllib.parse import parse_qs, urlparse
import requests

from flask import session
from fyers_apiv3 import fyersModel
from app import db
from models import BrokerSettings

logger = logging.getLogger(__name__)


class FyersService:
    """Complete Fyers API v3 integration service"""
    
    def __init__(self, user_id: int = 0):
        self.user_id = user_id
        self.client = None
        self._settings = None
    
    def get_required_credentials(self) -> Dict[str, str]:
        """Get required credentials for Fyers setup"""
        return {
            'client_id': 'Your Fyers Client ID (App ID)',
            'secret_key': 'Your Fyers Secret Key',
            'redirect_uri': 'Redirect URI (must match registered URI)',
        }
    
    def save_configuration(self, config: Dict[str, Any]) -> BrokerSettings:
        """Save Fyers configuration to database"""
        settings = self.get_settings()
        
        if not settings:
            settings = BrokerSettings()
            settings.user_id = self.user_id
            settings.brokername = 'FYERS'
        
        # Map config to database fields
        settings.clientid = config.get('client_id', '')
        settings.appkey = config.get('secret_key', '')  # Using appkey field for secret
        settings.redirect_url = config.get('redirect_uri', '')
        # Set broker_user_id to avoid non-nullable constraint (will be updated during auth)
        if not settings.broker_user_id:
            settings.broker_user_id = 'pending'
        
        db.session.add(settings)
        db.session.commit()
        
        # Clear cached settings
        self._settings = None
        
        return settings
    
    def _generate_oauth_state(self) -> str:
        """Generate a random OAuth state for CSRF protection and store in session"""
        oauth_state = secrets.token_urlsafe(32)
        # Store in Flask session for persistence across requests
        session['fyers_oauth_state'] = oauth_state
        logger.info(f"Generated and stored OAuth state in session: {oauth_state[:8]}...")
        return oauth_state
    
    def get_settings(self) -> Optional[BrokerSettings]:
        """Get Fyers settings from database"""
        if not self._settings:
            self._settings = BrokerSettings.query.filter_by(
                user_id=self.user_id, 
                brokername='FYERS'
            ).first()
        return self._settings
    
    def is_configured(self) -> bool:
        """Check if Fyers is properly configured"""
        settings = self.get_settings()
        if not settings:
            return False
        
        required_fields = ['clientid', 'appkey', 'redirect_url']
        return all(getattr(settings, field) for field in required_fields)
    
    def get_auth_url(self) -> Optional[str]:
        """Generate Fyers OAuth authentication URL"""
        if not self.is_configured():
            logger.error("Fyers not configured. Cannot generate auth URL.")
            return None
        
        try:
            settings = self.get_settings()
            if not settings:
                logger.error("Fyers settings not found")
                return None
            
            app_session = fyersModel.SessionModel(
                client_id=settings.clientid,
                redirect_uri=settings.redirect_url,
                response_type="code",
                state=self._generate_oauth_state(),
                secret_key=settings.appkey,
                grant_type="authorization_code"
            )
            
            auth_url = app_session.generate_authcode()
            logger.info(f"Generated Fyers auth URL: {auth_url[:50]}...")
            
            return auth_url
            
        except Exception as e:
            logger.error(f"Failed to generate Fyers auth URL: {str(e)}")
            return None
    
    def handle_callback(self, callback_url: str) -> Tuple[bool, str, Dict[str, Any]]:
        """Handle OAuth callback and exchange code for access token with CSRF protection"""
        try:
            # Parse callback URL to extract authorization code and state
            parsed = urlparse(callback_url)
            query_params = parse_qs(parsed.query)
            
            auth_code = query_params.get('auth_code', [None])[0]
            callback_state = query_params.get('state', [None])[0]
            
            if not auth_code:
                return False, "Authorization code not found in callback", {}
            
            # CRITICAL SECURITY: Validate OAuth state for CSRF protection
            stored_state = session.get('fyers_oauth_state')
            if not stored_state:
                logger.error("No OAuth state found in session - possible CSRF attack")
                return False, "OAuth state validation failed - no stored state", {}
            
            if not callback_state:
                logger.error("No state parameter in callback URL - possible CSRF attack")
                return False, "OAuth state validation failed - no callback state", {}
            
            if callback_state != stored_state:
                logger.error(f"OAuth state mismatch - stored: {stored_state[:8]}..., callback: {callback_state[:8]}...")
                # Clear the compromised state
                session.pop('fyers_oauth_state', None)
                return False, "OAuth state validation failed - state mismatch (CSRF protection)", {}
            
            logger.info("OAuth state validation successful")
            
            settings = self.get_settings()
            if not settings:
                return False, "Fyers configuration not found", {}
            
            # Exchange authorization code for access token
            app_session = fyersModel.SessionModel(
                client_id=settings.clientid,
                redirect_uri=settings.redirect_url,
                response_type="code",
                state=stored_state,
                secret_key=settings.appkey,
                grant_type="authorization_code"
            )
            
            app_session.set_token(auth_code)
            response = app_session.generate_token()
            
            if response['s'] == 'ok':
                # Save access token to database
                access_token = response['access_token']
                settings.access_token = access_token
                settings.access_token_created_at = datetime.utcnow()
                
                # Clear cached client to prevent stale cached clients
                self.client = None
                
                # Get user profile to save user details
                fyers = fyersModel.FyersModel(
                    client_id=settings.clientid,
                    token=access_token
                )
                
                profile_response = fyers.get_profile()
                if profile_response['s'] == 'ok':
                    profile_data = profile_response['data']
                    settings.broker_user_id = profile_data.get('fy_id', '')
                    settings.useremail = profile_data.get('email_id', '')
                
                db.session.commit()
                
                # Clear OAuth state after successful authentication
                session.pop('fyers_oauth_state', None)
                logger.info("OAuth state cleared after successful authentication")
                
                return True, "Fyers authentication successful", {
                    'access_token': access_token,
                    'user_id': settings.broker_user_id,
                    'email': settings.useremail
                }
            else:
                # Clear OAuth state on token generation failure
                session.pop('fyers_oauth_state', None)
                return False, f"Token generation failed: {response.get('message', 'Unknown error')}", {}
                
        except Exception as e:
            logger.error(f"Fyers callback handling failed: {str(e)}")
            # Clear OAuth state on exception
            session.pop('fyers_oauth_state', None)
            return False, f"Authentication failed: {str(e)}", {}
    
    def get_client(self) -> Optional[fyersModel.FyersModel]:
        """Get authenticated Fyers client"""
        if self.client:
            return self.client
        
        settings = self.get_settings()
        if not settings or not settings.access_token:
            logger.error("No valid access token found")
            return None
        
        # Check if token is expired (Fyers tokens expire daily)
        if self.is_token_expired():
            logger.warning("Access token expired")
            return None
        
        try:
            self.client = fyersModel.FyersModel(
                client_id=settings.clientid,
                token=settings.access_token
            )
            
            return self.client
            
        except Exception as e:
            logger.error(f"Failed to create Fyers client: {str(e)}")
            return None
    
    def is_token_expired(self) -> bool:
        """Check if access token is expired"""
        settings = self.get_settings()
        if not settings:
            return True
        
        # Use the proper model method for token expiry check
        return settings.is_access_token_expired()
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get current connection status"""
        settings = self.get_settings()
        if not settings:
            return {
                'status': 'not_configured',
                'message': 'Fyers not configured'
            }
        
        if not settings.access_token:
            return {
                'status': 'not_authenticated',
                'message': 'Authentication required'
            }
        
        if self.is_token_expired():
            return {
                'status': 'token_expired',
                'message': 'Access token expired - re-authentication required'
            }
        
        # Test API connection
        client = self.get_client()
        if not client:
            return {
                'status': 'connection_failed',
                'message': 'Failed to create API client'
            }
        
        try:
            # Test API call
            response = client.get_profile()
            if response['s'] == 'ok':
                return {
                    'status': 'connected',
                    'message': 'Successfully connected to Fyers',
                    'user_id': settings.broker_user_id,
                    'email': settings.useremail
                }
            else:
                return {
                    'status': 'api_error',
                    'message': f"API Error: {response.get('message', 'Unknown error')}"
                }
                
        except Exception as e:
            return {
                'status': 'connection_error',
                'message': f"Connection test failed: {str(e)}"
            }
    
    # Market Data Methods
    def get_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """Get real-time quotes for symbols"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            symbol_string = ','.join(symbols)
            response = client.quotes({"symbols": symbol_string})
            return response
        except Exception as e:
            logger.error(f"Failed to get quotes: {str(e)}")
            return {'error': str(e)}
    
    def get_historical_data(self, symbol: str, timeframe: str, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get historical data for a symbol"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            data = {
                "symbol": symbol,
                "resolution": timeframe,
                "date_format": "1",
                "range_from": start_date,
                "range_to": end_date,
                "cont_flag": "1"
            }
            response = client.history(data=data)
            return response
        except Exception as e:
            logger.error(f"Failed to get historical data: {str(e)}")
            return {'error': str(e)}
    
    # Portfolio Methods  
    def get_positions(self) -> Dict[str, Any]:
        """Get current positions"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            response = client.positions()
            return response
        except Exception as e:
            logger.error(f"Failed to get positions: {str(e)}")
            return {'error': str(e)}
    
    def get_holdings(self) -> Dict[str, Any]:
        """Get current holdings"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            response = client.holdings()
            return response
        except Exception as e:
            logger.error(f"Failed to get holdings: {str(e)}")
            return {'error': str(e)}
    
    def get_funds(self) -> Dict[str, Any]:
        """Get account funds information"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            response = client.funds()
            return response
        except Exception as e:
            logger.error(f"Failed to get funds: {str(e)}")
            return {'error': str(e)}
    
    # Order Management Methods
    def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Place a new order"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            response = client.place_order(order_data)
            return response
        except Exception as e:
            logger.error(f"Failed to place order: {str(e)}")
            return {'error': str(e)}
    
    def modify_order(self, order_id: str, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Modify an existing order"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            order_data['id'] = order_id
            response = client.modify_order(order_data)
            return response
        except Exception as e:
            logger.error(f"Failed to modify order: {str(e)}")
            return {'error': str(e)}
    
    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            data = {"id": order_id}
            response = client.cancel_order(data)
            return response
        except Exception as e:
            logger.error(f"Failed to cancel order: {str(e)}")
            return {'error': str(e)}
    
    def get_orderbook(self) -> Dict[str, Any]:
        """Get order book (all orders)"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            response = client.orderbook()
            return response
        except Exception as e:
            logger.error(f"Failed to get orderbook: {str(e)}")
            return {'error': str(e)}
    
    def get_tradebook(self) -> Dict[str, Any]:
        """Get trade book (executed trades)"""
        client = self.get_client()
        if not client:
            return {'error': 'Client not available'}
        
        try:
            response = client.tradebook()
            return response
        except Exception as e:
            logger.error(f"Failed to get tradebook: {str(e)}")
            return {'error': str(e)}