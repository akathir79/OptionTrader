/**
 * ⚠️ CRITICAL: VIX Analysis System - PROTECTED FILE
 * Real-time India VIX data updates and comprehensive analysis popup
 * 
 * PROTECTION WARNINGS - DO NOT MODIFY WITHOUT EXTREME CARE:
 * 1. API endpoints expect exact response format from Fyers
 * 2. Chart initialization timing is critical (setTimeout timing must not change) 
 * 3. Modal minimize/maximize functions must match HTML onclick handlers
 * 4. Data table population depends on specific historical data structure
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 VIX Analysis system initialized');
    
    // Update VIX data every 30 seconds
    updateVixData();
    setInterval(updateVixData, 30000);
    
    // Update futures data every 30 seconds
    updateFuturesData();
    setInterval(updateFuturesData, 30000);
    
    // Add event listeners for dropdown changes to trigger immediate updates
    addDropdownChangeListeners();
});

/**
 * Fetch and update real-time VIX data
 */
async function updateVixData() {
    try {
        const response = await fetch('/api/vix/current');
        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            const vixData = result.data;
            updateVixDisplay(vixData);
            console.log('📈 VIX data updated:', vixData.ltp);
        } else {
            console.warn('⚠️ Failed to fetch VIX data:', result.message);
            setVixError();
        }
    } catch (error) {
        console.error('❌ Error fetching VIX data:', error);
        setVixError();
    }
}

/**
 * Update VIX display in the carousel using three-row format
 */
function updateVixDisplay(vixData) {
    const vixValueEl = document.getElementById('vixValue');
    const vixChangeEl = document.getElementById('vixChange');
    
    if (!vixValueEl) return;
    
    const currentVix = parseFloat(vixData.ltp);
    const change = parseFloat(vixData.change);
    const changePercent = parseFloat(vixData.change_percent);
    
    // Update VIX value (Row 2) - consistent with new three-row design
    vixValueEl.textContent = currentVix.toFixed(2);
    vixValueEl.classList.remove('text-muted');
    vixValueEl.classList.add('text-dark');
    
    // Update change indicator (Row 3) - consistent with new three-row design
    if (vixChangeEl) {
        const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
        vixChangeEl.textContent = changeText;
        
        // Apply consistent color scheme with other market data
        vixChangeEl.classList.remove('text-success', 'text-danger', 'text-muted');
        
        if (change > 0) {
            vixChangeEl.classList.add('text-danger'); // VIX up is typically bad (red)
        } else if (change < 0) {
            vixChangeEl.classList.add('text-success'); // VIX down is typically good (green)
        } else {
            vixChangeEl.classList.add('text-muted');
        }
    }
}

/**
 * Set VIX color based on volatility level
 */
function updateVixColor(element, vixValue) {
    element.className = element.className.replace(/text-\w+/g, '');
    
    if (vixValue >= 25) {
        element.classList.add('text-danger');  // High volatility - red
    } else if (vixValue >= 20) {
        element.classList.add('text-warning');  // Medium-high volatility - orange
    } else if (vixValue >= 15) {
        element.classList.add('text-warning');  // Normal volatility - yellow
    } else if (vixValue >= 12) {
        element.classList.add('text-info');     // Low volatility - light blue
    } else {
        element.classList.add('text-success');  // Very low volatility - green
    }
}

/**
 * Set error state for VIX display
 */
function setVixError() {
    const vixValueEl = document.getElementById('vixValue');
    const vixChangeEl = document.getElementById('vixChange');
    
    if (vixValueEl) {
        vixValueEl.textContent = '--';
        vixValueEl.className = 'text-muted';
    }
    
    if (vixChangeEl) {
        vixChangeEl.textContent = '';
    }
}

/**
 * Fetch and update real-time futures data
 */
async function updateFuturesData() {
    try {
        // Get current symbol for futures lookup
        const currentSymbol = getCurrentSelectedSymbol();
        if (!currentSymbol) {
            setFuturesError();
            return;
        }
        
        const response = await fetch(`/api/futures/current?symbol=${encodeURIComponent(currentSymbol)}`);
        const result = await response.json();
        
        if (result.success && result.futures_price) {
            updateFuturesDisplay(result);
            console.log('📊 Futures data updated:', result.futures_price);
        } else {
            console.warn('⚠️ Failed to fetch futures data:', result.error);
            setFuturesError();
        }
    } catch (error) {
        console.error('❌ Error fetching futures data:', error);
        setFuturesError();
    }
}

