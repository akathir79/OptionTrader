"""
VIX API endpoints for India VIX analysis and real-time data
"""

from flask import Blueprint, jsonify, request
import logging
from services.vix_service import VixService

logger = logging.getLogger(__name__)

vix_bp = Blueprint('vix_api', __name__, url_prefix='/api/vix')


@vix_bp.route('/current', methods=['GET'])
def get_current_vix():
    """Get real-time India VIX data"""
    try:
        vix_service = VixService()
        vix_data = vix_service.get_real_time_vix()
        
        if vix_data:
            return jsonify({
                'status': 'success',
                'data': vix_data
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Unable to fetch VIX data'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in current VIX API: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@vix_bp.route('/analysis', methods=['GET'])
def get_comprehensive_analysis():
    """Get comprehensive VIX analysis including historical and predictions"""
    try:
        vix_service = VixService()
        analysis = vix_service.get_comprehensive_analysis()
        
        return jsonify(analysis)
        
    except Exception as e:
        logger.error(f"Error in VIX analysis API: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@vix_bp.route('/historical/<int:days>', methods=['GET'])
def get_historical_vix(days):
    """Get historical VIX data for specified number of days"""
    try:
        if days > 365:  # Limit to 1 year
            days = 365
        
        vix_service = VixService()
        historical_data = vix_service.get_historical_vix_data(days)
        
        if historical_data:
            return jsonify({
                'status': 'success',
                'data': {
                    'dates': historical_data.dates,
                    'vix_values': historical_data.vix_values,
                    'nifty_values': historical_data.nifty_values,
                    'call_premiums': historical_data.call_premiums,
                    'put_premiums': historical_data.put_premiums,
                    'volume_data': historical_data.volume_data
                }
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Unable to fetch historical VIX data'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in historical VIX API: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@vix_bp.route('/predictions/<int:days>', methods=['GET'])
def get_vix_predictions(days):
    """Get VIX predictions for specified number of days"""
    try:
        if days > 90:  # Limit to 3 months
            days = 90
        
        vix_service = VixService()
        
        # Get historical data first
        historical_data = vix_service.get_historical_vix_data(30)
        if not historical_data:
            return jsonify({
                'status': 'error',
                'message': 'Unable to fetch historical data for predictions'
            }), 500
        
        # Generate predictions
        predictions = vix_service.predict_future_vix(historical_data, days)
        
        return jsonify({
            'status': 'success',
            'data': {
                'predicted_vix': predictions.predicted_vix,
                'prediction_dates': predictions.prediction_dates,
                'confidence_bands': predictions.confidence_bands,
                'mean_reversion_timeline': predictions.mean_reversion_timeline,
                'probability_scenarios': predictions.probability_scenarios
            }
        })
        
    except Exception as e:
        logger.error(f"Error in VIX predictions API: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500