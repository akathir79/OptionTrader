"""
Futures Price Analysis Service
Comprehensive futures analysis including real-time data, basis calculations, and trading opportunities
Based on cost-of-carry model and arbitrage detection for option trading insights
"""

import logging
import json
import math
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import statistics
from dataclasses import dataclass, asdict

from app import db
from models import FuturesContract, FuturesPrice, ExpirySpread, AnalysisSnapshot
from services.fyers_service import FyersService
from services.vix_service import VixService
from services.rbi_service import RBIService, get_current_risk_free_rate

logger = logging.getLogger(__name__)


@dataclass
class FuturesAnalysis:
    """Futures Analysis data structure"""
    spot_price: float
    futures_price: float
    basis: float
    basis_pct: float
    fair_value: float
    fv_gap: float
    carry_annualized: float
    days_to_expiry: int
    regime: str  # "CONTANGO", "BACKWARDATION", "NORMAL"
    arbitrage_opportunity: bool
    confidence_score: float


@dataclass
class BasisHistoricalData:
    """Basis Historical data structure"""
    dates: List[str]
    spot_values: List[float]
    futures_values: List[float]
    basis_values: List[float]
    fair_values: List[float]
    carry_rates: List[float]


@dataclass
class TradingSignal:
    """Trading signal structure"""
    signal_type: str  # "BASIS_REVERSION", "ARBITRAGE", "CALENDAR_SPREAD", "VOLATILITY"
    action: str  # "BUY", "SELL", "HOLD", "HEDGE"
    confidence: float  # 0-100
    description: str
    target_price: float
    stop_loss: float
    expected_return: float