/**
 * Update futures display in the carousel
 */
function updateFuturesDisplay(futuresData) {
    const futuresPriceEl = document.getElementById('futuresPrice');
    const futuresChangeEl = document.getElementById('futuresChange');
    
    if (!futuresPriceEl) return;
    
    const futuresPrice = parseFloat(futuresData.futures_price);
    const spotPrice = parseFloat(futuresData.spot_price);
    const basis = futuresPrice - spotPrice;
    const basisPercent = (basis / spotPrice) * 100;
    
    // Update futures price
    futuresPriceEl.textContent = futuresPrice.toLocaleString('en-IN');
    
    // Update basis indicator
    if (futuresChangeEl) {
        const basisText = `${basis >= 0 ? '+' : ''}${basis.toFixed(1)} (${basisPercent >= 0 ? '+' : ''}${basisPercent.toFixed(2)}%)`;
        futuresChangeEl.textContent = basisText;
        
        // Color based on contango/backwardation
        if (basis > 0) {
            futuresChangeEl.className = 'ms-1 text-info'; // Contango - blue
        } else if (basis < 0) {
            futuresChangeEl.className = 'ms-1 text-warning'; // Backwardation - orange
        } else {
            futuresChangeEl.className = 'ms-1 text-muted';
        }
    }
    
    // Color futures price based on regime
    updateFuturesColor(futuresPriceEl, futuresData.analysis?.regime || 'NORMAL');
}

/**
 * Set futures color based on basis regime
 */
function updateFuturesColor(element, regime) {
    element.className = element.className.replace(/text-\w+/g, '');
    
    switch (regime) {
        case 'STRONG_CONTANGO':
            element.classList.add('text-primary'); // Strong contango - blue
            break;
        case 'MILD_CONTANGO':
            element.classList.add('text-info'); // Mild contango - light blue
            break;
        case 'NORMAL':
            element.classList.add('text-secondary'); // Normal - gray
            break;
        case 'MILD_BACKWARDATION':
            element.classList.add('text-warning'); // Mild backwardation - orange
            break;
        case 'STRONG_BACKWARDATION':
            element.classList.add('text-danger'); // Strong backwardation - red
            break;
        default:
            element.classList.add('text-secondary');
    }
}

/**
 * Set futures error state
 */
function setFuturesError() {
    const futuresPriceEl = document.getElementById('futuresPrice');
    const futuresChangeEl = document.getElementById('futuresChange');
    
    if (futuresPriceEl) {
        futuresPriceEl.textContent = '--';
        futuresPriceEl.className = 'text-secondary';
    }
    
    if (futuresChangeEl) {
        futuresChangeEl.textContent = '';
        futuresChangeEl.className = 'ms-1 text-muted';
    }
}

/**
 * Get current selected symbol from the application
 */
function getCurrentSelectedSymbol() {
    // Try to get symbol from WebSocket handler if available
    if (window.webSocketHandler && window.webSocketHandler.currentSymbol) {
        return window.webSocketHandler.currentSymbol;
    }
    
    // Check all three dropdowns dynamically
    const indexSelect = document.getElementById('indexSelect');
    const exchangeSelect = document.getElementById('exchangeSelect');
    const symbolSelect = document.getElementById('extraSelect'); // This is the symbol dropdown
    
    // Priority 1: Check if a specific symbol is selected (like ABB, RELIANCE, etc.)
    if (symbolSelect && symbolSelect.value && symbolSelect.value !== "" && symbolSelect.value !== "Select Symbol") {
        const exchange = exchangeSelect?.value || 'NSE';
        const symbol = symbolSelect.value;
        
        // Handle different exchange types
        if (exchange === 'MCX') {
            // MCX commodities: MCX:CRUDEOIL, MCX:GOLD, etc.
            return `${exchange}:${symbol}`;
        } else {
            // Equity markets: NSE:SYMBOL-EQ, BSE:SYMBOL-EQ
            return `${exchange}:${symbol}-EQ`;
        }
    }
    
    // Priority 2: Check if an index is selected (NIFTY, BANKNIFTY, etc.)
    if (indexSelect && indexSelect.value && indexSelect.value !== "" && indexSelect.value !== "Select Index") {
        // Map index display names to API symbols
        const indexMap = {
            'NIFTY': 'NSE:NIFTY50-INDEX',
            'NIFTY50': 'NSE:NIFTY50-INDEX', 
            'NIFTY 50': 'NSE:NIFTY50-INDEX',
            'BANKNIFTY': 'NSE:NIFTYBANK-INDEX',  // Use NIFTYBANK for consistency
            'BANK NIFTY': 'NSE:NIFTYBANK-INDEX',
            'FINNIFTY': 'NSE:FINNIFTY-INDEX',
            'FIN NIFTY': 'NSE:FINNIFTY-INDEX'
        };
        
        const selectedIndex = indexSelect.value.toUpperCase().trim();
        return indexMap[selectedIndex] || `NSE:${selectedIndex}-INDEX`;
    }
    
    // Default to NIFTY if nothing selected
    console.log('⚠️ No symbol selected, defaulting to NIFTY50-INDEX');
    return 'NSE:NIFTY50-INDEX';
}

