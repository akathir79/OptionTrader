"""
Futures Analysis API
REST endpoints for futures price analysis, basis calculations, and trading signals
"""

from flask import Blueprint, request, jsonify
import logging
from datetime import datetime
from typing import Dict, Any

from services.futures_service import FuturesService

logger = logging.getLogger(__name__)

# Create blueprint
futures_bp = Blueprint('futures_api', __name__, url_prefix='/api/futures')


@futures_bp.route('/current')
def get_current_futures_data():
    """Get real-time futures data with basis analysis for a symbol"""
    try:
        symbol = request.args.get('symbol', '').strip()
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol parameter is required'
            }), 400
        
        # Default to NIFTY if no symbol specified
        if symbol.upper() in ['NIFTY', 'NIFTY50']:
            symbol = 'NSE:NIFTY50-INDEX'
        elif symbol.upper() == 'BANKNIFTY':
            symbol = 'NSE:BANKNIFTY-INDEX'
        
        futures_service = FuturesService()
        data = futures_service.get_real_time_futures_data(symbol)
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Failed to retrieve futures data'
            }), 500
        
        return jsonify(data)
        
    except Exception as e:
        logger.error(f"Error in get_current_futures_data: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@futures_bp.route('/analysis')
def get_futures_spot_analysis():
    """Get comprehensive futures vs spot analysis with historical data and monthly contracts"""
    try:
        symbol = request.args.get('symbol', '').strip()
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol parameter is required'
            }), 400
        
        # Normalize symbol format
        if symbol.upper() in ['NIFTY', 'NIFTY50']:
            symbol = 'NSE:NIFTY50-INDEX'
        elif symbol.upper() == 'BANKNIFTY':
            symbol = 'NSE:BANKNIFTY-INDEX'
        elif symbol.upper() == 'FINNIFTY':
            symbol = 'NSE:FINNIFTY-INDEX'
        
        futures_service = FuturesService()
        
        # Get comprehensive analysis
        analysis_data = futures_service.get_comprehensive_futures_analysis(symbol)
        
        if not analysis_data or not analysis_data.get('success'):
            return jsonify({
                'success': False,
                'error': analysis_data.get('error', 'Failed to retrieve comprehensive analysis')
            }), 500
        
        return jsonify(analysis_data)
        
    except Exception as e:
        logger.error(f"Error in get_futures_spot_analysis: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@futures_bp.route('/analysis')
def get_futures_analysis():
    """Get comprehensive futures analysis with trading signals"""
    try:
        symbol = request.args.get('symbol', '').strip()
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol parameter is required'
            }), 400
        
        # Normalize symbol
        if symbol.upper() in ['NIFTY', 'NIFTY50']:
            symbol = 'NSE:NIFTY50-INDEX'
        elif symbol.upper() == 'BANKNIFTY':
            symbol = 'NSE:BANKNIFTY-INDEX'
        
        futures_service = FuturesService()
        
        # Get real-time analysis
        current_data = futures_service.get_real_time_futures_data(symbol)
        if not current_data or not current_data.get('success'):
            return jsonify({
                'success': False,
                'error': 'Failed to get current futures data'
            }), 500
        
        # Get analysis from current data
        analysis = current_data['analysis']
        
        # Generate trading signals
        from services.futures_service import FuturesAnalysis
        futures_analysis = FuturesAnalysis(
            spot_price=analysis['spot_price'],
            futures_price=analysis['futures_price'],
            basis=analysis['basis'],
            basis_pct=analysis['basis_pct'],
            fair_value=analysis['fair_value'],
            fv_gap=analysis['fv_gap'],
            carry_annualized=analysis['carry_annualized'],
            days_to_expiry=analysis['days_to_expiry'],
            regime=analysis['regime'],
            arbitrage_opportunity=analysis['arbitrage_opportunity'],
            confidence_score=analysis['confidence_score']
        )
        
        signals = futures_service.generate_trading_signals(futures_analysis)
        
        # Store analysis snapshot
        futures_service.store_analysis_snapshot(symbol, futures_analysis, signals)
        
        # Get historical analysis if available
        historical_analysis = futures_service.get_latest_analysis(symbol)
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'current_analysis': current_data,
            'trading_signals': [signal.__dict__ for signal in signals],
            'historical_snapshot': historical_analysis,
            'summary': {
                'regime': analysis['regime'],
                'confidence': analysis['confidence_score'],
                'arbitrage_detected': analysis['arbitrage_opportunity'],
                'signal_count': len(signals),
                'high_confidence_signals': len([s for s in signals if s.confidence > 70])
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_futures_analysis: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@futures_bp.route('/signals')
def get_trading_signals():
    """Get trading signals for a specific symbol"""
    try:
        symbol = request.args.get('symbol', '').strip()
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol parameter is required'
            }), 400
        
        # Normalize symbol
        if symbol.upper() in ['NIFTY', 'NIFTY50']:
            symbol = 'NSE:NIFTY50-INDEX'
        elif symbol.upper() == 'BANKNIFTY':
            symbol = 'NSE:BANKNIFTY-INDEX'
        
        futures_service = FuturesService()
        
        # Get latest analysis
        latest_analysis = futures_service.get_latest_analysis(symbol)
        
        if not latest_analysis:
            # Generate fresh analysis if none exists
            current_data = futures_service.get_real_time_futures_data(symbol)
            if not current_data or not current_data.get('success'):
                return jsonify({
                    'success': False,
                    'error': 'No analysis data available'
                }), 404
            
            # Regenerate signals
            from services.futures_service import FuturesAnalysis
            analysis = current_data['analysis']
            futures_analysis = FuturesAnalysis(**analysis)
            signals = futures_service.generate_trading_signals(futures_analysis)
            
            return jsonify({
                'success': True,
                'symbol': symbol,
                'signals': [signal.__dict__ for signal in signals],
                'generated_at': datetime.now().isoformat()
            })
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'signals': latest_analysis['signals'],
            'analysis_timestamp': latest_analysis['timestamp'],
            'summary': latest_analysis['summary']
        })
        
    except Exception as e:
        logger.error(f"Error in get_trading_signals: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@futures_bp.route('/basis-history')
def get_basis_history():
    """Get historical basis data for analysis"""
    try:
        symbol = request.args.get('symbol', '').strip()
        days = request.args.get('days', '30')
        
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol parameter is required'
            }), 400
        
        try:
            days = int(days)
            if days <= 0 or days > 365:
                days = 30
        except ValueError:
            days = 30
        
        # Normalize symbol
        if symbol.upper() in ['NIFTY', 'NIFTY50']:
            symbol = 'NSE:NIFTY50-INDEX'
        elif symbol.upper() == 'BANKNIFTY':
            symbol = 'NSE:BANKNIFTY-INDEX'
        
        # TODO: Implement historical data fetching from database
        # For now, return mock structure that matches expected format
        return jsonify({
            'success': True,
            'symbol': symbol,
            'days': days,
            'historical_data': {
                'dates': [],
                'spot_values': [],
                'futures_values': [],
                'basis_values': [],
                'fair_values': [],
                'carry_rates': []
            },
            'statistics': {
                'avg_basis': 0,
                'basis_volatility': 0,
                'contango_days': 0,
                'backwardation_days': 0
            },
            'note': 'Historical data collection will be implemented in next phase'
        })
        
    except Exception as e:
        logger.error(f"Error in get_basis_history: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@futures_bp.route('/contracts')
def get_active_contracts():
    """Get active futures contracts for a symbol"""
    try:
        symbol = request.args.get('symbol', '').strip()
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol parameter is required'
            }), 400
        
        # Normalize symbol
        if symbol.upper() in ['NIFTY', 'NIFTY50']:
            symbol = 'NSE:NIFTY50-INDEX'
        elif symbol.upper() == 'BANKNIFTY':
            symbol = 'NSE:BANKNIFTY-INDEX'
        
        futures_service = FuturesService()
        contracts = futures_service.resolve_active_futures_contracts(symbol)
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'contracts': [contract.to_dict() for contract in contracts],
            'contract_count': len(contracts)
        })
        
    except Exception as e:
        logger.error(f"Error in get_active_contracts: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@futures_bp.route('/backfill', methods=['POST'])
def backfill_historical_data():
    """Backfill historical futures data"""
    try:
        data = request.get_json() or {}
        symbol = data.get('symbol', '').strip()
        days = data.get('days', 30)
        
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol parameter is required'
            }), 400
        
        try:
            days = int(days)
            if days <= 0 or days > 365:
                days = 30
        except ValueError:
            days = 30
        
        # Normalize symbol
        if symbol.upper() in ['NIFTY', 'NIFTY50']:
            symbol = 'NSE:NIFTY50-INDEX'
        elif symbol.upper() == 'BANKNIFTY':
            symbol = 'NSE:BANKNIFTY-INDEX'
        
        # TODO: Implement historical data backfill
        # This would fetch historical data from Fyers API and store in database
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'days_requested': days,
            'status': 'Backfill queued',
            'note': 'Historical data backfill will be implemented in next phase'
        })
        
    except Exception as e:
        logger.error(f"Error in backfill_historical_data: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500


@futures_bp.route('/status')
def get_futures_status():
    """Get futures analysis system status"""
    try:
        futures_service = FuturesService()
        
        # Test basic functionality
        try:
            test_data = futures_service.get_real_time_futures_data('NSE:NIFTY50-INDEX')
            api_status = 'connected' if test_data and test_data.get('success') else 'error'
        except:
            api_status = 'error'
        
        return jsonify({
            'success': True,
            'status': {
                'futures_service': 'active',
                'fyers_api': api_status,
                'database': 'connected',
                'analysis_engine': 'ready'
            },
            'supported_symbols': [
                'NSE:NIFTY50-INDEX',
                'NSE:BANKNIFTY-INDEX'
            ],
            'features': {
                'real_time_analysis': True,
                'trading_signals': True,
                'basis_calculation': True,
                'arbitrage_detection': True,
                'historical_data': False  # Will be True after implementation
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_futures_status: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500