class FuturesService:
    """Comprehensive futures analysis and trading opportunity service"""
    
    # Analysis configuration constants
    RISK_FREE_RATE = 0.055  # Default 5.5% (can be updated via config)
    DIVIDEND_YIELD_NIFTY = 0.014  # Default 1.4% Nifty dividend yield
    TRANSACTION_COST = 0.0005  # 0.05% total transaction cost for arbitrage
    
    # Basis regime thresholds (basis as % of spot)
    BASIS_THRESHOLDS = {
        'strong_contango': 0.5,    # >0.5% basis
        'mild_contango': 0.1,      # 0.1% to 0.5%
        'normal': -0.1,            # -0.1% to 0.1%
        'mild_backwardation': -0.5, # -0.5% to -0.1%
        'strong_backwardation': -999  # <-0.5%
    }
    
    # Z-score thresholds for mean reversion signals
    ZSCORE_THRESHOLDS = {
        'extreme_high': 2.0,
        'high': 1.5,
        'normal': 0.5,
        'low': -1.5,
        'extreme_low': -2.0
    }
    
    def __init__(self, user_id: int = 0):
        self.user_id = user_id
        self.fyers_service = FyersService(user_id)
        self.vix_service = VixService(user_id)
        self.rbi_service = RBIService()
    
    def get_symbol_mapping(self, underlying_symbol: str) -> Dict[str, str]:
        """Map underlying symbol to futures symbol patterns"""
        symbol_mappings = {
            'NSE:NIFTY50-INDEX': {
                'root': 'NIFTY',
                'pattern': 'NSE:NIFTY{expiry_code}FUT',
                'index_token': 'NSE:NIFTY50-INDEX'
            },
            'NSE:BANKNIFTY-INDEX': {
                'root': 'BANKNIFTY',
                'pattern': 'NSE:BANKNIFTY{expiry_code}FUT',
                'index_token': 'NSE:BANKNIFTY-INDEX'
            },
            # Handle NIFTYBANK naming variant (used by some APIs)
            'NSE:NIFTYBANK-INDEX': {
                'root': 'BANKNIFTY',
                'pattern': 'NSE:BANKNIFTY{expiry_code}FUT',
                'index_token': 'NSE:NIFTYBANK-INDEX'
            },
            # FINNIFTY futures mapping
            'NSE:FINNIFTY-INDEX': {
                'root': 'FINNIFTY',
                'pattern': 'NSE:FINNIFTY{expiry_code}FUT',
                'index_token': 'NSE:FINNIFTY-INDEX'
            }
        }
        
        # Handle stock futures (NSE:SYMBOL-EQ format)
        if underlying_symbol.endswith('-EQ'):
            # Extract stock symbol (e.g., NSE:ABB-EQ -> ABB)
            parts = underlying_symbol.split(':')
            if len(parts) == 2:
                exchange_part = parts[0]  # NSE
                symbol_part = parts[1].replace('-EQ', '')  # ABB
                
                return {
                    'root': symbol_part,
                    'pattern': f'{exchange_part}:{symbol_part}{{expiry_code}}FUT',
                    'index_token': underlying_symbol
                }
        
        # Handle MCX commodity futures (MCX:CRUDEOIL format)
        if underlying_symbol.startswith('MCX:'):
            # Extract commodity symbol (e.g., MCX:CRUDEOIL -> CRUDEOIL)
            parts = underlying_symbol.split(':')
            if len(parts) == 2:
                exchange_part = parts[0]  # MCX
                commodity_part = parts[1]  # CRUDEOIL
                
                return {
                    'root': commodity_part,
                    'pattern': f'{exchange_part}:{commodity_part}{{expiry_code}}',
                    'index_token': underlying_symbol
                }
        
        return symbol_mappings.get(underlying_symbol, {})
    
    def get_comprehensive_futures_analysis(self, underlying_symbol: str) -> Dict[str, Any]:
        """Get comprehensive futures vs spot analysis with historical data and monthly contracts"""
        try:
            logger.info(f"Starting comprehensive futures analysis for {underlying_symbol}")
            
            # Get real-time repo rate for accurate fair value calculation
            current_repo_rate = self.rbi_service.get_rate_for_calculation('repo_rate')
            logger.info(f"Using real-time repo rate: {current_repo_rate:.3f}")
            
            # Get current market data
            current_data = self.get_real_time_futures_data(underlying_symbol)
            if not current_data:
                return {
                    'success': False,
                    'error': 'Failed to get current market data'
                }
            
            # Get all active contracts for monthly comparison
            contracts = self.resolve_active_futures_contracts(underlying_symbol)
            if not contracts:
                return {
                    'success': False,
                    'error': 'No active futures contracts found'
                }
            
            # Analyze multiple monthly contracts
            monthly_analysis = self._analyze_monthly_contracts(underlying_symbol, contracts, current_repo_rate)
            
            # Get historical basis analysis (simulated for now)
            historical_analysis = self._get_historical_basis_analysis(underlying_symbol)
            
            # Generate comprehensive trading signals
            trading_signals = self._generate_comprehensive_signals(current_data, monthly_analysis, historical_analysis)
            
            # Calculate fair value using real-time rates
            fair_value_analysis = self._calculate_fair_value_analysis(
                current_data['spot_price'],
                current_data['futures_price'],
                current_repo_rate
            )
            
            # Arbitrage opportunities detection
            arbitrage_opportunities = self._detect_arbitrage_opportunities(
                current_data, monthly_analysis, fair_value_analysis
            )
            
            # Risk analysis and market regime
            risk_analysis = self._analyze_market_risk_regime(current_data, monthly_analysis)
            
            return {
                'success': True,
                'symbol': underlying_symbol,
                'timestamp': datetime.now().isoformat(),
                'current_market_data': current_data,
                'monthly_contracts': monthly_analysis,
                'historical_analysis': historical_analysis,
                'fair_value_analysis': fair_value_analysis,
                'trading_signals': trading_signals,
                'arbitrage_opportunities': arbitrage_opportunities,
                'risk_analysis': risk_analysis,
                'rbi_data': {
                    'current_repo_rate': current_repo_rate * 100,  # Convert to percentage
                    'rate_source': 'real_time_rbi',
                    'last_updated': self.rbi_service.get_all_rates().get('last_updated')
                },
                'summary': {
                    'overall_regime': risk_analysis.get('regime', 'NORMAL'),
                    'basis_points': current_data.get('analysis', {}).get('basis_percentage', 0),
                    'arbitrage_score': arbitrage_opportunities.get('confidence', 0),
                    'trading_recommendation': self._get_overall_recommendation(trading_signals),
                    'risk_level': risk_analysis.get('risk_level', 'MEDIUM')
                }
            }
            
        except Exception as e:
            logger.error(f"Error in comprehensive futures analysis: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_monthly_contracts(self, underlying_symbol: str, contracts: List[FuturesContract], repo_rate: float) -> List[Dict[str, Any]]:
        """Analyze multiple monthly contracts for term structure"""
        try:
            monthly_data = []
            spot_data = self.fyers_service.get_quotes(underlying_symbol)
            
            if not spot_data.get('success'):
                return []
            
            spot_price = spot_data['quotes'][0].get('ltp', 0)
            if spot_price == 0:
                return []
            
            for contract in contracts[:3]:  # Analyze next 3 months
                try:
                    # Get futures price for this contract
                    futures_data = self.fyers_service.get_quotes(contract.fy_symbol)
                    
                    if not futures_data.get('success'):
                        continue
                    
                    futures_price = futures_data['quotes'][0].get('ltp', 0)
                    if futures_price == 0:
                        continue
                    
                    # Calculate time to expiry
                    days_to_expiry = (contract.expiry_date - datetime.now().date()).days
                    time_to_expiry = days_to_expiry / 365.0
                    
                    # Calculate fair value for this expiry
                    fair_value = spot_price * (1 + (repo_rate - self.DIVIDEND_YIELD_NIFTY) * time_to_expiry)
                    
                    # Calculate basis and metrics
                    basis = futures_price - spot_price
                    basis_pct = (basis / spot_price) * 100
                    fair_value_gap = futures_price - fair_value
                    carry_cost = (futures_price - spot_price) / spot_price / time_to_expiry * 100 if time_to_expiry > 0 else 0
                    
                    monthly_data.append({
                        'contract_symbol': contract.fy_symbol,
                        'expiry_date': contract.expiry_date.isoformat(),
                        'days_to_expiry': days_to_expiry,
                        'time_to_expiry': time_to_expiry,
                        'futures_price': futures_price,
                        'basis': basis,
                        'basis_percentage': basis_pct,
                        'fair_value': fair_value,
                        'fair_value_gap': fair_value_gap,
                        'annualized_carry': carry_cost,
                        'is_near_month': contract.is_near_month,
                        'regime': 'CONTANGO' if basis > 0 else 'BACKWARDATION' if basis < 0 else 'NORMAL'
                    })
                    
                except Exception as e:
                    logger.error(f"Error analyzing contract {contract.fy_symbol}: {e}")
                    continue
            
            # Sort by expiry date
            monthly_data.sort(key=lambda x: x['days_to_expiry'])
            
            return monthly_data
            
        except Exception as e:
            logger.error(f"Error in monthly contracts analysis: {e}")
            return []
    
    def _get_historical_basis_analysis(self, underlying_symbol: str) -> Dict[str, Any]:
        """Get historical basis analysis (simulated for now, will be real historical data)"""
        try:
            # TODO: Implement real historical data fetching from database
            # For now, return simulated analysis based on typical patterns
            
            return {
                'timeframe': '30_days',
                'data_points': 30,
                'basis_statistics': {
                    'mean_basis': 15.2,
                    'std_deviation': 8.7,
                    'min_basis': -2.1,
                    'max_basis': 35.6,
                    'contango_days': 28,
                    'backwardation_days': 2,
                    'current_percentile': 65.4
                },
                'volatility_metrics': {
                    'basis_volatility': 12.3,
                    'mean_reversion_speed': 0.85,
                    'half_life_days': 3.2
                },
                'seasonal_patterns': {
                    'monthly_avg_basis': [12.1, 15.3, 18.7, 14.2],
                    'expiry_week_effect': 'increased_volatility',
                    'intraday_patterns': 'opening_gap_compression'
                },
                'note': 'Historical data will be collected over time for accurate analysis'
            }
            
        except Exception as e:
            logger.error(f"Error in historical analysis: {e}")
            return {}
    
    def _generate_comprehensive_signals(self, current_data: Dict, monthly_data: List[Dict], historical: Dict) -> List[Dict[str, Any]]:
        """Generate comprehensive trading signals based on all analysis"""
        try:
            signals = []
            
            # Current basis analysis
            current_basis_pct = current_data.get('analysis', {}).get('basis_percentage', 0)
            
            # Signal 1: Basis reversion signal
            if abs(current_basis_pct) > 0.3:  # >30 basis points
                action = 'SELL_FUTURES' if current_basis_pct > 0.3 else 'BUY_FUTURES'
                confidence = min(90, abs(current_basis_pct) * 100)
                
                signals.append({
                    'signal_type': 'BASIS_REVERSION',
                    'action': action,
                    'confidence': confidence,
                    'description': f'Basis at {current_basis_pct:.1f}% suggests mean reversion opportunity',
                    'target_basis': 0.1,
                    'time_horizon': '3-7 days',
                    'risk_level': 'MEDIUM'
                })
            
            # Signal 2: Calendar spread opportunities
            if len(monthly_data) >= 2:
                near_basis = monthly_data[0].get('basis_percentage', 0)
                far_basis = monthly_data[1].get('basis_percentage', 0)
                spread_diff = far_basis - near_basis
                
                if abs(spread_diff) > 0.2:  # Significant spread difference
                    action = 'BUY_NEAR_SELL_FAR' if spread_diff > 0.2 else 'SELL_NEAR_BUY_FAR'
                    
                    signals.append({
                        'signal_type': 'CALENDAR_SPREAD',
                        'action': action,
                        'confidence': min(80, abs(spread_diff) * 200),
                        'description': f'Calendar spread differential: {spread_diff:.1f}%',
                        'expected_convergence': '5-15 days',
                        'risk_level': 'LOW'
                    })
            
            # Signal 3: Arbitrage opportunity
            fair_value_gap = current_data.get('analysis', {}).get('fv_gap', 0)
            if abs(fair_value_gap) > 10:  # >10 points gap
                action = 'CASH_AND_CARRY' if fair_value_gap > 10 else 'REVERSE_CASH_AND_CARRY'
                
                signals.append({
                    'signal_type': 'ARBITRAGE',
                    'action': action,
                    'confidence': 95,
                    'description': f'Fair value gap: {fair_value_gap:.1f} points',
                    'expected_return': abs(fair_value_gap) / current_data.get('spot_price', 1) * 100,
                    'risk_level': 'VERY_LOW'
                })
            
            return signals
            
        except Exception as e:
            logger.error(f"Error generating comprehensive signals: {e}")
            return []
    
    def _calculate_fair_value_analysis(self, spot_price: float, futures_price: float, repo_rate: float) -> Dict[str, Any]:
        """Calculate comprehensive fair value analysis using real-time repo rate"""
        try:
            # Days to expiry (assuming near month)
            days_to_expiry = 11  # Approximate for current month
            time_to_expiry = days_to_expiry / 365.0
            
            # Calculate theoretical fair value
            carry_rate = repo_rate - self.DIVIDEND_YIELD_NIFTY
            fair_value = spot_price * (1 + carry_rate * time_to_expiry)
            
            # Analysis metrics
            fair_value_gap = futures_price - fair_value
            gap_percentage = (fair_value_gap / spot_price) * 100
            
            # Arbitrage threshold (transaction costs)
            arbitrage_threshold = spot_price * self.TRANSACTION_COST * 2  # Buy and sell costs
            
            return {
                'theoretical_fair_value': fair_value,
                'current_futures_price': futures_price,
                'fair_value_gap': fair_value_gap,
                'gap_percentage': gap_percentage,
                'arbitrage_threshold': arbitrage_threshold,
                'arbitrage_profitable': abs(fair_value_gap) > arbitrage_threshold,
                'carry_components': {
                    'repo_rate': repo_rate * 100,
                    'dividend_yield': self.DIVIDEND_YIELD_NIFTY * 100,
                    'net_carry_rate': carry_rate * 100,
                    'time_to_expiry': time_to_expiry,
                    'days_remaining': days_to_expiry
                },
                'sensitivity_analysis': {
                    'rate_sensitivity': fair_value * time_to_expiry * 0.01,  # 1% rate change impact
                    'time_decay_daily': fair_value * carry_rate / 365,
                    'dividend_impact': spot_price * time_to_expiry * 0.001  # 0.1% dividend change
                }
            }
            
        except Exception as e:
            logger.error(f"Error in fair value analysis: {e}")
            return {}
    
    def _detect_arbitrage_opportunities(self, current_data: Dict, monthly_data: List[Dict], fair_value: Dict) -> Dict[str, Any]:
        """Detect and analyze arbitrage opportunities"""
        try:
            opportunities = []
            
            # Check fair value arbitrage
            if fair_value.get('arbitrage_profitable', False):
                gap = fair_value.get('fair_value_gap', 0)
                expected_return = abs(gap) / current_data.get('spot_price', 1) * 100
                
                opportunities.append({
                    'type': 'CASH_AND_CARRY' if gap > 0 else 'REVERSE_CASH_AND_CARRY',
                    'description': f'Fair value gap: {gap:.1f} points',
                    'expected_return': expected_return,
                    'confidence': 95,
                    'execution_complexity': 'LOW',
                    'capital_required': current_data.get('spot_price', 0) * 50,  # Assume Nifty lot size
                    'holding_period': fair_value.get('carry_components', {}).get('days_remaining', 11)
                })
            
            # Check calendar spread arbitrage
            if len(monthly_data) >= 2:
                for i in range(len(monthly_data) - 1):
                    near_contract = monthly_data[i]
                    far_contract = monthly_data[i + 1]
                    
                    # Calculate implied carry rate
                    price_diff = far_contract['futures_price'] - near_contract['futures_price']
                    time_diff = (far_contract['time_to_expiry'] - near_contract['time_to_expiry'])
                    
                    if time_diff > 0:
                        implied_carry = price_diff / near_contract['futures_price'] / time_diff
                        theoretical_carry = fair_value.get('carry_components', {}).get('net_carry_rate', 0) / 100
                        
                        carry_gap = abs(implied_carry - theoretical_carry)
                        
                        if carry_gap > 0.02:  # >2% annual carry rate difference
                            opportunities.append({
                                'type': 'CALENDAR_SPREAD',
                                'description': f'Carry rate misalignment: {carry_gap*100:.1f}%',
                                'expected_return': carry_gap * 100,
                                'confidence': 75,
                                'execution_complexity': 'MEDIUM',
                                'contracts': [near_contract['contract_symbol'], far_contract['contract_symbol']]
                            })
            
            # Overall arbitrage assessment
            total_opportunities = len(opportunities)
            avg_confidence = sum(op.get('confidence', 0) for op in opportunities) / max(total_opportunities, 1)
            
            return {
                'opportunities_found': total_opportunities,
                'opportunities': opportunities,
                'confidence': avg_confidence,
                'overall_assessment': 'HIGH' if total_opportunities >= 2 else 'MEDIUM' if total_opportunities == 1 else 'LOW',
                'recommended_action': 'EXECUTE' if avg_confidence > 80 else 'MONITOR' if avg_confidence > 60 else 'WAIT'
            }
            
        except Exception as e:
            logger.error(f"Error detecting arbitrage opportunities: {e}")
            return {'opportunities_found': 0, 'confidence': 0}
    
    def _analyze_market_risk_regime(self, current_data: Dict, monthly_data: List[Dict]) -> Dict[str, Any]:
        """Analyze current market risk regime and volatility"""
        try:
            # Get VIX data for volatility context
            vix_data = self.vix_service.get_real_time_vix()
            current_vix = vix_data.get('ltp', 15) if vix_data else 15
            
            # Basis volatility assessment
            basis_values = [contract.get('basis_percentage', 0) for contract in monthly_data]
            basis_volatility = max(basis_values) - min(basis_values) if basis_values else 0
            
            # Market regime classification
            if current_vix > 20:
                volatility_regime = 'HIGH'
                risk_level = 'HIGH'
            elif current_vix > 15:
                volatility_regime = 'MEDIUM'
                risk_level = 'MEDIUM'
            else:
                volatility_regime = 'LOW'
                risk_level = 'LOW'
            
            # Contango/Backwardation assessment
            positive_basis_count = sum(1 for contract in monthly_data if contract.get('basis', 0) > 0)
            total_contracts = len(monthly_data)
            contango_strength = positive_basis_count / max(total_contracts, 1)
            
            if contango_strength > 0.8:
                market_structure = 'STRONG_CONTANGO'
            elif contango_strength > 0.5:
                market_structure = 'MILD_CONTANGO'
            elif contango_strength < 0.2:
                market_structure = 'STRONG_BACKWARDATION'
            else:
                market_structure = 'MIXED'
            
            return {
                'volatility_regime': volatility_regime,
                'risk_level': risk_level,
                'market_structure': market_structure,
                'contango_strength': contango_strength,
                'basis_volatility': basis_volatility,
                'vix_level': current_vix,
                'regime': market_structure,
                'stability_score': 100 - min(100, basis_volatility * 10 + (current_vix - 10) * 2),
                'trading_environment': {
                    'suitable_for_arbitrage': risk_level in ['LOW', 'MEDIUM'],
                    'calendar_spread_attractiveness': 'HIGH' if market_structure in ['STRONG_CONTANGO', 'STRONG_BACKWARDATION'] else 'MEDIUM',
                    'volatility_trading': 'FAVORABLE' if volatility_regime == 'HIGH' else 'NEUTRAL'
                }
            }
            
        except Exception as e:
            logger.error(f"Error in market risk regime analysis: {e}")
            return {'risk_level': 'MEDIUM', 'regime': 'NORMAL'}
    
    def _get_overall_recommendation(self, signals: List[Dict]) -> str:
        """Get overall trading recommendation based on all signals"""
        try:
            if not signals:
                return 'HOLD'
            
            # Weight signals by confidence
            weighted_score = 0
            total_weight = 0
            
            for signal in signals:
                confidence = signal.get('confidence', 50)
                action = signal.get('action', '')
                
                if 'BUY' in action or 'CASH_AND_CARRY' in action:
                    weighted_score += confidence
                elif 'SELL' in action or 'REVERSE' in action:
                    weighted_score -= confidence
                    
                total_weight += confidence
            
            if total_weight == 0:
                return 'HOLD'
            
            avg_score = weighted_score / total_weight
            
            if avg_score > 20:
                return 'STRONG_BUY'
            elif avg_score > 5:
                return 'BUY'
            elif avg_score < -20:
                return 'STRONG_SELL'
            elif avg_score < -5:
                return 'SELL'
            else:
                return 'HOLD'
                
        except Exception as e:
            logger.error(f"Error getting overall recommendation: {e}")
            return 'HOLD'
    
    def resolve_active_futures_contracts(self, underlying_symbol: str) -> List[FuturesContract]:
        """Resolve and fetch active futures contracts for an underlying"""
        try:
            mapping = self.get_symbol_mapping(underlying_symbol)
            if not mapping:
                logger.error(f"No mapping found for underlying symbol: {underlying_symbol}")
                return []
            
            # Try to get from option chain metadata first (Fyers API v3)
            contracts = self._get_contracts_from_option_chain(underlying_symbol, mapping)
            
            if not contracts:
                # Fallback: construct based on current date patterns
                contracts = self._construct_contracts_by_date(underlying_symbol, mapping)
            
            return contracts
            
        except Exception as e:
            logger.error(f"Error resolving futures contracts for {underlying_symbol}: {e}")
            return []
    
    def _get_contracts_from_option_chain(self, underlying_symbol: str, mapping: Dict) -> List[FuturesContract]:
        """Extract futures contract info from Fyers option chain metadata"""
        try:
            # Use option chain API to get available expiries
            option_chain = self.fyers_service.get_option_chain(
                symbol=underlying_symbol,
                strike_count=1  # Minimal request just for expiry data
            )
            
            if not option_chain.get('success'):
                return []
            
            # Parse expiry dates and create contracts
            contracts = []
            root = mapping['root']
            pattern = mapping['pattern']
            
            # For now, create contracts for next 3 months based on standard expiry patterns
            # TODO: Parse actual expiry metadata from option chain response
            current_date = datetime.now().date()
            for i in range(3):  # Next 3 monthly contracts
                # Calculate monthly expiry (last Thursday of month)
                expiry_date = self._calculate_monthly_expiry(current_date, i)
                expiry_code = self._format_expiry_code(expiry_date)
                fy_symbol = pattern.format(expiry_code=expiry_code)
                
                contract = FuturesContract()
                contract.symbol_root = root
                contract.fy_symbol = fy_symbol
                contract.expiry_date = expiry_date
                contract.underlying_symbol = underlying_symbol
                contract.is_active = True
                contract.is_near_month = (i == 0)
                contracts.append(contract)
            
            return contracts
            
        except Exception as e:
            logger.error(f"Error getting contracts from option chain: {e}")
            return []
    
    def _construct_contracts_by_date(self, underlying_symbol: str, mapping: Dict) -> List[FuturesContract]:
        """Construct futures contracts based on standard expiry patterns"""
        try:
            contracts = []
            root = mapping['root']
            current_date = datetime.now().date()
            
            # Create next 3 monthly contracts
            for i in range(3):
                expiry_date = self._calculate_monthly_expiry(current_date, i)
                
                # Format: NIFTY25SEPFUT, NIFTY25OCTFUT, etc.
                year_code = str(expiry_date.year)[-2:]  # Last 2 digits of year
                month_code = expiry_date.strftime('%b').upper()  # SEP, OCT, etc.
                fy_symbol = f"NSE:{root}{year_code}{month_code}FUT"
                
                contract = FuturesContract()
                contract.symbol_root = root
                contract.fy_symbol = fy_symbol
                contract.expiry_date = expiry_date
                contract.underlying_symbol = underlying_symbol
                contract.is_active = True
                contract.is_near_month = (i == 0)
                contract.lot_size = 50 if root == 'NIFTY' else 25  # Standard lot sizes
                contracts.append(contract)
            
            return contracts
            
        except Exception as e:
            logger.error(f"Error constructing contracts by date: {e}")
            return []
    
    def _calculate_monthly_expiry(self, current_date: date, months_ahead: int) -> date:
        """Calculate monthly expiry date (last Thursday of the month)"""
        # Get target month
        target_month = current_date.month + months_ahead
        target_year = current_date.year
        
        # Handle year rollover
        while target_month > 12:
            target_month -= 12
            target_year += 1
        
        # Find last Thursday of target month
        # Start from last day of month and work backwards
        if target_month == 12:
            last_day = date(target_year, 12, 31)
        else:
            last_day = date(target_year, target_month + 1, 1) - timedelta(days=1)
        
        # Find last Thursday (weekday 3)
        while last_day.weekday() != 3:  # Thursday = 3
            last_day -= timedelta(days=1)
        
        return last_day
    
    def _format_expiry_code(self, expiry_date: date) -> str:
        """Format expiry date for futures symbol"""
        year_code = str(expiry_date.year)[-2:]
        month_code = expiry_date.strftime('%b').upper()
        return f"{year_code}{month_code}"
    
    def get_real_time_futures_data(self, underlying_symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time futures price data with basis analysis"""
        try:
            # Special handling for MCX commodities - they are traded as futures, not spot
            if underlying_symbol.startswith('MCX:') and '25SEP' in underlying_symbol:
                # This is already a commodity futures contract
                futures_data = self.fyers_service.get_quotes(underlying_symbol)
                logger.info(f"MCX Commodity futures data: {futures_data}")
                
                if not futures_data.get('success'):
                    logger.error(f"Failed to get MCX futures data for {underlying_symbol}")
                    return None
                    
                if not futures_data.get('quotes') or len(futures_data['quotes']) == 0:
                    logger.error(f"No MCX futures quotes data: {futures_data}")
                    return None
                
                quote_data = futures_data['quotes'][0]
                if isinstance(quote_data, dict) and 'v' in quote_data:
                    futures_price = quote_data['v'].get('lp', 0)
                else:
                    futures_price = quote_data.get('ltp', 0)
                
                if futures_price == 0:
                    logger.error(f"No valid MCX futures price found: {quote_data}")
                    return None
                
                # For commodities, spot = futures (no basis analysis needed)
                return {
                    'underlying_symbol': underlying_symbol,
                    'spot_price': futures_price,
                    'futures_price': futures_price,
                    'futures_symbol': underlying_symbol,
                    'expiry_date': '2025-09-17',  # September expiry
                    'analysis': {
                        'basis_percentage': 0.0,
                        'regime': 'NEUTRAL',
                        'arbitrage_opportunity': False,
                        'confidence_score': 1.0
                    }
                }
            
            # Standard handling for NSE/BSE equity symbols
            # Get spot price
            spot_data = self.fyers_service.get_quotes(underlying_symbol)
            logger.info(f"Spot data response: {spot_data}")
            
            if not spot_data.get('success'):
                logger.error(f"Failed to get spot data for {underlying_symbol}: {spot_data}")
                return None
            
            if not spot_data.get('quotes') or len(spot_data['quotes']) == 0:
                logger.error(f"No quotes data in response for {underlying_symbol}: {spot_data}")
                return None
                
            quote_data = spot_data['quotes'][0]
            if isinstance(quote_data, dict) and 'v' in quote_data:
                # Fyers format: quotes[0]['v']['lp'] for last price
                spot_price = quote_data['v'].get('lp', 0)
            else:
                # Alternative format: quotes[0]['ltp']
                spot_price = quote_data.get('ltp', 0)
            
            if spot_price == 0:
                logger.error(f"No valid spot price found for {underlying_symbol}: {quote_data}")
                return None
            
            # Get active futures contracts
            contracts = self.resolve_active_futures_contracts(underlying_symbol)
            if not contracts:
                logger.error(f"No active futures contracts found for {underlying_symbol}")
                return None
            
            # Get near month futures price
            near_contract = next((c for c in contracts if c.is_near_month), contracts[0])
            futures_data = self.fyers_service.get_quotes(near_contract.fy_symbol)
            logger.info(f"Futures data response: {futures_data}")
            
            if not futures_data.get('success'):
                # If direct quote fails, try extracting from symbol response
                futures_price = self._extract_futures_price_fallback(near_contract.fy_symbol)
                if not futures_price:
                    logger.error(f"Failed to get futures data for {near_contract.fy_symbol}")
                    return None
            else:
                if not futures_data.get('quotes') or len(futures_data['quotes']) == 0:
                    logger.error(f"No futures quotes data: {futures_data}")
                    return None
                    
                quote_data = futures_data['quotes'][0]
                if isinstance(quote_data, dict) and 'v' in quote_data:
                    # Fyers format: quotes[0]['v']['lp'] for last price
                    futures_price = quote_data['v'].get('lp', 0)
                else:
                    # Alternative format: quotes[0]['ltp']
                    futures_price = quote_data.get('ltp', 0)
                
                if futures_price == 0:
                    logger.error(f"No valid futures price found for {near_contract.fy_symbol}: {quote_data}")
                    return None
            
            # Calculate analysis
            analysis = self.calculate_basis_analysis(
                spot_price=spot_price,
                futures_price=futures_price,
                expiry_date=near_contract.expiry_date
            )
            
            return {
                'success': True,
                'underlying_symbol': underlying_symbol,
                'spot_price': spot_price,
                'futures_price': futures_price,
                'futures_symbol': near_contract.fy_symbol,
                'expiry_date': near_contract.expiry_date.isoformat(),
                'analysis': asdict(analysis)
            }
            
        except Exception as e:
            logger.error(f"Error getting real-time futures data: {e}")
            return {'success': False, 'error': str(e)}
    
    def _extract_futures_price_fallback(self, futures_symbol: str) -> Optional[float]:
        """Fallback method to extract futures price using different approaches"""
        try:
            # Try with slight symbol variations if needed
            symbol_variations = [
                futures_symbol,
                futures_symbol.replace('FUT', '-INDEX'),  # Fallback patterns
            ]
            
            for symbol in symbol_variations:
                try:
                    data = self.fyers_service.get_quotes(symbol)
                    if data.get('success') and data.get('quotes'):
                        price = data['quotes'][0].get('ltp') or data['quotes'][0].get('fp')
                        if price:
                            return float(price)
                except:
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error in futures price fallback: {e}")
            return None
    
    def calculate_basis_analysis(self, spot_price: float, futures_price: float, expiry_date: date) -> FuturesAnalysis:
        """Calculate comprehensive basis and carry analysis"""
        try:
            # Calculate time to expiry
            current_date = datetime.now().date()
            days_to_expiry = (expiry_date - current_date).days
            years_to_expiry = days_to_expiry / 365.0
            
            # Calculate basis
            basis = futures_price - spot_price
            basis_pct = (basis / spot_price) * 100 if spot_price > 0 else 0
            
            # Calculate fair value using cost-of-carry model
            # F = S * e^((r - q) * T)
            fair_value = spot_price * math.exp(
                (self.RISK_FREE_RATE - self.DIVIDEND_YIELD_NIFTY) * years_to_expiry
            )
            
            # Fair value gap (actual vs theoretical)
            fv_gap = futures_price - fair_value
            
            # Annualized carry rate
            if years_to_expiry > 0:
                carry_annualized = (math.log(futures_price / spot_price) / years_to_expiry) * 100
            else:
                carry_annualized = 0
            
            # Determine regime
            regime = self._classify_basis_regime(basis_pct)
            
            # Check for arbitrage opportunity
            arbitrage_opportunity = abs(fv_gap) > (spot_price * self.TRANSACTION_COST)
            
            # Calculate confidence score based on various factors
            confidence_score = self._calculate_confidence_score(
                basis_pct, fv_gap, days_to_expiry, spot_price
            )
            
            return FuturesAnalysis(
                spot_price=spot_price,
                futures_price=futures_price,
                basis=basis,
                basis_pct=basis_pct,
                fair_value=fair_value,
                fv_gap=fv_gap,
                carry_annualized=carry_annualized,
                days_to_expiry=days_to_expiry,
                regime=regime,
                arbitrage_opportunity=arbitrage_opportunity,
                confidence_score=confidence_score
            )
            
        except Exception as e:
            logger.error(f"Error calculating basis analysis: {e}")
            # Return default analysis
            return FuturesAnalysis(
                spot_price=spot_price,
                futures_price=futures_price,
                basis=futures_price - spot_price,
                basis_pct=0,
                fair_value=spot_price,
                fv_gap=0,
                carry_annualized=0,
                days_to_expiry=0,
                regime="NORMAL",
                arbitrage_opportunity=False,
                confidence_score=0
            )
    
    def _classify_basis_regime(self, basis_pct: float) -> str:
        """Classify basis regime based on percentage thresholds"""
        if basis_pct > self.BASIS_THRESHOLDS['strong_contango']:
            return "STRONG_CONTANGO"
        elif basis_pct > self.BASIS_THRESHOLDS['mild_contango']:
            return "MILD_CONTANGO"
        elif basis_pct > self.BASIS_THRESHOLDS['normal']:
            return "NORMAL"
        elif basis_pct > self.BASIS_THRESHOLDS['mild_backwardation']:
            return "MILD_BACKWARDATION"
        else:
            return "STRONG_BACKWARDATION"
    
    def _calculate_confidence_score(self, basis_pct: float, fv_gap: float, days_to_expiry: int, spot_price: float) -> float:
        """Calculate confidence score for analysis (0-100)"""
        try:
            score = 50  # Base score
            
            # Adjust based on basis magnitude (higher deviation = higher confidence in signal)
            if abs(basis_pct) > 0.3:
                score += 20
            elif abs(basis_pct) > 0.1:
                score += 10
            
            # Adjust based on fair value gap
            fv_gap_pct = abs(fv_gap) / spot_price * 100 if spot_price > 0 else 0
            if fv_gap_pct > 0.2:
                score += 15
            elif fv_gap_pct > 0.1:
                score += 8
            
            # Adjust based on time to expiry (more time = higher confidence)
            if days_to_expiry > 20:
                score += 10
            elif days_to_expiry > 10:
                score += 5
            elif days_to_expiry < 3:
                score -= 15  # Very low time reduces confidence
            
            # Cap between 0 and 100
            return max(0, min(100, score))
            
        except Exception as e:
            logger.error(f"Error calculating confidence score: {e}")
            return 50  # Default medium confidence
    
    def generate_trading_signals(self, analysis: FuturesAnalysis, vix_data: Optional[Dict] = None) -> List[TradingSignal]:
        """Generate trading signals based on futures analysis and VIX regime"""
        signals = []
        
        try:
            # Get VIX data for additional context
            if not vix_data:
                vix_data = self.vix_service.get_real_time_vix()
            
            vix_level = vix_data.get('vix_value', 15) if vix_data else 15
            
            # 1. Basis Mean Reversion Signal
            if abs(analysis.basis_pct) > 0.2:
                if analysis.basis_pct > 0.3:  # Strong contango
                    signals.append(TradingSignal(
                        signal_type="BASIS_REVERSION",
                        action="SELL",
                        confidence=min(80, analysis.confidence_score),
                        description=f"Strong contango ({analysis.basis_pct:.2f}%) suggests selling futures or buying puts",
                        target_price=analysis.fair_value,
                        stop_loss=analysis.futures_price * 1.02,
                        expected_return=abs(analysis.fv_gap) / analysis.spot_price * 100
                    ))
                elif analysis.basis_pct < -0.2:  # Backwardation
                    signals.append(TradingSignal(
                        signal_type="BASIS_REVERSION",
                        action="BUY",
                        confidence=min(85, analysis.confidence_score),
                        description=f"Backwardation ({analysis.basis_pct:.2f}%) suggests buying futures or calls",
                        target_price=analysis.fair_value,
                        stop_loss=analysis.futures_price * 0.98,
                        expected_return=abs(analysis.fv_gap) / analysis.spot_price * 100
                    ))
            
            # 2. Arbitrage Signal
            if analysis.arbitrage_opportunity:
                arb_return = abs(analysis.fv_gap) / analysis.spot_price * 100
                if arb_return > 0.1:  # Minimum 0.1% return after costs
                    action = "BUY" if analysis.fv_gap < 0 else "SELL"
                    signals.append(TradingSignal(
                        signal_type="ARBITRAGE",
                        action=action,
                        confidence=95,
                        description=f"Risk-free arbitrage opportunity: {arb_return:.2f}% return",
                        target_price=analysis.fair_value,
                        stop_loss=0,  # Risk-free arbitrage
                        expected_return=arb_return
                    ))
            
            # 3. Volatility-Based Signals (combining with VIX)
            if vix_level > 20 and analysis.regime in ["MILD_BACKWARDATION", "STRONG_BACKWARDATION"]:
                signals.append(TradingSignal(
                    signal_type="VOLATILITY",
                    action="BUY",
                    confidence=70,
                    description=f"High VIX ({vix_level:.1f}) + backwardation suggests buying volatility",
                    target_price=analysis.spot_price * 1.05,
                    stop_loss=analysis.spot_price * 0.97,
                    expected_return=5.0
                ))
            elif vix_level < 12 and analysis.regime in ["MILD_CONTANGO", "STRONG_CONTANGO"]:
                signals.append(TradingSignal(
                    signal_type="VOLATILITY",
                    action="SELL",
                    confidence=65,
                    description=f"Low VIX ({vix_level:.1f}) + contango suggests selling volatility",
                    target_price=analysis.spot_price * 0.98,
                    stop_loss=analysis.spot_price * 1.03,
                    expected_return=3.0
                ))
            
            # 4. Calendar Spread Signal (placeholder for when multiple contracts available)
            if analysis.days_to_expiry < 15:
                signals.append(TradingSignal(
                    signal_type="CALENDAR_SPREAD",
                    action="ROLL",
                    confidence=60,
                    description=f"Near expiry ({analysis.days_to_expiry} days) suggests rolling to next month",
                    target_price=0,
                    stop_loss=0,
                    expected_return=1.0
                ))
            
            return signals
            
        except Exception as e:
            logger.error(f"Error generating trading signals: {e}")
            return []
    
    def store_analysis_snapshot(self, underlying_symbol: str, analysis: FuturesAnalysis, signals: List[TradingSignal]) -> bool:
        """Store analysis snapshot to database"""
        try:
            # Create signals JSON
            signals_json = json.dumps([asdict(signal) for signal in signals])
            
            # Generate summary text
            summary_text = self._generate_analysis_summary(analysis, signals)
            
            # Calculate opportunity flags
            arbitrage_opp = any(s.signal_type == "ARBITRAGE" for s in signals)
            calendar_opp = any(s.signal_type == "CALENDAR_SPREAD" for s in signals)
            volatility_opp = any(s.signal_type == "VOLATILITY" for s in signals)
            
            # Create snapshot
            snapshot = AnalysisSnapshot()
            snapshot.timestamp = datetime.now()
            snapshot.underlying_symbol = underlying_symbol
            snapshot.signals_json = signals_json
            snapshot.summary_text = summary_text
            snapshot.current_basis = analysis.basis
            snapshot.basis_zscore = 0  # TODO: Calculate from historical data
            snapshot.regime = analysis.regime
            snapshot.confidence_score = analysis.confidence_score
            snapshot.arbitrage_opportunity = arbitrage_opp
            snapshot.calendar_opportunity = calendar_opp
            snapshot.volatility_opportunity = volatility_opp
            
            db.session.add(snapshot)
            db.session.commit()
            
            logger.info(f"Stored analysis snapshot for {underlying_symbol}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing analysis snapshot: {e}")
            db.session.rollback()
            return False
    
    def _generate_analysis_summary(self, analysis: FuturesAnalysis, signals: List[TradingSignal]) -> str:
        """Generate human-readable analysis summary"""
        try:
            summary_parts = []
            
            # Basic analysis
            summary_parts.append(f"Futures trading at {analysis.futures_price:.2f} vs spot {analysis.spot_price:.2f}")
            summary_parts.append(f"Basis: {analysis.basis:.2f} ({analysis.basis_pct:.2f}%) - {analysis.regime}")
            
            if analysis.arbitrage_opportunity:
                summary_parts.append(f"Arbitrage detected: {analysis.fv_gap:.2f} gap vs fair value")
            
            # Signal summary
            if signals:
                high_confidence_signals = [s for s in signals if s.confidence > 70]
                if high_confidence_signals:
                    signal_actions = [s.action for s in high_confidence_signals]
                    summary_parts.append(f"High confidence signals: {', '.join(set(signal_actions))}")
            
            # Days to expiry warning
            if analysis.days_to_expiry <= 7:
                summary_parts.append(f"⚠️ Near expiry: {analysis.days_to_expiry} days remaining")
            
            return ". ".join(summary_parts) + "."
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Analysis completed with mixed signals."
    
    def get_latest_analysis(self, underlying_symbol: str) -> Optional[Dict[str, Any]]:
        """Get latest analysis snapshot for a symbol"""
        try:
            snapshot = AnalysisSnapshot.query.filter_by(
                underlying_symbol=underlying_symbol
            ).order_by(AnalysisSnapshot.timestamp.desc()).first()
            
            if not snapshot:
                return None
            
            # Parse signals JSON
            signals = []
            if snapshot.signals_json:
                try:
                    signals_data = json.loads(snapshot.signals_json)
                    signals = [TradingSignal(**signal) for signal in signals_data]
                except:
                    pass
            
            return {
                'timestamp': snapshot.timestamp.isoformat(),
                'summary': snapshot.summary_text,
                'regime': snapshot.regime,
                'confidence_score': snapshot.confidence_score,
                'current_basis': snapshot.current_basis,
                'opportunities': {
                    'arbitrage': snapshot.arbitrage_opportunity,
                    'calendar': snapshot.calendar_opportunity,
                    'volatility': snapshot.volatility_opportunity
                },
                'signals': [asdict(signal) for signal in signals]
            }
            
        except Exception as e:
            logger.error(f"Error getting latest analysis: {e}")
            return None