/**
 * Add event listeners for dropdown changes to trigger immediate futures updates
 */
function addDropdownChangeListeners() {
    const indexSelect = document.getElementById('indexSelect');
    const exchangeSelect = document.getElementById('exchangeSelect'); 
    const symbolSelect = document.getElementById('extraSelect');
    
    // Add event listeners to all dropdowns
    [indexSelect, exchangeSelect, symbolSelect].forEach(dropdown => {
        if (dropdown) {
            dropdown.addEventListener('change', function() {
                const currentSymbol = getCurrentSelectedSymbol();
                console.log('📊 Dropdown changed, updating futures data for:', currentSymbol);
                
                // Immediately update futures data
                updateFuturesData();
                
                // Also update spot data for market card
                updateSpotPriceData();
            });
        }
    });
}

/**
 * Update spot price data for market card
 */
async function updateSpotPriceData() {
    try {
        const currentSymbol = getCurrentSelectedSymbol();
        if (!currentSymbol) return;
        
        const response = await fetch(`/get_spot_price?symbol=${encodeURIComponent(currentSymbol)}`);
        const result = await response.json();
        
        if (result.success) {
            // Update spot price display in market card
            const spotPriceEl = document.getElementById('spotPrice');
            const dayOpenEl = document.getElementById('dayOpen');
            const gapEl = document.getElementById('gapPercent');
            
            if (spotPriceEl) {
                spotPriceEl.textContent = result.spot_price.toLocaleString('en-IN');
            }
            
            if (dayOpenEl && result.day_open) {
                dayOpenEl.textContent = result.day_open.toLocaleString('en-IN');
            }
            
            if (gapEl && result.gap_pct) {
                const gapClass = result.gap_pct >= 0 ? 'text-success' : 'text-danger';
                const gapSign = result.gap_pct >= 0 ? '+' : '';
                gapEl.textContent = `${gapSign}${result.gap_pct.toFixed(2)}%`;
                gapEl.className = `ms-1 ${gapClass}`;
            }
            
            console.log('💼 Spot price updated:', result.spot_price);
        }
    } catch (error) {
        console.error('❌ Error updating spot price:', error);
    }
}

/**
 * Open comprehensive futures analysis popup
 */
async function openFuturesAnalysis() {
    console.log('🔍 Opening futures analysis...');
    
    try {
        // Get current symbol
        const currentSymbol = getCurrentSelectedSymbol();
        if (!currentSymbol) {
            console.warn('No symbol selected for futures analysis');
            return;
        }
        
        // Show loading state
        // TODO: Create futures analysis modal similar to VIX
        console.log('📊 Futures analysis for', currentSymbol);
        alert('Futures analysis coming soon!');
        
    } catch (error) {
        console.error('❌ Error opening futures analysis:', error);
    }
}

/**
 * Open comprehensive VIX analysis popup
 */
async function openVixAnalysis() {
    console.log('🔍 Opening VIX analysis...');
    
    try {
        // Show loading state
        showVixAnalysisModal(null, true);
        
        // Fetch comprehensive analysis
        const response = await fetch('/api/vix/analysis');
        const analysis = await response.json();
        
        if (analysis.status === 'success') {
            showVixAnalysisModal(analysis);
        } else {
            showVixAnalysisError(analysis.error || 'Failed to load VIX analysis');
        }
        
    } catch (error) {
        console.error('❌ Error loading VIX analysis:', error);
        showVixAnalysisError('Network error while loading analysis');
    }
}

/**
 * Show VIX analysis modal
 */
