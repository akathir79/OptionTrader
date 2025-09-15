/**
 * Futures vs Spot Analysis Modal
 * Deep analysis similar to VIX Analysis but for futures basis, contango/backwardation,
 * monthly contracts comparison, and arbitrage opportunities
 */

(function() {
    'use strict';
    
    console.log('🚀 FUTURES ANALYSIS SCRIPT LOADING...');
    console.log('🔍 Script execution started successfully');

    // Create namespace to avoid global conflicts
    window.FuturesAnalysis = window.FuturesAnalysis || {};
    const FA = window.FuturesAnalysis;
    FA.cache = FA.cache || {};
    FA.chartInstances = FA.chartInstances || {};

    console.log('✅ Futures analysis variables initialized');

/**
 * Safe data access and formatting helper functions
 */
function safeToFixed(value, decimals = 2) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return '--';
    }
    return value.toFixed(decimals);
}

function safeGet(obj, path, defaultValue = null) {
    try {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (current == null || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[key];
        }
        return current != null ? current : defaultValue;
    } catch (error) {
        console.warn('safeGet error:', error);
        return defaultValue;
    }
}

function safeArray(value, defaultValue = []) {
    return Array.isArray(value) ? value : defaultValue;
}

function safeNumber(value, defaultValue = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
}

/**
 * Open futures analysis modal - called from futures price click
 */
function openFuturesAnalysis() {
    try {
        console.log('🔮 Opening futures analysis modal...');
        
        // Get current symbol if not provided  
        let symbol;
        if (typeof getCurrentSelectedSymbol === 'function') {
            symbol = getCurrentSelectedSymbol() || 'NIFTY';
        } else {
            console.warn('getCurrentSelectedSymbol not available, using default NIFTY');
            symbol = 'NIFTY';
        }
        
        if (!symbol) {
            console.error('No symbol available for futures analysis');
            return;
        }
        
        console.log(`🔮 Starting futures analysis for: ${symbol}`);
        
        // Show loading modal first
        showFuturesAnalysisModal(null, true);
        
        // Fetch comprehensive futures analysis
        fetchFuturesAnalysis(symbol);
        
    } catch (error) {
        console.error('Error showing futures analysis modal:', error);
        showErrorInFuturesModal(error.message);
    }
}

/**
 * Show error in futures modal
 */
