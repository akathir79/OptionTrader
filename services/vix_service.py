"""
India VIX Analysis Service
Comprehensive VIX analysis including real-time data, historical analysis, and predictions
Based on deep VIX research and trading insights
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import statistics
from dataclasses import dataclass

from services.fyers_service import FyersService

logger = logging.getLogger(__name__)


@dataclass
class VixAnalysis:
    """VIX Analysis data structure"""
    current_vix: float
    vix_change: float
    vix_change_percent: float
    market_sentiment: str  # "FEAR", "GREED", "NEUTRAL", "EXTREME_FEAR", "EXTREME_GREED"
    risk_level: str  # "LOW", "MEDIUM", "HIGH", "EXTREME"
    trading_signal: str  # "BUY_VOLATILITY", "SELL_VOLATILITY", "NEUTRAL", "CAUTION"
    mean_reversion_target: float
    volatility_regime: str  # "LOW_VOL", "NORMAL_VOL", "HIGH_VOL", "SPIKE"


@dataclass
class VixHistoricalData:
    """VIX Historical data structure"""
    dates: List[str]
    vix_values: List[float]
    nifty_values: List[float]
    call_premiums: List[float]
    put_premiums: List[float]
    volume_data: List[int]


@dataclass
class VixPrediction:
    """VIX Future prediction structure"""
    predicted_vix: List[float]
    prediction_dates: List[str]
    confidence_bands: Dict[str, List[float]]  # upper, lower
    mean_reversion_timeline: int  # days to revert to mean
    probability_scenarios: Dict[str, float]  # spike, decline, stable


class VixService:
    """Comprehensive India VIX analysis and prediction service"""
    
    # VIX interpretation thresholds based on historical analysis
    VIX_THRESHOLDS = {
        'extreme_low': 10,
        'low': 12,
        'normal_low': 15,
        'normal_high': 20,
        'high': 25,
        'extreme_high': 35
    }
    
    # Historical VIX mean (long-term average around 15-20)
    VIX_LONG_TERM_MEAN = 17.5
    
    def __init__(self, user_id: int = 0):
        self.user_id = user_id
        self.fyers_service = FyersService(user_id)
    
    def get_real_time_vix(self) -> Optional[Dict[str, Any]]:
        """Get real-time India VIX data from Fyers API - Always uses NIFTY 50 as baseline for analysis"""
        try:
            # Get client with automatic token refresh
            client = self.fyers_service.get_client()
            if not client:
                logger.error("Fyers client not available for VIX data even after refresh attempt")
                return self._get_fallback_vix_data()
            
            # Fyers India VIX symbol - independent of current selected symbol
            vix_symbol = "NSE:INDIAVIX-INDEX"
            
            response = client.quotes({"symbols": vix_symbol})
            
            # ⚠️ CRITICAL: Fyers API response structure - response['d'] is LIST, NOT dictionary!
            # Must access response['d'][0] first, then ['v'] for values - DO NOT modify!
            if response and response.get('s') == 'ok' and response.get('d') and len(response['d']) > 0:
                vix_data = response['d'][0]  # Get first element from list
                vix_values = vix_data.get('v', {})  # Get values dict
                
                current_vix = vix_values.get('lp', 0)
                logger.info(f"Successfully fetched live VIX data: {current_vix}")
                
                vix_result = {
                    'symbol': vix_symbol,
                    'ltp': current_vix,  # Last traded price
                    'change': vix_values.get('ch', 0),  # Change
                    'change_percent': vix_values.get('chp', 0),  # Change %
                    'open': vix_values.get('op', 0),
                    'high': vix_values.get('h', 0),
                    'low': vix_values.get('l', 0),
                    'volume': vix_values.get('volume', 0),
                    'timestamp': datetime.now().isoformat(),
                    'baseline_symbol': 'NSE:NIFTY50-INDEX',  # Always use NIFTY 50 as baseline
                    'analysis_note': 'Live VIX data analyzed against NIFTY 50 baseline regardless of selected symbol',
                    'is_fallback': False
                }
                
                return vix_result
            else:
                logger.error(f"Failed to get VIX data from API: {response}")
                return self._get_fallback_vix_data()
                
        except Exception as e:
            logger.error(f"Error fetching real-time VIX: {str(e)}")
            return self._get_fallback_vix_data()
    
    def _get_fallback_vix_data(self) -> Dict[str, Any]:
        """Provide fallback VIX data when API is unavailable - still references NIFTY 50 baseline"""
        logger.info("Using fallback VIX data with NIFTY 50 baseline")
        return {
            'symbol': 'NSE:INDIAVIX-INDEX',
            'ltp': 18.5,  # Reasonable fallback value near historical mean
            'change': 0.0,
            'change_percent': 0.0,
            'open': 18.5,
            'high': 19.0,
            'low': 18.0,
            'volume': 0,
            'timestamp': datetime.now().isoformat(),
            'baseline_symbol': 'NSE:NIFTY50-INDEX',  # Always use NIFTY 50 as baseline
            'analysis_note': 'Fallback VIX data - analysis always compares against NIFTY 50',
            'is_fallback': True
        }
    
    def get_historical_vix_data(self, days: int = 30) -> Optional[VixHistoricalData]:
        """Get historical VIX data for analysis"""
        try:
            client = self.fyers_service.get_client()
            if not client:
                return None
            
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Format dates for Fyers API
            start_date_str = start_date.strftime("%Y-%m-%d")
            end_date_str = end_date.strftime("%Y-%m-%d")
            
            vix_symbol = "NSE:INDIAVIX-INDEX"
            nifty_symbol = "NSE:NIFTY50-INDEX"
            
            # Get VIX historical data
            vix_data = client.history({
                "symbol": vix_symbol,
                "resolution": "D",
                "date_format": "1",
                "range_from": start_date_str,
                "range_to": end_date_str,
                "cont_flag": "1"
            })
            
            # Get Nifty historical data for correlation
            nifty_data = client.history({
                "symbol": nifty_symbol,
                "resolution": "D", 
                "date_format": "1",
                "range_from": start_date_str,
                "range_to": end_date_str,
                "cont_flag": "1"
            })
            
            if (vix_data and nifty_data and
                vix_data.get('s') == 'ok' and 
                nifty_data.get('s') == 'ok' and
                vix_data.get('candles') and 
                nifty_data.get('candles')):
                
                # Process VIX data
                vix_candles = vix_data['candles']
                nifty_candles = nifty_data['candles']
                
                dates = []
                vix_values = []
                nifty_values = []
                
                for i, candle in enumerate(vix_candles):
                    timestamp, open_price, high, low, close, volume = candle
                    date_str = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
                    dates.append(date_str)
                    vix_values.append(close)
                    
                    # Match with Nifty data
                    if i < len(nifty_candles):
                        nifty_close = nifty_candles[i][4]  # Close price
                        nifty_values.append(nifty_close)
                    else:
                        nifty_values.append(nifty_values[-1] if nifty_values else 0)
                
                # Simulate call/put premiums based on VIX (for demonstration)
                call_premiums = [self._estimate_option_premium(vix, nifty, 'CALL') 
                               for vix, nifty in zip(vix_values, nifty_values)]
                put_premiums = [self._estimate_option_premium(vix, nifty, 'PUT') 
                              for vix, nifty in zip(vix_values, nifty_values)]
                
                # Volume data from VIX candles
                volume_data = [candle[5] for candle in vix_candles]
                
                return VixHistoricalData(
                    dates=dates,
                    vix_values=vix_values,
                    nifty_values=nifty_values,
                    call_premiums=call_premiums,
                    put_premiums=put_premiums,
                    volume_data=volume_data
                )
            
        except Exception as e:
            logger.error(f"Error fetching historical VIX data: {str(e)}")
        
        return None
    
    def _estimate_option_premium(self, vix: float, underlying: float, option_type: str) -> float:
        """Estimate option premium based on VIX and underlying price"""
        # Simplified Black-Scholes premium estimation
        # In real implementation, would use actual option chain data
        base_premium = underlying * 0.02  # 2% of underlying as base
        volatility_multiplier = (vix / 20)  # Normalize around VIX=20
        
        if option_type == 'CALL':
            return base_premium * volatility_multiplier
        else:  # PUT
            return base_premium * volatility_multiplier * 1.1  # Puts slightly more expensive during fear
    
    def analyze_current_vix(self, current_data: Dict[str, Any]) -> VixAnalysis:
        """Comprehensive analysis of current VIX level"""
        current_vix = current_data.get('ltp', 0)
        vix_change = current_data.get('change', 0)
        vix_change_percent = current_data.get('change_percent', 0)
        
        # Determine market sentiment based on VIX level
        if current_vix >= self.VIX_THRESHOLDS['extreme_high']:
            sentiment = "EXTREME_FEAR"
            risk_level = "EXTREME"
            trading_signal = "BUY_VOLATILITY"
            volatility_regime = "SPIKE"
        elif current_vix >= self.VIX_THRESHOLDS['high']:
            sentiment = "FEAR"
            risk_level = "HIGH"
            trading_signal = "BUY_VOLATILITY"
            volatility_regime = "HIGH_VOL"
        elif current_vix >= self.VIX_THRESHOLDS['normal_high']:
            sentiment = "NEUTRAL"
            risk_level = "MEDIUM"
            trading_signal = "NEUTRAL"
            volatility_regime = "NORMAL_VOL"
        elif current_vix >= self.VIX_THRESHOLDS['normal_low']:
            sentiment = "NEUTRAL"
            risk_level = "MEDIUM"
            trading_signal = "NEUTRAL"
            volatility_regime = "NORMAL_VOL"
        elif current_vix >= self.VIX_THRESHOLDS['low']:
            sentiment = "GREED"
            risk_level = "LOW"
            trading_signal = "SELL_VOLATILITY"
            volatility_regime = "LOW_VOL"
        else:  # Below 12
            sentiment = "EXTREME_GREED"
            risk_level = "LOW"
            trading_signal = "CAUTION"  # Too low, potential for spike
            volatility_regime = "LOW_VOL"
        
        # Calculate mean reversion target
        mean_reversion_target = self._calculate_mean_reversion_target(current_vix)
        
        return VixAnalysis(
            current_vix=current_vix,
            vix_change=vix_change,
            vix_change_percent=vix_change_percent,
            market_sentiment=sentiment,
            risk_level=risk_level,
            trading_signal=trading_signal,
            mean_reversion_target=mean_reversion_target,
            volatility_regime=volatility_regime
        )
    
    def _calculate_mean_reversion_target(self, current_vix: float) -> float:
        """Calculate mean reversion target based on current VIX level"""
        if current_vix > 30:
            # Extreme high, strong reversion expected
            return self.VIX_LONG_TERM_MEAN * 1.2  # Slightly above mean
        elif current_vix > 25:
            return self.VIX_LONG_TERM_MEAN * 1.1
        elif current_vix < 10:
            # Extreme low, reversion upward expected
            return self.VIX_LONG_TERM_MEAN * 0.9
        elif current_vix < 12:
            return self.VIX_LONG_TERM_MEAN * 0.95
        else:
            return self.VIX_LONG_TERM_MEAN
    
    def predict_future_vix(self, historical_data: VixHistoricalData, days: int = 30) -> VixPrediction:
        """Predict future VIX using mean-reversion and volatility clustering models"""
        if not historical_data.vix_values:
            return VixPrediction([], [], {}, 0, {})
        
        vix_values = historical_data.vix_values
        current_vix = vix_values[-1]
        
        # Calculate volatility clustering - periods of high vol tend to cluster
        vix_changes = [vix_values[i] - vix_values[i-1] for i in range(1, len(vix_values))]
        volatility_of_vix = statistics.stdev(vix_changes) if len(vix_changes) > 1 else 1.0
        
        # Mean reversion speed (higher when further from mean)
        distance_from_mean = abs(current_vix - self.VIX_LONG_TERM_MEAN)
        reversion_speed = min(0.05 + (distance_from_mean * 0.01), 0.15)  # Cap at 15% per day
        
        predicted_vix = []
        prediction_dates = []
        
        # Generate predictions
        last_vix = current_vix
        base_date = datetime.now()
        
        for day in range(1, days + 1):
            # Mean reversion component
            reversion_component = (self.VIX_LONG_TERM_MEAN - last_vix) * reversion_speed
            
            # Random shock component (volatility clustering)
            shock_intensity = volatility_of_vix * 0.5  # Dampen for stability
            random_shock = np.random.normal(0, shock_intensity)
            
            # Prevent negative VIX
            predicted_value = max(5.0, last_vix + reversion_component + random_shock)
            
            predicted_vix.append(predicted_value)
            prediction_dates.append((base_date + timedelta(days=day)).strftime("%Y-%m-%d"))
            
            last_vix = predicted_value
        
        # Calculate confidence bands (±1 standard deviation)
        std_dev = volatility_of_vix * 1.5  # Wider bands for uncertainty
        upper_band = [p + std_dev for p in predicted_vix]
        lower_band = [max(5.0, p - std_dev) for p in predicted_vix]  # Prevent negative
        
        confidence_bands = {
            'upper': upper_band,
            'lower': lower_band
        }
        
        # Calculate reversion timeline
        reversion_timeline = self._calculate_reversion_timeline(current_vix)
        
        # Probability scenarios
        probability_scenarios = self._calculate_probability_scenarios(
            current_vix, predicted_vix, historical_data
        )
        
        return VixPrediction(
            predicted_vix=predicted_vix,
            prediction_dates=prediction_dates,
            confidence_bands=confidence_bands,
            mean_reversion_timeline=reversion_timeline,
            probability_scenarios=probability_scenarios
        )
    
    def _calculate_reversion_timeline(self, current_vix: float) -> int:
        """Calculate expected days for VIX to revert to mean"""
        distance = abs(current_vix - self.VIX_LONG_TERM_MEAN)
        
        if distance <= 2:
            return 5  # Already near mean
        elif distance <= 5:
            return 10  # Moderate distance
        elif distance <= 10:
            return 20  # Significant distance
        else:
            return 30  # Extreme distance
    
    def _calculate_probability_scenarios(self, current_vix: float, predicted_vix: List[float], 
                                       historical_data: VixHistoricalData) -> Dict[str, float]:
        """Calculate probability of different VIX scenarios"""
        if not predicted_vix:
            return {'spike': 0.2, 'decline': 0.3, 'stable': 0.5}
        
        max_predicted = max(predicted_vix)
        min_predicted = min(predicted_vix)
        avg_predicted = sum(predicted_vix) / len(predicted_vix)
        
        # Historical volatility context
        historical_high = max(historical_data.vix_values) if historical_data.vix_values else 30
        historical_low = min(historical_data.vix_values) if historical_data.vix_values else 10
        
        # Calculate probabilities based on predictions and historical context
        spike_prob = 0.1  # Base probability
        if current_vix < 12:  # Low VIX increases spike probability
            spike_prob = 0.3
        elif max_predicted > current_vix * 1.5:
            spike_prob = 0.25
        
        decline_prob = 0.1  # Base probability
        if current_vix > 25:  # High VIX increases decline probability
            decline_prob = 0.4
        elif min_predicted < current_vix * 0.8:
            decline_prob = 0.3
        
        stable_prob = 1.0 - spike_prob - decline_prob
        
        return {
            'spike': round(spike_prob, 2),
            'decline': round(decline_prob, 2), 
            'stable': round(stable_prob, 2)
        }
    
    def get_comprehensive_analysis(self) -> Dict[str, Any]:
        """Get comprehensive VIX analysis including all components"""
        try:
            # Get real-time VIX data
            current_data = self.get_real_time_vix()
            if not current_data:
                return {'error': 'Unable to fetch current VIX data'}
            
            # Get historical data (30 days)
            historical_data = self.get_historical_vix_data(30)
            if not historical_data:
                return {'error': 'Unable to fetch historical VIX data'}
            
            # Analyze current VIX
            current_analysis = self.analyze_current_vix(current_data)
            
            # Generate predictions
            future_predictions = self.predict_future_vix(historical_data, 30)
            
            # Calculate correlations
            correlations = self._calculate_correlations(historical_data)
            
            # Generate trading insights
            trading_insights = self._generate_trading_insights(current_analysis, historical_data)
            
            return {
                'status': 'success',
                'timestamp': datetime.now().isoformat(),
                'baseline_symbol': 'NSE:NIFTY50-INDEX',  # Always use NIFTY 50 as baseline
                'analysis_scope': 'VIX analysis is independent of selected symbol and always uses NIFTY 50 as baseline',
                'current_data': current_data,
                'analysis': {
                    'current_vix': current_analysis.current_vix,
                    'vix_change': current_analysis.vix_change,
                    'vix_change_percent': current_analysis.vix_change_percent,
                    'market_sentiment': current_analysis.market_sentiment,
                    'risk_level': current_analysis.risk_level,
                    'trading_signal': current_analysis.trading_signal,
                    'mean_reversion_target': current_analysis.mean_reversion_target,
                    'volatility_regime': current_analysis.volatility_regime,
                    'baseline_reference': 'All analysis references NIFTY 50 movement patterns'
                },
                'historical': {
                    'dates': historical_data.dates,
                    'vix_values': historical_data.vix_values,
                    'nifty_values': historical_data.nifty_values,
                    'call_premiums': historical_data.call_premiums,
                    'put_premiums': historical_data.put_premiums,
                    'volume_data': historical_data.volume_data
                },
                'predictions': {
                    'predicted_vix': future_predictions.predicted_vix,
                    'prediction_dates': future_predictions.prediction_dates,
                    'confidence_bands': future_predictions.confidence_bands,
                    'mean_reversion_timeline': future_predictions.mean_reversion_timeline,
                    'probability_scenarios': future_predictions.probability_scenarios
                },
                'correlations': correlations,
                'trading_insights': trading_insights
            }
            
        except Exception as e:
            logger.error(f"Error in comprehensive VIX analysis: {str(e)}")
            return {'error': f'Analysis failed: {str(e)}'}
    
    def _calculate_correlations(self, historical_data: VixHistoricalData) -> Dict[str, float]:
        """Calculate correlations between VIX and other metrics"""
        if len(historical_data.vix_values) < 2 or len(historical_data.nifty_values) < 2:
            return {}
        
        try:
            # VIX-Nifty correlation (typically negative)
            vix_nifty_corr = np.corrcoef(historical_data.vix_values, historical_data.nifty_values)[0, 1]
            
            # VIX-Call premium correlation (positive)
            vix_call_corr = np.corrcoef(historical_data.vix_values, historical_data.call_premiums)[0, 1]
            
            # VIX-Put premium correlation (positive, stronger)
            vix_put_corr = np.corrcoef(historical_data.vix_values, historical_data.put_premiums)[0, 1]
            
            return {
                'vix_nifty': round(float(vix_nifty_corr), 3) if not np.isnan(vix_nifty_corr) else 0,
                'vix_call_premiums': round(float(vix_call_corr), 3) if not np.isnan(vix_call_corr) else 0,
                'vix_put_premiums': round(float(vix_put_corr), 3) if not np.isnan(vix_put_corr) else 0
            }
        except:
            return {'vix_nifty': 0, 'vix_call_premiums': 0, 'vix_put_premiums': 0}
    
    def _generate_trading_insights(self, analysis: VixAnalysis, 
                                 historical_data: VixHistoricalData) -> Dict[str, Any]:
        """Generate actionable trading insights based on VIX analysis"""
        current_vix = analysis.current_vix
        sentiment = analysis.market_sentiment
        
        insights = {
            'market_regime': self._determine_market_regime(analysis, historical_data),
            'option_strategy': self._suggest_option_strategy(analysis),
            'risk_management': self._get_risk_management_advice(analysis),
            'timing_signals': self._get_timing_signals(analysis, historical_data)
        }
        
        return insights
    
    def _determine_market_regime(self, analysis: VixAnalysis, 
                               historical_data: VixHistoricalData) -> str:
        """Determine current market volatility regime"""
        if analysis.current_vix >= 30:
            return "CRISIS_MODE"
        elif analysis.current_vix >= 20:
            return "HIGH_VOLATILITY"
        elif analysis.current_vix >= 15:
            return "NORMAL_VOLATILITY"
        elif analysis.current_vix >= 10:
            return "LOW_VOLATILITY"
        else:
            return "COMPLACENCY_MODE"
    
    def _suggest_option_strategy(self, analysis: VixAnalysis) -> Dict[str, str]:
        """Suggest option trading strategies based on VIX level"""
        if analysis.trading_signal == "BUY_VOLATILITY":
            return {
                "primary": "Long Straddle/Strangle",
                "secondary": "Long Call/Put", 
                "description": "High VIX suggests big moves ahead. Buy options for directional or non-directional plays."
            }
        elif analysis.trading_signal == "SELL_VOLATILITY":
            return {
                "primary": "Short Straddle/Iron Condor",
                "secondary": "Covered Call Writing",
                "description": "Low VIX suggests range-bound markets. Sell options to collect premium."
            }
        elif analysis.trading_signal == "CAUTION":
            return {
                "primary": "Protective Puts",
                "secondary": "Cash Position",
                "description": "Extremely low VIX. Avoid selling options, prepare for potential volatility spike."
            }
        else:
            return {
                "primary": "Neutral Spreads",
                "secondary": "Calendar Spreads",
                "description": "Normal VIX levels. Use neutral strategies with limited risk."
            }
    
    def _get_risk_management_advice(self, analysis: VixAnalysis) -> List[str]:
        """Get risk management advice based on VIX analysis"""
        advice = []
        
        if analysis.risk_level == "EXTREME":
            advice.append("Reduce position sizes significantly")
            advice.append("Increase cash allocation to 30-40%")
            advice.append("Use tight stop losses")
            advice.append("Avoid naked option selling")
        elif analysis.risk_level == "HIGH":
            advice.append("Reduce leverage and position sizes")
            advice.append("Consider hedging with protective puts")
            advice.append("Avoid selling naked options")
        elif analysis.risk_level == "LOW":
            advice.append("Monitor for volatility spike signals")
            advice.append("Consider taking profits on short vol positions")
            advice.append("Prepare for potential mean reversion")
        else:
            advice.append("Maintain normal position sizing")
            advice.append("Use standard risk management rules")
        
        return advice
    
    def _get_timing_signals(self, analysis: VixAnalysis, 
                          historical_data: VixHistoricalData) -> Dict[str, str]:
        """Get market timing signals based on VIX"""
        signals = {}
        
        if len(historical_data.vix_values) >= 5:
            recent_avg = sum(historical_data.vix_values[-5:]) / 5
            if analysis.current_vix > recent_avg * 1.2:
                signals['short_term'] = "POTENTIAL_REVERSAL_DOWN"
            elif analysis.current_vix < recent_avg * 0.8:
                signals['short_term'] = "POTENTIAL_REVERSAL_UP"
            else:
                signals['short_term'] = "TREND_CONTINUATION"
        
        # Mean reversion signal
        if abs(analysis.current_vix - analysis.mean_reversion_target) > 3:
            signals['mean_reversion'] = f"EXPECT_MOVE_TO_{analysis.mean_reversion_target:.1f}"
        else:
            signals['mean_reversion'] = "NEAR_EQUILIBRIUM"
        
        return signals