function showVixAnalysisModal(data, loading = false) {
    // Remove existing modal if any
    const existingModal = document.getElementById('vixAnalysisModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = createVixAnalysisModalHTML(data, loading);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('vixAnalysisModal'), {
        size: 'xl',
        backdrop: 'static'
    });
    modal.show();
    
    // Initialize charts and data table if data is loaded
    if (data && !loading) {
        setTimeout(() => {
            initializeVixCharts(data);
            populateVixDataTable(data);
        }, 100);
    }
}

/**
 * Create VIX analysis modal HTML
 */
function createVixAnalysisModalHTML(data, loading) {
    if (loading) {
        return `
            <div class="modal fade" id="vixAnalysisModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-chart-line me-2"></i>India VIX Analysis
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading comprehensive VIX analysis...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    const analysis = data.analysis || {};
    const historical = data.historical || {};
    const predictions = data.predictions || {};
    const correlations = data.correlations || {};
    const insights = data.trading_insights || {};
    
    return `
        <div class="modal fade" id="vixAnalysisModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-line me-2"></i>India VIX Comprehensive Analysis
                        </h5>
                        <div class="d-flex align-items-center">
                            <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="minimizeVixModal()" title="Minimize">
                                <i class="fas fa-window-minimize"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="maximizeVixModal()" title="Maximize">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" onclick="closeVixModal()"></button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <!-- Current VIX Status -->
                        <div class="row mb-4">
                            <div class="col-12">
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <div class="row text-center">
                                            <div class="col-md-2">
                                                <h3 class="mb-1 ${getVixColorClass(analysis.current_vix)}">${(analysis.current_vix || 0).toFixed(2)}</h3>
                                                <small class="text-muted">Current VIX</small>
                                            </div>
                                            <div class="col-md-2">
                                                <h5 class="mb-1 ${analysis.vix_change >= 0 ? 'text-danger' : 'text-success'}">
                                                    ${analysis.vix_change >= 0 ? '+' : ''}${(analysis.vix_change || 0).toFixed(2)}
                                                </h5>
                                                <small class="text-muted">Change</small>
                                            </div>
                                            <div class="col-md-2">
                                                <h6 class="mb-1 ${getSentimentColorClass(analysis.market_sentiment)}">
                                                    ${formatSentiment(analysis.market_sentiment)}
                                                </h6>
                                                <small class="text-muted">Sentiment</small>
                                            </div>
                                            <div class="col-md-2">
                                                <h6 class="mb-1 ${getRiskColorClass(analysis.risk_level)}">
                                                    ${analysis.risk_level || 'MEDIUM'}
                                                </h6>
                                                <small class="text-muted">Risk Level</small>
                                            </div>
                                            <div class="col-md-2">
                                                <h6 class="mb-1 text-info">
                                                    ${(analysis.mean_reversion_target || 17.5).toFixed(1)}
                                                </h6>
                                                <small class="text-muted">Target</small>
                                            </div>
                                            <div class="col-md-2">
                                                <h6 class="mb-1 ${getSignalColorClass(analysis.trading_signal)}">
                                                    ${formatTradingSignal(analysis.trading_signal)}
                                                </h6>
                                                <small class="text-muted">Signal</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Charts and Analysis Tabs -->
                        <ul class="nav nav-tabs mb-3" id="vixAnalysisTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="historical-tab" data-bs-toggle="tab" data-bs-target="#historical" type="button" role="tab">
                                    <i class="fas fa-history me-1"></i>30 Days History
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="predictions-tab" data-bs-toggle="tab" data-bs-target="#predictions" type="button" role="tab">
                                    <i class="fas fa-crystal-ball me-1"></i>30 Days Forecast
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="correlations-tab" data-bs-toggle="tab" data-bs-target="#correlations" type="button" role="tab">
                                    <i class="fas fa-link me-1"></i>Correlations
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="insights-tab" data-bs-toggle="tab" data-bs-target="#insights" type="button" role="tab">
                                    <i class="fas fa-lightbulb me-1"></i>Trading Insights
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="data-table-tab" data-bs-toggle="tab" data-bs-target="#data-table" type="button" role="tab">
                                    <i class="fas fa-table me-1"></i>Data Points
                                </button>
                            </li>
                        </ul>
                        
                        <!-- Tab Content -->
                        <div class="tab-content" id="vixAnalysisTabContent">
                            <!-- Historical Analysis -->
                            <div class="tab-pane fade show active" id="historical" role="tabpanel">
                                <div class="row">
                                    <div class="col-12">
                                        <div id="vixHistoricalChart" style="height: 400px;"></div>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-6">
                                        <div id="optionPremiumChart" style="height: 300px;"></div>
                                    </div>
                                    <div class="col-md-6">
                                        <div id="vixVolumeChart" style="height: 300px;"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Predictions -->
                            <div class="tab-pane fade" id="predictions" role="tabpanel">
                                <div class="row">
                                    <div class="col-12">
                                        <div id="vixPredictionChart" style="height: 400px;"></div>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header bg-info text-white">
                                                <h6 class="mb-0">Probability Scenarios (30 Days)</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="row text-center">
                                                    <div class="col-4">
                                                        <h5 class="text-danger">${Math.round((predictions.probability_scenarios?.spike || 0) * 100)}%</h5>
                                                        <small class="text-muted">Spike</small>
                                                    </div>
                                                    <div class="col-4">
                                                        <h5 class="text-success">${Math.round((predictions.probability_scenarios?.decline || 0) * 100)}%</h5>
                                                        <small class="text-muted">Decline</small>
                                                    </div>
                                                    <div class="col-4">
                                                        <h5 class="text-info">${Math.round((predictions.probability_scenarios?.stable || 0) * 100)}%</h5>
                                                        <small class="text-muted">Stable</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header bg-warning text-white">
                                                <h6 class="mb-0">Mean Reversion Timeline</h6>
                                            </div>
                                            <div class="card-body text-center">
                                                <h3 class="text-warning">${predictions.mean_reversion_timeline || 15}</h3>
                                                <small class="text-muted">Expected days to reach target VIX level</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Correlations -->
                            <div class="tab-pane fade" id="correlations" role="tabpanel">
                                <div class="row">
                                    <div class="col-12">
                                        <div id="correlationChart" style="height: 400px;"></div>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-body text-center">
                                                <h4 class="${getCorrelationColor(correlations.vix_nifty)}">${(correlations.vix_nifty || 0).toFixed(3)}</h4>
                                                <small class="text-muted">VIX-Nifty Correlation</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-body text-center">
                                                <h4 class="${getCorrelationColor(correlations.vix_call_premiums)}">${(correlations.vix_call_premiums || 0).toFixed(3)}</h4>
                                                <small class="text-muted">VIX-Call Premium</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-body text-center">
                                                <h4 class="${getCorrelationColor(correlations.vix_put_premiums)}">${(correlations.vix_put_premiums || 0).toFixed(3)}</h4>
                                                <small class="text-muted">VIX-Put Premium</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Trading Insights -->
                            <div class="tab-pane fade" id="insights" role="tabpanel">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header bg-success text-white">
                                                <h6 class="mb-0">Recommended Option Strategy</h6>
                                            </div>
                                            <div class="card-body">
                                                <h6 class="text-primary">${insights.option_strategy?.primary || 'Neutral Spreads'}</h6>
                                                <p class="mb-2"><strong>Alternative:</strong> ${insights.option_strategy?.secondary || 'Calendar Spreads'}</p>
                                                <small class="text-muted">${insights.option_strategy?.description || 'Use neutral strategies with limited risk.'}</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header bg-danger text-white">
                                                <h6 class="mb-0">Risk Management</h6>
                                            </div>
                                            <div class="card-body">
                                                <ul class="list-unstyled">
                                                    ${(insights.risk_management || ['Maintain normal position sizing']).map(advice => 
                                                        `<li><i class="fas fa-shield-alt text-danger me-2"></i>${advice}</li>`
                                                    ).join('')}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header bg-info text-white">
                                                <h6 class="mb-0">Market Regime</h6>
                                            </div>
                                            <div class="card-body text-center">
                                                <h5 class="text-info">${formatMarketRegime(insights.market_regime)}</h5>
                                                <small class="text-muted">Current volatility environment</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header bg-warning text-white">
                                                <h6 class="mb-0">Timing Signals</h6>
                                            </div>
                                            <div class="card-body">
                                                <p><strong>Short-term:</strong> <span class="text-primary">${formatTimingSignal(insights.timing_signals?.short_term)}</span></p>
                                                <p><strong>Mean Reversion:</strong> <span class="text-info">${formatTimingSignal(insights.timing_signals?.mean_reversion)}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                            
                            <!-- Data Points Table -->
                            <div class="tab-pane fade" id="data-table" role="tabpanel">
                                <div class="row">
                                    <div class="col-12">
                                        <div class="table-responsive">
                                            <table class="table table-striped table-hover" id="vixDataTable">
                                                <thead class="table-dark">
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>VIX</th>
                                                        <th>Change</th>
                                                        <th>Change %</th>
                                                        <th>Nifty</th>
                                                        <th>Call Premium</th>
                                                        <th>Put Premium</th>
                                                        <th>Volume</th>
                                                        <th>Market Sentiment</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="vixDataTableBody">
                                                    <!-- Data will be populated here -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show VIX analysis error
 */
function showVixAnalysisError(errorMessage) {
    const existingModal = document.getElementById('vixAnalysisModal');
    if (existingModal) {
        const modalBody = existingModal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning" style="font-size: 48px;"></i>
                <h5 class="mt-3">Analysis Error</h5>
                <p class="text-muted">${errorMessage}</p>
                <button class="btn btn-primary" onclick="openVixAnalysis()">
                    <i class="fas fa-redo me-2"></i>Retry
                </button>
            </div>
        `;
    }
}

/**
 * Initialize VIX charts with Highcharts
 */
function initializeVixCharts(data) {
    const historical = data.historical || {};
    const predictions = data.predictions || {};
    const correlations = data.correlations || {};
    
    // Historical VIX Chart
    initHistoricalChart(historical);
    
    // Option Premium Chart
    initOptionPremiumChart(historical);
    
    // VIX Volume Chart
    initVixVolumeChart(historical);
    
    // Prediction Chart
    initPredictionChart(historical, predictions);
    
    // Correlation Chart
    initCorrelationChart(historical, correlations);
}

/**
 * Initialize historical VIX chart
 */
function initHistoricalChart(historical) {
    if (!historical.dates || !historical.vix_values) return;
    
    const dates = historical.dates.map(date => new Date(date).getTime());
    const vixData = historical.vix_values.map((value, index) => [dates[index], value]);
    const niftyData = historical.nifty_values?.map((value, index) => [dates[index], value]) || [];
    
    Highcharts.chart('vixHistoricalChart', {
        title: {
            text: 'VIX vs Nifty - 30 Day History'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: [{
            title: {
                text: 'VIX Level'
            },
            opposite: false
        }, {
            title: {
                text: 'Nifty Level'
            },
            opposite: true
        }],
        series: [{
            name: 'India VIX',
            data: vixData,
            color: '#ff6b35',
            yAxis: 0
        }, {
            name: 'Nifty 50',
            data: niftyData,
            color: '#1f77b4',
            yAxis: 1
        }]
    });
}

/**
 * Initialize option premium chart
 */
function initOptionPremiumChart(historical) {
    if (!historical.dates || !historical.call_premiums) return;
    
    const dates = historical.dates.map(date => new Date(date).getTime());
    const callData = historical.call_premiums.map((value, index) => [dates[index], value]);
    const putData = historical.put_premiums?.map((value, index) => [dates[index], value]) || [];
    
    Highcharts.chart('optionPremiumChart', {
        title: {
            text: 'Option Premium Trends'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: 'Premium'
            }
        },
        series: [{
            name: 'Call Premium',
            data: callData,
            color: '#28a745'
        }, {
            name: 'Put Premium', 
            data: putData,
            color: '#dc3545'
        }]
    });
}

/**
 * Initialize VIX volume chart
 */
function initVixVolumeChart(historical) {
    if (!historical.dates || !historical.volume_data) return;
    
    const dates = historical.dates.map(date => new Date(date).getTime());
    const volumeData = historical.volume_data.map((value, index) => [dates[index], value]);
    
    Highcharts.chart('vixVolumeChart', {
        chart: {
            type: 'column'
        },
        title: {
            text: 'VIX Trading Volume'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: 'Volume'
            }
        },
        series: [{
            name: 'Volume',
            data: volumeData,
            color: '#17a2b8'
        }]
    });
}

/**
 * Initialize prediction chart
 */
function initPredictionChart(historical, predictions) {
    if (!predictions.prediction_dates || !predictions.predicted_vix) return;
    
    // Historical data
    const histDates = historical.dates?.map(date => new Date(date).getTime()) || [];
    const histVix = historical.vix_values?.map((value, index) => [histDates[index], value]) || [];
    
    // Prediction data
    const predDates = predictions.prediction_dates.map(date => new Date(date).getTime());
    const predVix = predictions.predicted_vix.map((value, index) => [predDates[index], value]);
    const upperBand = predictions.confidence_bands?.upper?.map((value, index) => [predDates[index], value]) || [];
    const lowerBand = predictions.confidence_bands?.lower?.map((value, index) => [predDates[index], value]) || [];
    
    Highcharts.chart('vixPredictionChart', {
        title: {
            text: 'VIX Forecast - Next 30 Days'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: 'VIX Level'
            }
        },
        series: [{
            name: 'Historical VIX',
            data: histVix,
            color: '#ff6b35'
        }, {
            name: 'Predicted VIX',
            data: predVix,
            color: '#28a745',
            dashStyle: 'dash'
        }, {
            name: 'Upper Confidence',
            data: upperBand,
            color: '#ffc107',
            fillOpacity: 0.3
        }, {
            name: 'Lower Confidence',
            data: lowerBand,
            color: '#ffc107',
            fillOpacity: 0.3
        }]
    });
}

/**
 * Initialize correlation chart
 */
function initCorrelationChart(historical, correlations) {
    if (!historical.dates || !historical.vix_values || !historical.nifty_values) return;
    
    const vixData = historical.vix_values;
    const niftyData = historical.nifty_values;
    
    const scatterData = vixData.map((vix, index) => [vix, niftyData[index]]).filter(([x, y]) => x && y);
    
    Highcharts.chart('correlationChart', {
        chart: {
            type: 'scatter'
        },
        title: {
            text: `VIX-Nifty Correlation: ${(correlations.vix_nifty || 0).toFixed(3)}`
        },
        xAxis: {
            title: {
                text: 'VIX Level'
            }
        },
        yAxis: {
            title: {
                text: 'Nifty Level'
            }
        },
        series: [{
            name: 'VIX vs Nifty',
            data: scatterData,
            color: '#ff6b35'
        }]
    });
}

// Helper functions for formatting
function getVixColorClass(vix) {
    if (vix >= 25) return 'text-danger';
    if (vix >= 20) return 'text-warning';
    if (vix >= 15) return 'text-warning';
    if (vix >= 12) return 'text-info';
    return 'text-success';
}

function getSentimentColorClass(sentiment) {
    switch(sentiment) {
        case 'EXTREME_FEAR': return 'text-danger';
        case 'FEAR': return 'text-warning';
        case 'NEUTRAL': return 'text-info';
        case 'GREED': return 'text-success';
        case 'EXTREME_GREED': return 'text-primary';
        default: return 'text-muted';
    }
}

function getRiskColorClass(risk) {
    switch(risk) {
        case 'EXTREME': return 'text-danger';
        case 'HIGH': return 'text-warning';
        case 'MEDIUM': return 'text-info';
        case 'LOW': return 'text-success';
        default: return 'text-muted';
    }
}

function getSignalColorClass(signal) {
    switch(signal) {
        case 'BUY_VOLATILITY': return 'text-success';
        case 'SELL_VOLATILITY': return 'text-danger';
        case 'CAUTION': return 'text-warning';
        case 'NEUTRAL': return 'text-info';
        default: return 'text-muted';
    }
}

function getCorrelationColor(corr) {
    const absCorr = Math.abs(corr || 0);
    if (absCorr >= 0.7) return 'text-danger';
    if (absCorr >= 0.5) return 'text-warning';
    if (absCorr >= 0.3) return 'text-info';
    return 'text-success';
}

function formatSentiment(sentiment) {
    return (sentiment || 'NEUTRAL').replace('_', ' ');
}

function formatTradingSignal(signal) {
    return (signal || 'NEUTRAL').replace('_', ' ');
}

function formatMarketRegime(regime) {
    return (regime || 'NORMAL_VOLATILITY').replace('_', ' ');
}

function formatTimingSignal(signal) {
    return (signal || 'NEUTRAL').replace('_', ' ');
}

/**
 * Modal control functions
 */
function minimizeVixModal() {
    const modal = document.getElementById('vixAnalysisModal');
    if (modal) {
        modal.style.transform = 'scale(0.1)';
        modal.style.transformOrigin = 'bottom right';
        modal.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
            modal.style.display = 'none';
            // Create minimized indicator
            createMinimizedIndicator();
        }, 300);
    }
}

function maximizeVixModal() {
    const modal = document.getElementById('vixAnalysisModal');
    if (modal) {
        // First ensure modal is visible and not minimized
        modal.style.display = 'block';
        modal.style.transform = 'scale(1)';
        modal.style.transformOrigin = 'center';
        modal.style.transition = 'transform 0.3s ease';
        
        // Add fullscreen class to the modal dialog, not the modal itself
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.add('modal-fullscreen');
        }
        
        console.log('✅ VIX modal maximized to fullscreen');
    }
}

function closeVixModal() {
    const modal = document.getElementById('vixAnalysisModal');
    
    // Remove fullscreen mode before closing
    if (modal) {
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.remove('modal-fullscreen');
        }
    }
    
    // Ensure app remains selectable after modal close
    document.body.style.overflow = 'auto';
    document.body.classList.remove('modal-open');
    
    // Remove any backdrop elements
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    console.log('✅ VIX modal closed - app should be selectable');
}

function createMinimizedIndicator() {
    // Remove existing indicator
    const existing = document.getElementById('vixMinimizedIndicator');
    if (existing) existing.remove();
    
    // Create new minimized indicator
    const indicator = document.createElement('div');
    indicator.id = 'vixMinimizedIndicator';
    indicator.className = 'position-fixed bg-primary text-white p-2 rounded shadow-lg';
    indicator.style.cssText = `
        bottom: 20px;
        right: 20px;
        z-index: 1060;
        cursor: pointer;
        min-width: 200px;
    `;
    indicator.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <span><i class="fas fa-chart-line me-2"></i>VIX Analysis</span>
            <button class="btn btn-sm btn-outline-light" onclick="restoreVixModal()">
                <i class="fas fa-window-restore"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(indicator);
}

function restoreVixModal() {
    const modal = document.getElementById('vixAnalysisModal');
    const indicator = document.getElementById('vixMinimizedIndicator');
    
    if (modal) {
        modal.style.display = 'block';
        modal.style.transform = 'scale(1)';
        
        // Remove fullscreen from modal dialog, not modal itself
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.remove('modal-fullscreen');
        }
    }
    
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Populate VIX data table with historical data
 */
function populateVixDataTable(data) {
    const tableBody = document.getElementById('vixDataTableBody');
    if (!tableBody || !data.historical) return;
    
    const historical = data.historical;
    tableBody.innerHTML = '';
    
    for (let i = 0; i < historical.dates.length; i++) {
        const date = historical.dates[i];
        const vix = historical.vix_values[i];
        const nifty = historical.nifty_values[i];
        const callPremium = historical.call_premiums[i];
        const putPremium = historical.put_premiums[i];
        const volume = historical.volume_data[i];
        
        // Calculate change from previous day
        const prevVix = i > 0 ? historical.vix_values[i-1] : vix;
        const change = vix - prevVix;
        const changePercent = prevVix > 0 ? (change / prevVix) * 100 : 0;
        
        // Determine sentiment based on VIX level
        let sentiment = 'NEUTRAL';
        let sentimentClass = 'text-info';
        
        if (vix >= 25) {
            sentiment = 'EXTREME FEAR';
            sentimentClass = 'text-danger fw-bold';
        } else if (vix >= 20) {
            sentiment = 'FEAR';
            sentimentClass = 'text-warning';
        } else if (vix >= 15) {
            sentiment = 'NEUTRAL';
            sentimentClass = 'text-info';
        } else if (vix >= 12) {
            sentiment = 'GREED';
            sentimentClass = 'text-success';
        } else {
            sentiment = 'EXTREME GREED';
            sentimentClass = 'text-primary fw-bold';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(date)}</td>
            <td class="fw-bold ${getVixColorClass(vix)}">${vix.toFixed(2)}</td>
            <td class="${change >= 0 ? 'text-danger' : 'text-success'}">
                ${change >= 0 ? '+' : ''}${change.toFixed(2)}
            </td>
            <td class="${changePercent >= 0 ? 'text-danger' : 'text-success'}">
                ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
            </td>
            <td>${nifty.toFixed(2)}</td>
            <td class="text-success">${callPremium.toFixed(2)}</td>
            <td class="text-danger">${putPremium.toFixed(2)}</td>
            <td>${formatVolume(volume)}</td>
            <td class="${sentimentClass}">${sentiment}</td>
        `;
        
        tableBody.appendChild(row);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
    });
}

function formatVolume(volume) {
    if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toString();
}