/**
 * Futures vs Spot Analysis Modal
 * Deep analysis similar to VIX Analysis but for futures basis, contango/backwardation,
 * monthly contracts comparison, and arbitrage opportunities
 */

let futuresAnalysisCache = {};
let chartInstances = {};

/**
 * Show futures analysis modal triggered by clicking futures label
 */
function showFuturesAnalysisModal(symbol = null) {
    try {
        // Get current symbol if not provided
        if (!symbol) {
            symbol = getCurrentSelectedSymbol();
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
        futuresAnalysisCache[symbol] = data;
        
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
    const currentData = data.current_market_data;
    const rbiData = data.rbi_data || {};
    const summary = data.summary || {};
    const fairValue = data.fair_value_analysis || {};
    
    const spotPrice = currentData.spot_price || 0;
    const futuresPrice = currentData.futures_price || 0;
    const basis = futuresPrice - spotPrice;
    const basisPct = (basis / spotPrice * 100).toFixed(2);
    
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
                                <h5 class="text-primary">${spotPrice.toFixed(2)}</h5>
                                <small class="text-muted">Spot Price</small>
                            </div>
                            <div class="col-6">
                                <h5 class="text-success">${futuresPrice.toFixed(2)}</h5>
                                <small class="text-muted">Futures Price</small>
                            </div>
                        </div>
                        <hr>
                        <div class="text-center">
                            <h4 class="${basis >= 0 ? 'text-success' : 'text-danger'}">
                                ${basis >= 0 ? '+' : ''}${basis.toFixed(2)} (${basisPct}%)
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
                                <h5 class="text-warning">${rbiData.current_repo_rate?.toFixed(2) || '5.50'}%</h5>
                                <small class="text-muted">RBI Repo Rate</small>
                                <div class="mt-1">
                                    <span class="badge bg-light text-dark">${rbiData.rate_source || 'Live'}</span>
                                </div>
                            </div>
                            <div class="col-6">
                                <h5 class="text-info">${fairValue.theoretical_fair_value?.toFixed(2) || '--'}</h5>
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
                            <small class="text-muted">Gap: ${fairValue.fair_value_gap?.toFixed(2) || '--'} points</small>
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
                                <h5 class="text-success">${summary.arbitrage_score?.toFixed(0) || '0'}%</h5>
                                <small class="text-muted">Arbitrage Score</small>
                            </div>
                            <div class="col-3 text-center">
                                <h5 class="text-info">${data.trading_signals?.length || 0}</h5>
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
                        <h4 class="text-success">${summary.trading_recommendation || 'HOLD'}</h4>
                        <div class="mt-2">
                            <small class="text-muted">Based on ${data.trading_signals?.length || 0} signals</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create basis analysis tab
 */
function createBasisAnalysisTab(data) {
    const historical = data.historical_analysis || {};
    const fairValue = data.fair_value_analysis || {};
    
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
                                    <td class="text-end">${historical.basis_statistics?.mean_basis?.toFixed(2) || '--'}</td>
                                </tr>
                                <tr>
                                    <td>Std Deviation:</td>
                                    <td class="text-end">${historical.basis_statistics?.std_deviation?.toFixed(2) || '--'}</td>
                                </tr>
                                <tr>
                                    <td>Current Percentile:</td>
                                    <td class="text-end">${historical.basis_statistics?.current_percentile?.toFixed(1) || '--'}%</td>
                                </tr>
                                <tr>
                                    <td>Contango Days:</td>
                                    <td class="text-end">${historical.basis_statistics?.contango_days || '--'}</td>
                                </tr>
                                <tr>
                                    <td>Backwardation Days:</td>
                                    <td class="text-end">${historical.basis_statistics?.backwardation_days || '--'}</td>
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
                                    <td class="text-end">${fairValue.carry_components?.repo_rate?.toFixed(2) || '--'}%</td>
                                </tr>
                                <tr>
                                    <td>Dividend Yield:</td>
                                    <td class="text-end">${fairValue.carry_components?.dividend_yield?.toFixed(2) || '--'}%</td>
                                </tr>
                                <tr>
                                    <td>Net Carry:</td>
                                    <td class="text-end">${fairValue.carry_components?.net_carry_rate?.toFixed(2) || '--'}%</td>
                                </tr>
                                <tr>
                                    <td>Days to Expiry:</td>
                                    <td class="text-end">${fairValue.carry_components?.days_remaining || '--'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create monthly contracts tab
 */
function createMonthlyContractsTab(data) {
    const monthlyContracts = data.monthly_contracts || [];
    
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
                        ${monthlyContracts.map(contract => `
                            <tr class="${contract.is_near_month ? 'table-warning' : ''}">
                                <td>
                                    <span class="badge ${contract.is_near_month ? 'bg-primary' : 'bg-secondary'}">
                                        ${contract.contract_symbol.split(':')[1] || contract.contract_symbol}
                                    </span>
                                </td>
                                <td>${new Date(contract.expiry_date).toLocaleDateString()}</td>
                                <td>${contract.days_to_expiry}</td>
                                <td>${contract.futures_price.toFixed(2)}</td>
                                <td class="${contract.basis >= 0 ? 'text-success' : 'text-danger'}">
                                    ${contract.basis >= 0 ? '+' : ''}${contract.basis.toFixed(2)}
                                </td>
                                <td class="${contract.basis_percentage >= 0 ? 'text-success' : 'text-danger'}">
                                    ${contract.basis_percentage >= 0 ? '+' : ''}${contract.basis_percentage.toFixed(2)}%
                                </td>
                                <td>${contract.fair_value.toFixed(2)}</td>
                                <td>${contract.annualized_carry.toFixed(2)}%</td>
                                <td>
                                    <span class="badge ${
                                        contract.regime === 'CONTANGO' ? 'bg-success' : 
                                        contract.regime === 'BACKWARDATION' ? 'bg-danger' : 'bg-secondary'
                                    }">
                                        ${contract.regime}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
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
}

/**
 * Create arbitrage opportunities tab
 */
function createArbitrageTab(data) {
    const arbitrage = data.arbitrage_opportunities || {};
    const opportunities = arbitrage.opportunities || [];
    
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
                            <span class="text-success">${opp.expected_return?.toFixed(2) || '--'}%</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Confidence:</strong><br>
                            <span class="text-primary">${opp.confidence || '--'}%</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Complexity:</strong><br>
                            <span class="text-info">${opp.execution_complexity || '--'}</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Capital Required:</strong><br>
                            <span class="text-warning">₹${(opp.capital_required || 0).toLocaleString()}</span>
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
                        <h3 class="text-success">${arbitrage.overall_assessment || 'LOW'}</h3>
                        <p class="mb-2">Opportunities Found: ${arbitrage.opportunities_found || 0}</p>
                        <p class="mb-2">Avg Confidence: ${arbitrage.confidence?.toFixed(0) || 0}%</p>
                        <div class="mt-3">
                            <span class="badge ${
                                arbitrage.recommended_action === 'EXECUTE' ? 'bg-success' :
                                arbitrage.recommended_action === 'MONITOR' ? 'bg-warning' : 'bg-secondary'
                            } p-2">
                                ${arbitrage.recommended_action || 'WAIT'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create trading signals tab
 */
function createTradingSignalsTab(data) {
    const signals = data.trading_signals || [];
    
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
                        <span class="badge bg-light text-dark">${signal.confidence}% Confidence</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Action:</strong> <span class="text-primary">${signal.action}</span></p>
                            <p><strong>Risk Level:</strong> <span class="text-info">${signal.risk_level || '--'}</span></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Time Horizon:</strong> ${signal.time_horizon || '--'}</p>
                            <p><strong>Expected Return:</strong> ${signal.expected_return?.toFixed(2) || '--'}%</p>
                        </div>
                    </div>
                    <p class="text-muted">${signal.description}</p>
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
}

/**
 * Create data tab
 */
function createDataTab(data) {
    return `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Raw Analysis Data</h6>
                    </div>
                    <div class="card-body">
                        <pre class="bg-light p-3" style="max-height: 400px; overflow-y: auto;">
${JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    `;
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
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.classList.remove('modal-fullscreen');
        }
    }
    
    // Clean up charts
    Object.values(chartInstances).forEach(chart => {
        if (chart && chart.destroy) {
            chart.destroy();
        }
    });
    chartInstances = {};
    
    document.body.style.overflow = 'auto';
    document.body.classList.remove('modal-open');
    
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
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