function showErrorInFuturesModal(errorMessage) {
    try {
        console.error('Showing futures analysis error:', errorMessage);
        
        // Remove existing modal if any
        const existingModal = document.getElementById('futuresAnalysisModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create error modal HTML
        const errorModalHTML = createFuturesErrorModalHTML(errorMessage);
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', errorModalHTML);
        
        // Show modal using Bootstrap
        const modal = new bootstrap.Modal(document.getElementById('futuresAnalysisModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error showing futures analysis error modal:', error);
        alert('Futures Analysis Error: ' + errorMessage);
    }
}

/**
 * Create error modal HTML
 */
function createFuturesErrorModalHTML(errorMessage) {
    return `
        <div class="modal fade" id="futuresAnalysisModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>Futures Analysis Error
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center py-5">
                        <div class="mb-4">
                            <i class="fas fa-exclamation-triangle text-danger" style="font-size: 4rem;"></i>
                        </div>
                        <h4 class="text-danger mb-3">Analysis Failed</h4>
                        <p class="text-muted mb-4">${errorMessage || 'No analysis data available'}</p>
                        <button type="button" class="btn btn-primary" onclick="location.reload()">
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize charts after modal is shown with data
 */
function initializeFuturesCharts(data) {
    try {
        console.log('🎯 Initializing futures charts with data:', data);
        
        // Note: Chart initialization will be implemented in future iterations
        // For now, just log that we have data
        if (data && data.monthly_contracts) {
            console.log('📊 Monthly contracts data available:', data.monthly_contracts.length, 'contracts');
        }
        
        if (data && data.arbitrage_opportunities) {
            console.log('💰 Arbitrage opportunities available:', data.arbitrage_opportunities);
        }
        
        // TODO: Implement actual chart rendering using Chart.js or similar
        
    } catch (error) {
        console.error('Error initializing futures charts:', error);
    }
}

/**
 * Modal control functions (like VIX modal)
 */
function minimizeFuturesModal() {
    const modal = document.getElementById('futuresAnalysisModal');
    if (modal) {
        modal.style.transform = 'scale(0.1)';
        modal.style.transformOrigin = 'bottom left';
        modal.style.transition = 'transform 0.3s ease';
        modal.style.zIndex = '1040';
        setTimeout(() => {
            modal.style.opacity = '0.8';
        }, 300);
    }
}

function maximizeFuturesModal() {
    const modal = document.getElementById('futuresAnalysisModal');
    if (modal) {
        // First ensure modal is visible and not minimized
        modal.style.transform = 'scale(1)';
        modal.style.opacity = '1';
        modal.style.transition = 'transform 0.3s ease';
        
        // Then make it fullscreen
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.maxWidth = '95vw';
            modalDialog.style.width = '95vw';
            modalDialog.style.height = '95vh';
            modalDialog.style.margin = '2.5vh auto';
        }
    }
}

function closeFuturesModal() {
    const modal = document.getElementById('futuresAnalysisModal');
    
    // Remove fullscreen mode before closing
    const modalDialog = modal?.querySelector('.modal-dialog');
    if (modalDialog) {
        modalDialog.style.maxWidth = '';
        modalDialog.style.width = '';
        modalDialog.style.height = '';
        modalDialog.style.margin = '';
    }
    
    // Reset transform and opacity
    if (modal) {
        modal.style.transform = '';
        modal.style.opacity = '';
        modal.style.transition = '';
    }
    
    // Use Bootstrap's hide method
    const bootstrapModal = bootstrap.Modal.getInstance(modal);
    if (bootstrapModal) {
        bootstrapModal.hide();
    }
}

// Initialize when DOM is ready (like VIX analysis)
console.log('🔄 Adding DOMContentLoaded listener...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔮 Futures Analysis system initialized');
    
    // Make functions globally available
    window.openFuturesAnalysis = openFuturesAnalysis;
    window.minimizeFuturesModal = minimizeFuturesModal;
    window.maximizeFuturesModal = maximizeFuturesModal;
    window.closeFuturesModal = closeFuturesModal;
    console.log('✅ All futures analysis functions made globally available');
    
    // Debug: Add click listener with more logging
    const futuresElement = document.getElementById('futuresPrice');
    if (futuresElement) {
        console.log('✅ Found futures price element, testing click handler');
        futuresElement.addEventListener('click', function(event) {
            console.log('🔥 CLICK DETECTED on futures price!', event);
            openFuturesAnalysis();
        });
    } else {
        console.warn('⚠️ Futures price element not found');
    }
});

/**
 * Show futures analysis modal triggered by clicking futures label
 */
function showFuturesAnalysisModal(data = null, loading = false) {
    try {
        console.log('🔮 showFuturesAnalysisModal called', { data: !!data, loading });
        
        // Enhanced data validation and error handling
        if (!loading && data && !data.success) {
            console.error('API returned error:', data.error);
            return showErrorInFuturesModal(data.error || 'API returned unsuccessful response');
        }
        
        if (!loading && (!data || typeof data !== 'object')) {
            console.error('Invalid data structure received:', data);
            return showErrorInFuturesModal('Invalid data structure received from API');
        }
        
        // Create modal HTML
        const modalHTML = createFuturesAnalysisModalHTML(data, loading);
        
        // Remove existing modal if any
        const existingModal = document.getElementById('futuresAnalysisModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal using Bootstrap
        const modal = new bootstrap.Modal(document.getElementById('futuresAnalysisModal'));
        modal.show();
        
        // Initialize charts and tabs after modal is shown
        if (data && !loading) {
            setTimeout(() => {
                initializeFuturesCharts(data);
            }, 100);
        }
        
    } catch (error) {
        console.error('Critical error in showFuturesAnalysisModal:', error);
        // Fallback to error modal instead of silent failure
        try {
            showErrorInFuturesModal(
                `Modal rendering failed: ${error.message}. This may be due to unexpected data structure or client-side processing errors.`
            );
        } catch (fallbackError) {
            console.error('Failed to show error modal:', fallbackError);
            alert('Futures Analysis Error: Modal failed to load. Please refresh the page.');
        }
    }
}

/**
 * Fetch comprehensive futures analysis data
 */
async function fetchFuturesAnalysis(symbol) {
    try {
        console.log(`📊 Fetching comprehensive futures analysis for ${symbol}...`);
        
        const response = await fetch(`/api/futures/deep-analysis?symbol=${encodeURIComponent(symbol)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if data exists and is valid
        if (!data) {
            throw new Error('No data received from futures analysis API');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch futures analysis');
        }
        
        // Validate required data structure
        if (!data.symbol) {
            console.warn('⚠️ Data missing symbol field, using provided symbol:', symbol);
            data.symbol = symbol;
        }
        
        console.log('✅ Futures analysis data received:', data);
        
        // Cache the data
        FA.cache[symbol] = data;
        
        // Update modal with real data
        showFuturesAnalysisModal(data, false);
        
    } catch (error) {
        console.error('❌ Error fetching futures analysis:', error);
        
        // Show error in modal
        showErrorInFuturesModal(error.message);
    }
}

/**
 * Create futures analysis modal HTML
 */
function createFuturesAnalysisModalHTML(data, loading) {
    if (loading) {
        return `
            <div class="modal fade" id="futuresAnalysisModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-chart-area me-2"></i>Futures vs Spot Deep Analysis
                            </h5>
                            <div class="d-flex">
                                <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="minimizeFuturesModal()">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="maximizeFuturesModal()">
                                    <i class="fas fa-expand"></i>
                                </button>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" onclick="closeFuturesModal()"></button>
                            </div>
                        </div>
                        <div class="modal-body text-center py-5">
                            <div class="spinner-border text-success" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3">Loading comprehensive futures analysis...</p>
                            <small class="text-muted">Real-time RBI repo rate, basis analysis, and arbitrage detection</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Full modal with data - add null checking
    if (!data) {
        console.error('❌ No data provided to createFuturesAnalysisModalHTML');
        return showErrorInFuturesModal('No analysis data available');
    }
    
    const symbol = data.symbol || 'Unknown Symbol';
    const currentData = data.current_market_data || {};
    const monthlyContracts = data.monthly_contracts || [];
    const fairValue = data.fair_value_analysis || {};
    const signals = data.trading_signals || [];
    const arbitrage = data.arbitrage_opportunities || {};
    const riskAnalysis = data.risk_analysis || {};
    const rbiData = data.rbi_data || {};
    const summary = data.summary || {};
    
    return `
        <div class="modal fade" id="futuresAnalysisModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-chart-area me-2"></i>Futures vs Spot Analysis - ${symbol}
                        </h5>
                        <div class="d-flex">
                            <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="minimizeFuturesModal()">
                                <i class="fas fa-minus"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-light me-2" onclick="maximizeFuturesModal()">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" onclick="closeFuturesModal()"></button>
                        </div>
                    </div>
                    <div class="modal-body p-0">
                        <!-- Tabs Navigation -->
                        <ul class="nav nav-tabs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" data-bs-toggle="tab" href="#overview-tab">
                                    <i class="fas fa-tachometer-alt me-1"></i>Overview
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#basis-tab">
                                    <i class="fas fa-chart-line me-1"></i>Basis Analysis
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#monthly-tab">
                                    <i class="fas fa-calendar-alt me-1"></i>Monthly Contracts
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#arbitrage-tab">
                                    <i class="fas fa-coins me-1"></i>Arbitrage
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#signals-tab">
                                    <i class="fas fa-signal me-1"></i>Trading Signals
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#data-tab">
                                    <i class="fas fa-table me-1"></i>Data
                                </a>
                            </li>
                        </ul>
                        
                        <!-- Tab Content -->
                        <div class="tab-content p-4">
                            <!-- Overview Tab -->
                            <div class="tab-pane fade show active" id="overview-tab">
                                ${createOverviewTab(data)}
                            </div>
                            
                            <!-- Basis Analysis Tab -->
                            <div class="tab-pane fade" id="basis-tab">
                                ${createBasisAnalysisTab(data)}
                            </div>
                            
                            <!-- Monthly Contracts Tab -->
                            <div class="tab-pane fade" id="monthly-tab">
                                ${createMonthlyContractsTab(data)}
                            </div>
                            
                            <!-- Arbitrage Tab -->
                            <div class="tab-pane fade" id="arbitrage-tab">
                                ${createArbitrageTab(data)}
                            </div>
                            
                            <!-- Trading Signals Tab -->
                            <div class="tab-pane fade" id="signals-tab">
                                ${createTradingSignalsTab(data)}
                            </div>
                            
                            <!-- Data Tab -->
                            <div class="tab-pane fade" id="data-tab">
                                ${createDataTab(data)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create overview tab content
 */
function createOverviewTab(data) {
    try {
        // Safe data extraction with null checks
        const currentData = safeGet(data, 'current_market_data', {});
        const rbiData = safeGet(data, 'rbi_data', {});
        const summary = safeGet(data, 'summary', {});
        const fairValue = safeGet(data, 'fair_value_analysis', {});
        
        const spotPrice = safeNumber(safeGet(currentData, 'spot_price'), 0);
        const futuresPrice = safeNumber(safeGet(currentData, 'futures_price'), 0);
        const basis = futuresPrice - spotPrice;
        const basisPct = spotPrice !== 0 ? safeToFixed((basis / spotPrice * 100), 2) : '--';
    
    return `
        <div class="row">
            <!-- Current Market Data -->
            <div class="col-md-6">
                <div class="card border-primary">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Current Market Data</h6>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-6">
                                <h5 class="text-primary">${safeToFixed(spotPrice, 2)}</h5>
                                <small class="text-muted">Spot Price</small>
                            </div>
                            <div class="col-6">
                                <h5 class="text-success">${safeToFixed(futuresPrice, 2)}</h5>
                                <small class="text-muted">Futures Price</small>
                            </div>
                        </div>
                        <hr>
                        <div class="text-center">
                            <h4 class="${basis >= 0 ? 'text-success' : 'text-danger'}">
                                ${basis >= 0 ? '+' : ''}${safeToFixed(basis, 2)} (${basisPct}%)
                            </h4>
                            <small class="text-muted">Basis (Futures - Spot)</small>
                        </div>
                        <div class="mt-3">
                            <div class="badge ${basis > 0 ? 'bg-success' : basis < 0 ? 'bg-danger' : 'bg-secondary'} w-100 p-2">
                                ${basis > 0 ? 'CONTANGO' : basis < 0 ? 'BACKWARDATION' : 'NORMAL'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- RBI Data & Fair Value -->
            <div class="col-md-6">
                <div class="card border-warning">
                    <div class="card-header bg-warning text-dark">
                        <h6 class="mb-0"><i class="fas fa-university me-2"></i>RBI Data & Fair Value</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <h5 class="text-warning">${safeToFixed(safeGet(rbiData, 'current_repo_rate', 5.50), 2)}%</h5>
                                <small class="text-muted">RBI Repo Rate</small>
                                <div class="mt-1">
                                    <span class="badge bg-light text-dark">${rbiData.rate_source || 'Live'}</span>
                                </div>
                            </div>
                            <div class="col-6">
                                <h5 class="text-info">${safeToFixed(safeGet(fairValue, 'theoretical_fair_value'))}</h5>
                                <small class="text-muted">Fair Value</small>
                                <div class="mt-1">
                                    <span class="badge ${fairValue.arbitrage_profitable ? 'bg-success' : 'bg-secondary'}">
                                        ${fairValue.arbitrage_profitable ? 'Arbitrage' : 'Fair'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <div class="text-center">
                            <small class="text-muted">Gap: ${safeToFixed(safeGet(fairValue, 'fair_value_gap'))} points</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <!-- Risk Analysis -->
            <div class="col-md-8">
                <div class="card border-info">
                    <div class="card-header bg-info text-white">
                        <h6 class="mb-0"><i class="fas fa-shield-alt me-2"></i>Market Risk Analysis</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-3 text-center">
                                <h5 class="text-primary">${summary.overall_regime || 'NORMAL'}</h5>
                                <small class="text-muted">Market Regime</small>
                            </div>
                            <div class="col-3 text-center">
                                <h5 class="text-warning">${summary.risk_level || 'MEDIUM'}</h5>
                                <small class="text-muted">Risk Level</small>
                            </div>
                            <div class="col-3 text-center">
                                <h5 class="text-success">${safeToFixed(safeGet(summary, 'arbitrage_score'), 0)}%</h5>
                                <small class="text-muted">Arbitrage Score</small>
                            </div>
                            <div class="col-3 text-center">
                                <h5 class="text-info">${safeArray(safeGet(data, 'trading_signals')).length}</h5>
                                <small class="text-muted">Active Signals</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Trading Recommendation -->
            <div class="col-md-4">
                <div class="card border-success">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0"><i class="fas fa-thumbs-up me-2"></i>Recommendation</h6>
                    </div>
                    <div class="card-body text-center">
                        <h4 class="text-success">${safeGet(summary, 'trading_recommendation', 'HOLD')}</h4>
                        <div class="mt-2">
                            <small class="text-muted">Based on ${safeArray(safeGet(data, 'trading_signals')).length} signals</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error creating overview tab:', error);
        return `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Overview</h5>
                <p>Failed to load overview data: ${error.message}</p>
                <small>Please refresh the page or try again later.</small>
            </div>
        `;
    }
}

/**
 * Create basis analysis tab
 */
function createBasisAnalysisTab(data) {
    try {
        // Safe data extraction with null checks
        const historical = safeGet(data, 'historical_analysis', {});
        const fairValue = safeGet(data, 'fair_value_analysis', {});
    
    return `
        <div class="row">
            <div class="col-md-6">
                <div id="basisChart" style="height: 400px;"></div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Basis Statistics (30 Days)</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <tr>
                                    <td>Mean Basis:</td>
                                    <td class="text-end">${safeToFixed(safeGet(historical, 'basis_statistics.mean_basis'))}</td>
                                </tr>
                                <tr>
                                    <td>Std Deviation:</td>
                                    <td class="text-end">${safeToFixed(safeGet(historical, 'basis_statistics.std_deviation'))}</td>
                                </tr>
                                <tr>
                                    <td>Current Percentile:</td>
                                    <td class="text-end">${safeToFixed(safeGet(historical, 'basis_statistics.current_percentile'), 1)}%</td>
                                </tr>
                                <tr>
                                    <td>Contango Days:</td>
                                    <td class="text-end">${safeGet(historical, 'basis_statistics.contango_days', '--')}</td>
                                </tr>
                                <tr>
                                    <td>Backwardation Days:</td>
                                    <td class="text-end">${safeGet(historical, 'basis_statistics.backwardation_days', '--')}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-3">
                    <div class="card-header">
                        <h6 class="mb-0">Fair Value Analysis</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <tr>
                                    <td>Repo Rate:</td>
                                    <td class="text-end">${safeToFixed(safeGet(fairValue, 'carry_components.repo_rate'))}%</td>
                                </tr>
                                <tr>
                                    <td>Dividend Yield:</td>
                                    <td class="text-end">${safeToFixed(safeGet(fairValue, 'carry_components.dividend_yield'))}%</td>
                                </tr>
                                <tr>
                                    <td>Net Carry:</td>
                                    <td class="text-end">${safeToFixed(safeGet(fairValue, 'carry_components.net_carry_rate'))}%</td>
                                </tr>
                                <tr>
                                    <td>Days to Expiry:</td>
                                    <td class="text-end">${safeGet(fairValue, 'carry_components.days_remaining', '--')}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error creating basis analysis tab:', error);
        return `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Basis Analysis</h5>
                <p>Failed to load basis analysis data: ${error.message}</p>
                <small>Please refresh the page or try again later.</small>
            </div>
        `;
    }
}

/**
 * Create monthly contracts tab
 */
function createMonthlyContractsTab(data) {
    try {
        // Safe data extraction with null checks
        const monthlyContracts = safeArray(safeGet(data, 'monthly_contracts'));
    
    let contractsHTML = '';
    if (monthlyContracts.length > 0) {
        contractsHTML = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Contract</th>
                            <th>Expiry</th>
                            <th>Days Left</th>
                            <th>Futures Price</th>
                            <th>Basis</th>
                            <th>Basis %</th>
                            <th>Fair Value</th>
                            <th>Carry %</th>
                            <th>Regime</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthlyContracts.map(contract => {
                            // Safe access to contract properties with null checks
                            const contractSymbol = safeGet(contract, 'contract_symbol', 'N/A');
                            const symbolDisplay = contractSymbol.includes(':') ? contractSymbol.split(':')[1] : contractSymbol;
                            const expiryDate = safeGet(contract, 'expiry_date');
                            const expiryDisplay = expiryDate ? new Date(expiryDate).toLocaleDateString() : '--';
                            const daysToExpiry = safeGet(contract, 'days_to_expiry', '--');
                            const futuresPrice = safeNumber(safeGet(contract, 'futures_price'));
                            const basis = safeNumber(safeGet(contract, 'basis'));
                            const basisPct = safeNumber(safeGet(contract, 'basis_percentage'));
                            const fairValue = safeNumber(safeGet(contract, 'fair_value'));
                            const annualizedCarry = safeNumber(safeGet(contract, 'annualized_carry'));
                            const regime = safeGet(contract, 'regime', 'NORMAL');
                            const isNearMonth = safeGet(contract, 'is_near_month', false);
                            
                            return `
                            <tr class="${isNearMonth ? 'table-warning' : ''}">
                                <td>
                                    <span class="badge ${isNearMonth ? 'bg-primary' : 'bg-secondary'}">
                                        ${symbolDisplay}
                                    </span>
                                </td>
                                <td>${expiryDisplay}</td>
                                <td>${daysToExpiry}</td>
                                <td>${safeToFixed(futuresPrice, 2)}</td>
                                <td class="${basis >= 0 ? 'text-success' : 'text-danger'}">
                                    ${basis >= 0 ? '+' : ''}${safeToFixed(basis, 2)}
                                </td>
                                <td class="${basisPct >= 0 ? 'text-success' : 'text-danger'}">
                                    ${basisPct >= 0 ? '+' : ''}${safeToFixed(basisPct, 2)}%
                                </td>
                                <td>${safeToFixed(fairValue, 2)}</td>
                                <td>${safeToFixed(annualizedCarry, 2)}%</td>
                                <td>
                                    <span class="badge ${
                                        regime === 'CONTANGO' ? 'bg-success' : 
                                        regime === 'BACKWARDATION' ? 'bg-danger' : 'bg-secondary'
                                    }">
                                        ${regime}
                                    </span>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        contractsHTML = '<div class="alert alert-info">No monthly contracts data available</div>';
    }
    
    return `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-calendar-alt me-2"></i>Monthly Contracts Comparison
                        </h6>
                    </div>
                    <div class="card-body">
                        ${contractsHTML}
                    </div>
                </div>
                
                <div class="mt-3">
                    <div id="termStructureChart" style="height: 350px;"></div>
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error creating monthly contracts tab:', error);
        return `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Monthly Contracts</h5>
                <p>Failed to load monthly contracts data: ${error.message}</p>
                <small>Please refresh the page or try again later.</small>
            </div>
        `;
    }
}

/**
 * Create arbitrage opportunities tab
 */
function createArbitrageTab(data) {
    try {
        // Safe data extraction with null checks
        const arbitrage = safeGet(data, 'arbitrage_opportunities', {});
        const opportunities = safeArray(safeGet(arbitrage, 'opportunities'));
    
    let opportunitiesHTML = '';
    if (opportunities.length > 0) {
        opportunitiesHTML = opportunities.map(opp => `
            <div class="card mb-3">
                <div class="card-header bg-success text-white">
                    <h6 class="mb-0">${opp.type}</h6>
                </div>
                <div class="card-body">
                    <p>${opp.description}</p>
                    <div class="row">
                        <div class="col-md-3">
                            <strong>Expected Return:</strong><br>
                            <span class="text-success">${safeToFixed(safeGet(opp, 'expected_return'))}%</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Confidence:</strong><br>
                            <span class="text-primary">${safeGet(opp, 'confidence', '--')}%</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Complexity:</strong><br>
                            <span class="text-info">${safeGet(opp, 'execution_complexity', '--')}</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Capital Required:</strong><br>
                            <span class="text-warning">₹${safeNumber(safeGet(opp, 'capital_required')).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        opportunitiesHTML = '<div class="alert alert-info">No arbitrage opportunities detected at current market conditions</div>';
    }
    
    return `
        <div class="row">
            <div class="col-md-8">
                <h5>Arbitrage Opportunities</h5>
                ${opportunitiesHTML}
            </div>
            <div class="col-md-4">
                <div class="card border-success">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0">Overall Assessment</h6>
                    </div>
                    <div class="card-body text-center">
                        <h3 class="text-success">${safeGet(arbitrage, 'overall_assessment', 'LOW')}</h3>
                        <p class="mb-2">Opportunities Found: ${safeGet(arbitrage, 'opportunities_found', 0)}</p>
                        <p class="mb-2">Avg Confidence: ${safeToFixed(safeGet(arbitrage, 'confidence'), 0)}%</p>
                        <div class="mt-3">
                            <span class="badge ${
                                safeGet(arbitrage, 'recommended_action') === 'EXECUTE' ? 'bg-success' :
                                safeGet(arbitrage, 'recommended_action') === 'MONITOR' ? 'bg-warning' : 'bg-secondary'
                            } p-2">
                                ${safeGet(arbitrage, 'recommended_action', 'WAIT')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error creating arbitrage tab:', error);
        return `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Arbitrage Analysis</h5>
                <p>Failed to load arbitrage data: ${error.message}</p>
                <small>Please refresh the page or try again later.</small>
            </div>
        `;
    }
}

/**
 * Create trading signals tab
 */
function createTradingSignalsTab(data) {
    try {
        const signals = safeArray(safeGet(data, 'trading_signals'));
    
    let signalsHTML = '';
    if (signals.length > 0) {
        signalsHTML = signals.map(signal => `
            <div class="card mb-3">
                <div class="card-header ${
                    signal.confidence >= 80 ? 'bg-success' :
                    signal.confidence >= 60 ? 'bg-warning' : 'bg-secondary'
                } text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${signal.signal_type}</h6>
                        <span class="badge bg-light text-dark">${safeGet(signal, 'confidence', '--')}% Confidence</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Action:</strong> <span class="text-primary">${safeGet(signal, 'action', 'N/A')}</span></p>
                            <p><strong>Risk Level:</strong> <span class="text-info">${safeGet(signal, 'risk_level', '--')}</span></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Time Horizon:</strong> ${safeGet(signal, 'time_horizon', '--')}</p>
                            <p><strong>Expected Return:</strong> ${safeToFixed(safeGet(signal, 'expected_return'))}%</p>
                        </div>
                    </div>
                    <p class="text-muted">${safeGet(signal, 'description', 'No description available')}</p>
                </div>
            </div>
        `).join('');
    } else {
        signalsHTML = '<div class="alert alert-info">No active trading signals at current market conditions</div>';
    }
    
    return `
        <div class="row">
            <div class="col-12">
                <h5>Active Trading Signals</h5>
                ${signalsHTML}
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error creating trading signals tab:', error);
        return `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Trading Signals</h5>
                <p>Failed to load trading signals data: ${error.message}</p>
                <small>Please refresh the page or try again later.</small>
            </div>
        `;
    }
}

/**
 * Create data tab with organized tables
 */
function createDataTab(data) {
    try {
        if (!data) {
            return '<div class="alert alert-warning">No analysis data available</div>';
        }

        const currentData = safeGet(data, 'current_market_data', {});
        const monthlyContracts = safeArray(safeGet(data, 'monthly_contracts', []));
        const arbitrageOpportunities = safeArray(safeGet(data, 'arbitrage_opportunities.opportunities', []));
        const fairValueAnalysis = safeGet(data, 'fair_value_analysis', {});
        const rbiData = safeGet(data, 'rbi_data', {});
        const tradingSignals = safeArray(safeGet(data, 'trading_signals', []));

        return `
        <div class="row">
            <!-- Current Market Data -->
            <div class="col-md-6 mb-3">
                <div class="card h-100">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0"><i class="fas fa-chart-line me-2"></i>Current Market Data</h6>
                    </div>
                    <div class="card-body">
                        <table class="table table-sm">
                            <tr><td><strong>Spot Price</strong></td><td>₹${safeToFixed(currentData.spot_price)}</td></tr>
                            <tr><td><strong>Futures Price</strong></td><td>₹${safeToFixed(currentData.futures_price)}</td></tr>
                            <tr><td><strong>Basis</strong></td><td>${safeToFixed(safeGet(currentData, 'analysis.basis'))} pts</td></tr>
                            <tr><td><strong>Basis %</strong></td><td>${safeToFixed(safeGet(currentData, 'analysis.basis_pct'), 4)}%</td></tr>
                            <tr><td><strong>Days to Expiry</strong></td><td>${safeGet(currentData, 'analysis.days_to_expiry', '--')}</td></tr>
                            <tr><td><strong>Fair Value</strong></td><td>₹${safeToFixed(safeGet(currentData, 'analysis.fair_value'))}</td></tr>
                            <tr><td><strong>Regime</strong></td><td><span class="badge bg-info">${safeGet(currentData, 'analysis.regime', 'Unknown')}</span></td></tr>
                            <tr><td><strong>Confidence Score</strong></td><td>${safeGet(currentData, 'analysis.confidence_score', '--')}/100</td></tr>
                        </table>
                    </div>
                </div>
            </div>

            <!-- RBI & Fair Value Data -->
            <div class="col-md-6 mb-3">
                <div class="card h-100">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0"><i class="fas fa-university me-2"></i>RBI & Fair Value Data</h6>
                    </div>
                    <div class="card-body">
                        <table class="table table-sm">
                            <tr><td><strong>RBI Repo Rate</strong></td><td>${safeToFixed(rbiData.current_repo_rate, 2)}%</td></tr>
                            <tr><td><strong>Last Updated</strong></td><td>${rbiData.last_updated || '--'}</td></tr>
                            <tr><td><strong>Theoretical Fair Value</strong></td><td>₹${safeToFixed(fairValueAnalysis.theoretical_fair_value)}</td></tr>
                            <tr><td><strong>Fair Value Gap</strong></td><td>${safeToFixed(fairValueAnalysis.fair_value_gap)} pts</td></tr>
                            <tr><td><strong>Gap %</strong></td><td>${safeToFixed(fairValueAnalysis.gap_percentage, 4)}%</td></tr>
                            <tr><td><strong>Arbitrage Profitable</strong></td><td>
                                <span class="badge ${fairValueAnalysis.arbitrage_profitable ? 'bg-success' : 'bg-danger'}">
                                    ${fairValueAnalysis.arbitrage_profitable ? 'Yes' : 'No'}
                                </span>
                            </td></tr>
                            <tr><td><strong>Net Carry Rate</strong></td><td>${safeToFixed(safeGet(fairValueAnalysis, 'carry_components.net_carry_rate'), 2)}%</td></tr>
                            <tr><td><strong>Dividend Yield</strong></td><td>${safeToFixed(safeGet(fairValueAnalysis, 'carry_components.dividend_yield'), 2)}%</td></tr>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Monthly Contracts -->
            <div class="col-12 mb-3">
                <div class="card">
                    <div class="card-header bg-warning text-dark">
                        <h6 class="mb-0"><i class="fas fa-calendar-alt me-2"></i>Monthly Contracts (${monthlyContracts.length})</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-sm">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Contract</th>
                                        <th>Expiry</th>
                                        <th>Futures Price</th>
                                        <th>Basis</th>
                                        <th>Basis %</th>
                                        <th>Days to Expiry</th>
                                        <th>Fair Value</th>
                                        <th>FV Gap</th>
                                        <th>Regime</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${monthlyContracts.map(contract => `
                                        <tr ${contract.is_near_month ? 'class="table-primary"' : ''}>
                                            <td><strong>${contract.contract_symbol || '--'}</strong></td>
                                            <td>${contract.expiry_date || '--'}</td>
                                            <td>₹${safeToFixed(contract.futures_price)}</td>
                                            <td>${safeToFixed(contract.basis)} pts</td>
                                            <td>${safeToFixed(contract.basis_percentage, 3)}%</td>
                                            <td>${contract.days_to_expiry || '--'}</td>
                                            <td>₹${safeToFixed(contract.fair_value)}</td>
                                            <td>${safeToFixed(contract.fair_value_gap)} pts</td>
                                            <td><span class="badge bg-secondary">${contract.regime || 'Unknown'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Arbitrage Opportunities -->
            <div class="col-md-6 mb-3">
                <div class="card h-100">
                    <div class="card-header bg-danger text-white">
                        <h6 class="mb-0"><i class="fas fa-chart-area me-2"></i>Arbitrage Opportunities (${arbitrageOpportunities.length})</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Type</th>
                                        <th>Confidence</th>
                                        <th>Expected Return</th>
                                        <th>Complexity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${arbitrageOpportunities.map(opp => `
                                        <tr>
                                            <td><span class="badge bg-info">${opp.type || '--'}</span></td>
                                            <td>${opp.confidence || '--'}%</td>
                                            <td>${safeToFixed(opp.expected_return, 4)}%</td>
                                            <td><span class="badge ${opp.execution_complexity === 'LOW' ? 'bg-success' : opp.execution_complexity === 'MEDIUM' ? 'bg-warning' : 'bg-danger'}">${opp.execution_complexity || '--'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Trading Signals -->
            <div class="col-md-6 mb-3">
                <div class="card h-100">
                    <div class="card-header bg-info text-white">
                        <h6 class="mb-0"><i class="fas fa-signal me-2"></i>Trading Signals (${tradingSignals.length})</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Signal Type</th>
                                        <th>Action</th>
                                        <th>Confidence</th>
                                        <th>Risk Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tradingSignals.map(signal => `
                                        <tr>
                                            <td><span class="badge bg-primary">${signal.signal_type || '--'}</span></td>
                                            <td><strong>${signal.action || '--'}</strong></td>
                                            <td>${signal.confidence || '--'}%</td>
                                            <td><span class="badge ${signal.risk_level === 'VERY_LOW' || signal.risk_level === 'LOW' ? 'bg-success' : signal.risk_level === 'MEDIUM' ? 'bg-warning' : 'bg-danger'}">${signal.risk_level || '--'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    } catch (error) {
        console.error('Error creating data tab:', error);
        return `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle me-2"></i>Error Loading Data</h5>
                <p>Failed to load analysis data: ${error.message}</p>
                <small>Please refresh the page or try again later.</small>
            </div>
        `;
    }
}

/**
 * Show futures analysis modal with data
 */
function showFuturesAnalysisModal(data, loading = false) {
    // Remove existing modal if any
    const existingModal = document.getElementById('futuresAnalysisModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = createFuturesAnalysisModalHTML(data, loading);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('futuresAnalysisModal'), {
        size: 'xl',
        backdrop: 'static'
    });
    modal.show();
    
    // Initialize charts if data is loaded
    if (data && !loading) {
        setTimeout(() => {
            initializeFuturesCharts(data);
        }, 100);
    }
}

/**
 * Initialize charts in the futures analysis modal
 */
function initializeFuturesCharts(data) {
    try {
        // Initialize basis chart
        initializeBasisChart(data);
        
        // Initialize term structure chart
        initializeTermStructureChart(data);
        
        console.log('✅ Futures analysis charts initialized');
    } catch (error) {
        console.error('Error initializing futures charts:', error);
    }
}

/**
 * Initialize basis chart
 */
function initializeBasisChart(data) {
    const chartContainer = document.getElementById('basisChart');
    if (!chartContainer) return;
    
    // Simulated historical basis data
    const historical = data.historical_analysis?.basis_statistics;
    const dates = Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.getTime();
    });
    
    const basisData = dates.map(() => (Math.random() - 0.5) * 50 + 15);
    
    chartInstances.basisChart = Highcharts.chart('basisChart', {
        title: {
            text: 'Basis Analysis (30 Days)'
        },
        xAxis: {
            type: 'datetime',
            title: { text: 'Date' }
        },
        yAxis: {
            title: { text: 'Basis (Points)' },
            plotLines: [{
                value: 0,
                color: '#ff0000',
                width: 1,
                label: { text: 'Zero Basis' }
            }]
        },
        series: [{
            name: 'Basis',
            data: dates.map((date, i) => [date, basisData[i]]),
            color: '#28a745'
        }],
        credits: { enabled: false }
    });
}

/**
 * Initialize term structure chart
 */
function initializeTermStructureChart(data) {
    const chartContainer = document.getElementById('termStructureChart');
    if (!chartContainer) return;
    
    const monthlyContracts = data.monthly_contracts || [];
    
    if (monthlyContracts.length === 0) return;
    
    const categories = monthlyContracts.map(contract => 
        new Date(contract.expiry_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    );
    
    const futuresPrices = monthlyContracts.map(contract => contract.futures_price);
    const basisPercentages = monthlyContracts.map(contract => contract.basis_percentage);
    
    chartInstances.termStructureChart = Highcharts.chart('termStructureChart', {
        title: {
            text: 'Term Structure - Monthly Contracts'
        },
        xAxis: {
            categories: categories,
            title: { text: 'Contract Month' }
        },
        yAxis: [{
            title: { text: 'Futures Price' },
            labels: { style: { color: '#007bff' } }
        }, {
            title: { text: 'Basis %' },
            labels: { style: { color: '#28a745' } },
            opposite: true
        }],
        series: [{
            name: 'Futures Price',
            data: futuresPrices,
            color: '#007bff',
            yAxis: 0
        }, {
            name: 'Basis %',
            data: basisPercentages,
            color: '#28a745',
            type: 'column',
            yAxis: 1
        }],
        credits: { enabled: false }
    });
}

/**
 * Show error in futures modal
 */
function showErrorInFuturesModal(errorMessage) {
    const modalHTML = `
        <div class="modal fade" id="futuresAnalysisModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>Futures Analysis Error
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center py-4">
                        <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                        <h4 class="mt-3">Analysis Failed</h4>
                        <p class="text-muted">${errorMessage}</p>
                        <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('futuresAnalysisModal'));
    modal.show();
}

/**
 * Modal control functions
 */
function minimizeFuturesModal() {
    const modal = document.getElementById('futuresAnalysisModal');
    if (modal) {
        modal.style.transform = 'scale(0.1)';
        modal.style.transformOrigin = 'bottom right';
        modal.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
            modal.style.display = 'none';
            createMinimizedFuturesIndicator();
        }, 300);
    }
}

function maximizeFuturesModal() {
    const modal = document.getElementById('futuresAnalysisModal');
    if (modal) {
        modal.style.display = 'block';
        modal.style.transform = 'scale(1)';
        modal.style.transformOrigin = 'center';
        modal.style.transition = 'transform 0.3s ease';
        
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.add('modal-fullscreen');
        }
    }
}

function closeFuturesModal() {
    const modal = document.getElementById('futuresAnalysisModal');
    if (modal) {
        // Get Bootstrap modal instance and properly hide it
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            // Create instance and hide if one doesn't exist
            const newModalInstance = new bootstrap.Modal(modal);
            newModalInstance.hide();
        }
        
        // Clean up modal styles after a short delay
        setTimeout(() => {
            const modalDialog = modal.querySelector('.modal-dialog');
            if (modalDialog) {
                modalDialog.classList.remove('modal-fullscreen');
                modalDialog.style.maxWidth = '';
                modalDialog.style.width = '';
                modalDialog.style.height = '';
                modalDialog.style.margin = '';
            }
            
            // Clean up charts if they exist
            if (typeof FA !== 'undefined' && FA.chartInstances) {
                Object.values(FA.chartInstances).forEach(chart => {
                    if (chart && chart.destroy) {
                        chart.destroy();
                    }
                });
                FA.chartInstances = {};
            }
        }, 100);
    }
}

function createMinimizedFuturesIndicator() {
    const existing = document.getElementById('futuresMinimizedIndicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'futuresMinimizedIndicator';
    indicator.className = 'position-fixed bg-success text-white p-2 rounded shadow-lg';
    indicator.style.cssText = `
        bottom: 20px;
        left: 20px;
        z-index: 1060;
        cursor: pointer;
        min-width: 200px;
    `;
    indicator.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span><i class="fas fa-chart-area me-2"></i>Futures Analysis</span>
            <i class="fas fa-expand"></i>
        </div>
    `;
    
    indicator.onclick = () => {
        indicator.remove();
        maximizeFuturesModal();
    };
    
    document.body.appendChild(indicator);
}

/**
 * Get current selected symbol for analysis
 */
function getCurrentSelectedSymbol() {
    // Try to get from VIX analysis first
    if (window.getCurrentSymbolForVixAnalysis) {
        return window.getCurrentSymbolForVixAnalysis();
    }
    
    // Fallback to dropdown selections
    const indexSelect = document.getElementById('indexSelect');
    const exchangeSelect = document.getElementById('exchangeSelect');
    const symbolSelect = document.getElementById('extraSelect');
    
    if (symbolSelect && symbolSelect.value && symbolSelect.value !== "Select Symbol") {
        const exchange = exchangeSelect?.value || 'NSE';
        const symbol = symbolSelect.value;
        
        if (exchange === 'MCX') {
            return `${exchange}:${symbol}`;
        } else {
            return `${exchange}:${symbol}-EQ`;
        }
    }
    
    if (indexSelect && indexSelect.value && indexSelect.value !== "Select Index") {
        const indexMapping = {
            'NIFTY': 'NSE:NIFTY50-INDEX',
            'BANKNIFTY': 'NSE:BANKNIFTY-INDEX',
            'FINNIFTY': 'NSE:FINNIFTY-INDEX'
        };
        return indexMapping[indexSelect.value] || 'NSE:NIFTY50-INDEX';
    }
    
    return 'NSE:NIFTY50-INDEX'; // Default
}

    // Export functions for global access
    window.showFuturesAnalysisModal = showFuturesAnalysisModal;
    window.minimizeFuturesModal = minimizeFuturesModal;
    window.maximizeFuturesModal = maximizeFuturesModal;
    window.closeFuturesModal = closeFuturesModal;

})(); // End IIFE