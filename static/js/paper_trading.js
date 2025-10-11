/**
 * Paper Trading System - Risk-free virtual trading
 * Provides comprehensive paper trading functionality with portfolio tracking
 */

class PaperTradingSystem {
    constructor() {
        this.isEnabled = false;
        this.portfolio = null;
        this.settings = null;
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadPortfolio();
        this.initializeUI();
        this.setupEventListeners();
        console.log('📈 Paper Trading System initialized');
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/paper_trading/settings');
            const data = await response.json();
            if (data.success) {
                this.settings = data.settings;
                this.isEnabled = data.settings.is_paper_mode;
            }
        } catch (error) {
            console.error('Error loading paper trading settings:', error);
            this.settings = {
                is_paper_mode: false,
                risk_tolerance: 'MODERATE',
                max_position_size: 10000,
                daily_loss_limit: 5000
            };
        }
    }

    async loadPortfolio() {
        try {
            const response = await fetch('/api/paper_trading/portfolio');
            const data = await response.json();
            if (data.success) {
                this.portfolio = data.portfolio;
            }
        } catch (error) {
            console.error('Error loading paper portfolio:', error);
        }
    }

    initializeUI() {
        // Create paper trading toggle in the main controls
        this.createPaperTradingToggle();
        
        // Create virtual balance display
        this.createVirtualBalanceDisplay();
        
        // Create paper trading controls panel
        this.createPaperTradingPanel();
        
        // Update UI based on current mode
        this.updateUIMode();
    }

    createPaperTradingToggle() {
        const tradingControlsCard = document.querySelector('.card:has(.custom-select)');
        if (!tradingControlsCard) return;

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'paper-trading-toggle mt-3';
        toggleContainer.innerHTML = `
            <div class="form-check form-switch d-flex align-items-center">
                <input class="form-check-input me-2" type="checkbox" id="paperTradingToggle" 
                       ${this.isEnabled ? 'checked' : ''}>
                <label class="form-check-label fw-bold text-warning" for="paperTradingToggle">
                    <i class="fas fa-paper-plane me-1"></i>
                    Paper Trading Mode
                </label>
                <small class="text-muted ms-2">(Risk-free practice)</small>
            </div>
        `;

        tradingControlsCard.querySelector('.card-body').appendChild(toggleContainer);
    }

    createVirtualBalanceDisplay() {
        if (!this.portfolio) return;

        const existingDisplay = document.querySelector('.virtual-balance-card');
        if (existingDisplay) existingDisplay.remove();

        const balanceCard = document.createElement('div');
        balanceCard.className = 'card virtual-balance-card mb-3 border-warning bg-gradient';
        balanceCard.style.background = 'linear-gradient(135deg, #2c3e50, #4a6741)';
        balanceCard.innerHTML = `
            <div class="card-body text-center">
                <h5 class="card-title text-warning">
                    <i class="fas fa-coins me-2"></i>Virtual Portfolio
                </h5>
                <div class="row">
                    <div class="col-4">
                        <div class="text-light">
                            <small>Balance</small>
                            <div class="fw-bold fs-5" id="virtualBalance">
                                ₹${this.formatMoney(this.portfolio.balance)}
                            </div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="text-light">
                            <small>Initial</small>
                            <div class="fw-bold" id="initialBalance">
                                ₹${this.formatMoney(this.portfolio.initial_balance)}
                            </div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="text-light">
                            <small>P&L</small>
                            <div class="fw-bold ${this.portfolio.total_pnl >= 0 ? 'text-success' : 'text-danger'}" 
                                 id="totalPnl">
                                ${this.portfolio.total_pnl >= 0 ? '+' : ''}₹${this.formatMoney(Math.abs(this.portfolio.total_pnl))}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-2">
                    <button class="btn btn-outline-warning btn-sm me-2" id="viewPaperPortfolio">
                        <i class="fas fa-chart-pie me-1"></i>Portfolio
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" id="resetPaperPortfolio">
                        <i class="fas fa-undo me-1"></i>Reset
                    </button>
                </div>
            </div>
        `;

        // Insert after the trading controls
        const tradingControlsCard = document.querySelector('.card:has(.custom-select)');
        if (tradingControlsCard) {
            tradingControlsCard.parentNode.insertBefore(balanceCard, tradingControlsCard.nextSibling);
        }
    }

    createPaperTradingPanel() {
        // Create paper trading modal
        const modalHtml = `
            <div class="modal fade" id="paperTradingModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header bg-gradient" style="background: linear-gradient(135deg, #2c3e50, #4a6741);">
                            <h5 class="modal-title text-warning">
                                <i class="fas fa-paper-plane me-2"></i>Paper Trading Portfolio
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="nav nav-tabs mb-3" id="paperTradingTabs">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#portfolioTab">Portfolio</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#tradesTab">Trade History</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#settingsTab">Settings</a>
                                </li>
                            </ul>
                            <div class="tab-content">
                                <div class="tab-pane fade show active" id="portfolioTab">
                                    <div id="paperPortfolioContent">Loading...</div>
                                </div>
                                <div class="tab-pane fade" id="tradesTab">
                                    <div id="paperTradesContent">Loading...</div>
                                </div>
                                <div class="tab-pane fade" id="settingsTab">
                                    <div id="paperSettingsContent">Loading...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body if it doesn't exist
        if (!document.querySelector('#paperTradingModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    }

    setupEventListeners() {
        // Navbar paper trading toggle (main toggle)
        const navbarToggle = document.getElementById('navbarPaperTradingToggle');
        if (navbarToggle) {
            navbarToggle.addEventListener('change', () => this.togglePaperMode(navbarToggle.checked));
        }

        // Paper trading toggle (existing one in trading controls)
        const toggle = document.getElementById('paperTradingToggle');
        if (toggle) {
            toggle.addEventListener('change', () => this.togglePaperMode(toggle.checked));
        }

        // Portfolio view button
        const portfolioBtn = document.getElementById('viewPaperPortfolio');
        if (portfolioBtn) {
            portfolioBtn.addEventListener('click', () => this.showPortfolioModal());
        }

        // Reset portfolio button
        const resetBtn = document.getElementById('resetPaperPortfolio');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetPortfolio());
        }

        // Override existing trade buttons to handle paper trading
        this.interceptTradeButtons();
    }

    async togglePaperMode(enabled) {
        try {
            const response = await fetch('/api/paper_trading/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_paper_mode: enabled,
                    risk_tolerance: this.settings.risk_tolerance,
                    max_position_size: this.settings.max_position_size,
                    daily_loss_limit: this.settings.daily_loss_limit
                })
            });

            const data = await response.json();
            if (data.success) {
                this.isEnabled = enabled;
                this.updateUIMode();
                
                // Show notification
                this.showNotification(
                    enabled ? 'Paper Trading Mode Enabled' : 'Paper Trading Mode Disabled',
                    enabled ? 'All trades will be virtual' : 'Switched to live trading mode',
                    enabled ? 'warning' : 'info'
                );
            }
        } catch (error) {
            console.error('Error toggling paper mode:', error);
            this.showNotification('Error', 'Failed to toggle paper trading mode', 'danger');
        }
    }

    updateUIMode() {
        const body = document.body;
        const virtualCard = document.querySelector('.virtual-balance-card');

        // Sync both toggles
        const navbarToggle = document.getElementById('navbarPaperTradingToggle');
        const regularToggle = document.getElementById('paperTradingToggle');
        
        if (navbarToggle) navbarToggle.checked = this.isEnabled;
        if (regularToggle) regularToggle.checked = this.isEnabled;

        // Update navbar trading mode text
        const tradingModeText = document.getElementById('tradingModeText');
        if (tradingModeText) {
            if (this.isEnabled) {
                tradingModeText.textContent = 'Paper Mode';
                tradingModeText.className = 'trading-mode-text trading-mode-paper';
            } else {
                tradingModeText.textContent = 'Real Money';
                tradingModeText.className = 'trading-mode-text trading-mode-real';
            }
        }

        if (this.isEnabled) {
            body.classList.add('paper-trading-mode');
            if (virtualCard) virtualCard.style.display = 'block';
            
            // Add visual indicators to trading buttons
            this.addPaperTradingIndicators();
        } else {
            body.classList.remove('paper-trading-mode');
            if (virtualCard) virtualCard.style.display = 'none';
            
            // Remove visual indicators
            this.removePaperTradingIndicators();
        }
    }

    addPaperTradingIndicators() {
        const tradeButtons = document.querySelectorAll('.trade-btn, .buy-btn, .sell-btn');
        tradeButtons.forEach(btn => {
            if (!btn.querySelector('.paper-indicator')) {
                const indicator = document.createElement('small');
                indicator.className = 'paper-indicator text-warning';
                indicator.innerHTML = ' <i class="fas fa-paper-plane"></i>';
                btn.appendChild(indicator);
            }
        });
    }

    removePaperTradingIndicators() {
        document.querySelectorAll('.paper-indicator').forEach(indicator => {
            indicator.remove();
        });
    }

    interceptTradeButtons() {
        // Override click handlers for trade execution
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Check if clicking on a trade button while in paper mode
            if (this.isEnabled && (
                target.classList.contains('trade-btn') ||
                target.classList.contains('buy-btn') ||
                target.classList.contains('sell-btn') ||
                target.closest('.trade-btn') ||
                target.closest('.buy-btn') ||
                target.closest('.sell-btn')
            )) {
                event.preventDefault();
                event.stopPropagation();
                this.handlePaperTrade(target);
                return;
            }
            
            // Don't intercept real money trading buttons (option chain buy/sell)
            if (target.classList.contains('position-btn-decrease') || 
                target.classList.contains('position-btn-increase') ||
                target.classList.contains('position-add-btn') ||
                target.classList.contains('smart-btn') ||
                target.closest('.position-btn-decrease') ||
                target.closest('.position-btn-increase') ||
                target.closest('.position-add-btn') ||
                target.closest('.smart-btn')) {
                // Allow normal flow for real money trading buttons
                return;
            }
        }, true);
    }

    async handlePaperTrade(button) {
        // Extract trade details from the context
        const tradeData = this.extractTradeData(button);
        if (!tradeData) return;

        try {
            const response = await fetch('/api/paper_trading/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tradeData)
            });

            const data = await response.json();
            if (data.success) {
                await this.loadPortfolio();
                this.updateVirtualBalanceDisplay();
                
                this.showNotification(
                    'Paper Trade Executed',
                    `${tradeData.trade_type} ${tradeData.quantity} ${tradeData.symbol} at ₹${tradeData.price}`,
                    'success'
                );
            } else {
                this.showNotification('Trade Failed', data.error, 'danger');
            }
        } catch (error) {
            console.error('Paper trade error:', error);
            this.showNotification('Error', 'Failed to execute paper trade', 'danger');
        }
    }

    extractTradeData(button) {
        try {
            // Get the row containing the button to extract option data
            const row = button.closest('tr');
            
            // Get current selected symbol
            const symbolSelect = document.querySelector('#symbolSelect');
            const baseSymbol = symbolSelect ? symbolSelect.value : 'NIFTY50-INDEX';
            
            // Determine trade type from button
            const isBuy = button.textContent.toLowerCase().includes('buy') || 
                         button.classList.contains('buy-btn') ||
                         button.classList.contains('btn-success');
            
            // Try to extract option chain data if available
            let symbol = baseSymbol;
            let optionType = null;
            let strikePrice = null;
            let expiryDate = null;
            let price = null;
            let quantity = 1;
            
            if (row) {
                // Extract strike price from row
                const strikePriceEl = row.querySelector('.strike-price, [data-strike]');
                if (strikePriceEl) {
                    strikePrice = parseFloat(strikePriceEl.textContent.replace(/[^\d.-]/g, '')) || 
                                 parseFloat(strikePriceEl.getAttribute('data-strike'));
                }
                
                // Extract option type (CE/PE) from button context
                const cellIndex = Array.from(row.children).indexOf(button.closest('td'));
                const headerRow = document.querySelector('table thead tr');
                if (headerRow && headerRow.children[cellIndex]) {
                    const headerText = headerRow.children[cellIndex].textContent.toLowerCase();
                    if (headerText.includes('ce') || headerText.includes('call')) {
                        optionType = 'CE';
                    } else if (headerText.includes('pe') || headerText.includes('put')) {
                        optionType = 'PE';
                    }
                }
                
                // Try to get price from the specific cell
                const priceCell = isBuy ? 
                    row.querySelector('.ce-bid, .pe-bid, .bid-price, .ask-price') : 
                    row.querySelector('.ce-ask, .pe-ask, .bid-price, .ask-price');
                
                if (priceCell) {
                    const priceText = priceCell.textContent.replace(/[^\d.-]/g, '');
                    price = parseFloat(priceText) || null;
                }
                
                // If no specific price found, try LTP
                if (!price) {
                    const ltpCell = row.querySelector('.ltp, .ce-ltp, .pe-ltp');
                    if (ltpCell) {
                        price = parseFloat(ltpCell.textContent.replace(/[^\d.-]/g, ''));
                    }
                }
            }
            
            // Fallback: get price from futures or spot data
            if (!price) {
                const futuresPrice = document.querySelector('.futures-price');
                const spotPrice = document.querySelector('.spot-price, .nifty-price');
                
                if (futuresPrice) {
                    price = parseFloat(futuresPrice.textContent.replace(/[^\d.-]/g, ''));
                } else if (spotPrice) {
                    price = parseFloat(spotPrice.textContent.replace(/[^\d.-]/g, ''));
                } else {
                    // Use current spot price from global variable if available
                    price = window.currentSpotPrice || 25000;
                }
            }
            
            // Get current expiry date if available
            const currentExpiry = document.querySelector('.expiry_button.active, .expiry-selected');
            if (currentExpiry) {
                const expiryText = currentExpiry.textContent || currentExpiry.getAttribute('data-expiry');
                if (expiryText) {
                    // Parse date string like "26-Sep" or "26-Sep-2024"
                    const dateParts = expiryText.match(/(\d+)-(\w+)(-\d+)?/);
                    if (dateParts) {
                        const day = dateParts[1];
                        const month = dateParts[2];
                        const year = dateParts[3] ? dateParts[3].substring(1) : new Date().getFullYear();
                        expiryDate = `${year}-${this.getMonthNumber(month)}-${day.padStart(2, '0')}`;
                    }
                }
            }
            
            // Build proper symbol name for options
            if (optionType && strikePrice && expiryDate) {
                const expiryFormatted = this.formatExpiryForSymbol(expiryDate);
                symbol = `${baseSymbol}${expiryFormatted}${strikePrice}${optionType}`;
            }
            
            // Get quantity from any quantity input or use default
            const quantityInput = document.querySelector('#quantity, .quantity-input');
            if (quantityInput && quantityInput.value) {
                quantity = parseInt(quantityInput.value) || 1;
            }
            
            return {
                symbol: symbol,
                trade_type: isBuy ? 'BUY' : 'SELL',
                quantity: quantity,
                price: price,
                option_type: optionType,
                strike_price: strikePrice,
                expiry_date: expiryDate
            };
            
        } catch (error) {
            console.error('Error extracting trade data:', error);
            
            // Fallback to basic trade data
            return {
                symbol: 'NIFTY50-INDEX',
                trade_type: 'BUY',
                quantity: 1,
                price: window.currentSpotPrice || 25000,
                option_type: null,
                strike_price: null,
                expiry_date: null
            };
        }
    }
    
    getMonthNumber(monthName) {
        const months = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        return months[monthName.toLowerCase().substring(0, 3)] || '01';
    }
    
    formatExpiryForSymbol(expiryDate) {
        // Fyers API v3 Format: {YY}{MMM} - e.g., 25OCT for October 2025
        const date = new Date(expiryDate);
        const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        const year = date.getFullYear().toString().substring(2);
        return `${year}${month}`;
    }

    async showPortfolioModal() {
        const modal = new bootstrap.Modal(document.getElementById('paperTradingModal'));
        
        // Load portfolio content
        await this.loadPortfolioContent();
        await this.loadTradesContent();
        await this.loadSettingsContent();
        
        modal.show();
    }

    async loadPortfolioContent() {
        const container = document.getElementById('paperPortfolioContent');
        if (!this.portfolio) {
            container.innerHTML = '<p class="text-center">No portfolio data available</p>';
            return;
        }

        const positions = this.portfolio.positions || [];
        let positionsHtml = '';

        if (positions.length > 0) {
            positionsHtml = positions.map(pos => `
                <div class="card bg-secondary mb-2">
                    <div class="card-body p-3">
                        <div class="row align-items-center">
                            <div class="col-md-3">
                                <strong>${pos.symbol}</strong>
                                ${pos.option_type ? `<br><small>${pos.option_type} ${pos.strike_price}</small>` : ''}
                            </div>
                            <div class="col-md-2">
                                <small>Qty</small><br>
                                <strong>${pos.quantity}</strong>
                            </div>
                            <div class="col-md-3">
                                <small>Avg Price</small><br>
                                <strong>₹${pos.avg_entry_price.toFixed(2)}</strong>
                            </div>
                            <div class="col-md-2">
                                <small>P&L</small><br>
                                <strong class="${pos.pnl >= 0 ? 'text-success' : 'text-danger'}">
                                    ${pos.pnl >= 0 ? '+' : ''}₹${Math.abs(pos.pnl).toFixed(2)}
                                </strong>
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-outline-danger btn-sm" onclick="paperTrading.closePaperPosition('${pos.symbol}', '${pos.option_type}', '${pos.strike_price}')">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            positionsHtml = '<p class="text-center text-muted">No open positions</p>';
        }

        container.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card bg-primary">
                        <div class="card-body text-center">
                            <h5>Balance</h5>
                            <h3>₹${this.formatMoney(this.portfolio.balance)}</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-info">
                        <div class="card-body text-center">
                            <h5>Total P&L</h5>
                            <h3 class="${this.portfolio.total_pnl >= 0 ? 'text-success' : 'text-danger'}">
                                ${this.portfolio.total_pnl >= 0 ? '+' : ''}₹${this.formatMoney(Math.abs(this.portfolio.total_pnl))}
                            </h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-warning">
                        <div class="card-body text-center">
                            <h5>Return %</h5>
                            <h3>${((this.portfolio.total_pnl / this.portfolio.initial_balance) * 100).toFixed(2)}%</h3>
                        </div>
                    </div>
                </div>
            </div>
            <h5>Open Positions</h5>
            ${positionsHtml}
        `;
    }

    async loadTradesContent() {
        const container = document.getElementById('paperTradesContent');
        
        try {
            const response = await fetch('/api/paper_trading/trades?limit=20');
            const data = await response.json();
            
            if (data.success && data.trades.length > 0) {
                const tradesHtml = data.trades.map(trade => `
                    <div class="card bg-secondary mb-2">
                        <div class="card-body p-3">
                            <div class="row align-items-center">
                                <div class="col-md-2">
                                    <span class="badge ${trade.trade_type === 'BUY' ? 'bg-success' : 'bg-danger'}">
                                        ${trade.trade_type}
                                    </span>
                                </div>
                                <div class="col-md-3">
                                    <strong>${trade.symbol}</strong>
                                    ${trade.option_type ? `<br><small>${trade.option_type} ${trade.strike_price}</small>` : ''}
                                </div>
                                <div class="col-md-2">
                                    <small>Qty</small><br>
                                    <strong>${trade.quantity}</strong>
                                </div>
                                <div class="col-md-2">
                                    <small>Price</small><br>
                                    <strong>₹${trade.entry_price}</strong>
                                </div>
                                <div class="col-md-2">
                                    <small>P&L</small><br>
                                    <strong class="${trade.pnl >= 0 ? 'text-success' : 'text-danger'}">
                                        ${trade.pnl >= 0 ? '+' : ''}₹${Math.abs(trade.pnl).toFixed(2)}
                                    </strong>
                                </div>
                                <div class="col-md-1">
                                    <small>${new Date(trade.executed_at).toLocaleDateString()}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                container.innerHTML = tradesHtml;
            } else {
                container.innerHTML = '<p class="text-center text-muted">No trades executed yet</p>';
            }
        } catch (error) {
            console.error('Error loading trades:', error);
            container.innerHTML = '<p class="text-center text-danger">Error loading trade history</p>';
        }
    }

    async loadSettingsContent() {
        const container = document.getElementById('paperSettingsContent');
        
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Risk Tolerance</label>
                        <select class="form-select" id="riskTolerance">
                            <option value="CONSERVATIVE" ${this.settings.risk_tolerance === 'CONSERVATIVE' ? 'selected' : ''}>Conservative</option>
                            <option value="MODERATE" ${this.settings.risk_tolerance === 'MODERATE' ? 'selected' : ''}>Moderate</option>
                            <option value="AGGRESSIVE" ${this.settings.risk_tolerance === 'AGGRESSIVE' ? 'selected' : ''}>Aggressive</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Max Position Size</label>
                        <input type="number" class="form-control" id="maxPositionSize" 
                               value="${this.settings.max_position_size}" min="1000" max="50000" step="1000">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Daily Loss Limit</label>
                        <input type="number" class="form-control" id="dailyLossLimit" 
                               value="${this.settings.daily_loss_limit}" min="1000" max="20000" step="1000">
                    </div>
                    <div class="mb-3">
                        <button class="btn btn-success" onclick="paperTrading.saveSettings()">
                            <i class="fas fa-save me-1"></i>Save Settings
                        </button>
                        <button class="btn btn-outline-danger ms-2" onclick="paperTrading.resetPortfolio()">
                            <i class="fas fa-undo me-1"></i>Reset Portfolio
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async saveSettings() {
        const settings = {
            is_paper_mode: this.isEnabled,
            risk_tolerance: document.getElementById('riskTolerance').value,
            max_position_size: parseFloat(document.getElementById('maxPositionSize').value),
            daily_loss_limit: parseFloat(document.getElementById('dailyLossLimit').value)
        };

        try {
            const response = await fetch('/api/paper_trading/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();
            if (data.success) {
                this.settings = settings;
                this.showNotification('Settings Saved', 'Paper trading settings updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error', 'Failed to save settings', 'danger');
        }
    }

    async resetPortfolio() {
        if (!confirm('Are you sure you want to reset your paper trading portfolio? This will close all positions and restore your virtual balance to ₹100,000.')) {
            return;
        }

        try {
            const response = await fetch('/api/paper_trading/reset_portfolio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });

            const data = await response.json();
            if (data.success) {
                await this.loadPortfolio();
                this.updateVirtualBalanceDisplay();
                this.showNotification('Portfolio Reset', 'Your paper trading portfolio has been reset', 'info');
                
                // Refresh modal content if open
                if (document.querySelector('#paperTradingModal.show')) {
                    await this.loadPortfolioContent();
                    await this.loadTradesContent();
                }
            }
        } catch (error) {
            console.error('Error resetting portfolio:', error);
            this.showNotification('Error', 'Failed to reset portfolio', 'danger');
        }
    }

    updateVirtualBalanceDisplay() {
        const balanceEl = document.getElementById('virtualBalance');
        const pnlEl = document.getElementById('totalPnl');
        
        if (balanceEl && this.portfolio) {
            balanceEl.textContent = `₹${this.formatMoney(this.portfolio.balance)}`;
        }
        
        if (pnlEl && this.portfolio) {
            pnlEl.textContent = `${this.portfolio.total_pnl >= 0 ? '+' : ''}₹${this.formatMoney(Math.abs(this.portfolio.total_pnl))}`;
            pnlEl.className = `fw-bold ${this.portfolio.total_pnl >= 0 ? 'text-success' : 'text-danger'}`;
        }
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('en-IN').format(amount);
    }

    showNotification(title, message, type = 'info') {
        // Create and show a toast notification
        const toastContainer = document.querySelector('.toast-container') || 
                             document.body.appendChild(document.createElement('div'));
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';

        const toastId = 'toast_' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        const bootstrapToast = new bootstrap.Toast(toast);
        bootstrapToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize paper trading system when page loads
let paperTrading;
document.addEventListener('DOMContentLoaded', () => {
    paperTrading = new PaperTradingSystem();
});

// Make it globally accessible
window.paperTrading = paperTrading;