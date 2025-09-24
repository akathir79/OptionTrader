/**
 * Strategy Selector for Options Trading
 * Integrates with payoff chart and option chain for automated position creation
 */

class StrategySelector {
    constructor() {
        this.strategies = [];
        this.filteredStrategies = [];
        this.selectedCategory = 'all';
        this.isOptionChainReady = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkInitialState();
        console.log('🎯 Strategy Selector initialized');
    }

    bindEvents() {
        // Strategy tab activation
        document.addEventListener('click', (e) => {
            if (e.target.id === 'strategy-tab') {
                this.onStrategyTabActivated();
            }
        });

        // Category filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-category')) {
                this.filterByCategory(e.target.getAttribute('data-category'));
                this.updateCategoryButtons(e.target);
            }
        });

        // Strategy card selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.strategy-card')) {
                this.selectStrategy(e.target.closest('.strategy-card'));
            }
        });
    }

    checkInitialState() {
        // Check if option chain is ready (symbol and expiry selected)
        this.isOptionChainReady = this.checkOptionChainReady();
    }

    checkOptionChainReady() {
        const indexSelect = document.getElementById('indexSelect');
        const expirySelect = document.getElementById('expirySelect');
        const optionChainTable = document.getElementById('optionChainTable');
        
        const hasSymbol = indexSelect && indexSelect.value && indexSelect.value !== '';
        const hasExpiry = expirySelect && expirySelect.value && expirySelect.value !== '';
        const hasTableData = optionChainTable && optionChainTable.querySelector('tbody tr');
        
        console.log('🔍 Option chain ready check:', {
            hasSymbol,
            hasExpiry, 
            hasTableData: !!hasTableData
        });
        
        return hasSymbol && hasExpiry && hasTableData;
    }

    async onStrategyTabActivated() {
        console.log('📊 Strategy tab activated');
        
        // Update option chain readiness
        this.isOptionChainReady = this.checkOptionChainReady();
        
        if (!this.isOptionChainReady) {
            this.showPrerequisites();
            return;
        }
        
        this.hidePrerequisites();
        await this.loadStrategies();
    }

    showPrerequisites() {
        const prerequisites = document.getElementById('strategyPrerequisites');
        const categoryFilter = document.getElementById('strategyCategoryFilter');
        const cardsContainer = document.getElementById('strategyCardsContainer');
        
        if (prerequisites) prerequisites.classList.remove('d-none');
        if (categoryFilter) categoryFilter.classList.add('d-none');
        if (cardsContainer) cardsContainer.innerHTML = '';
    }

    hidePrerequisites() {
        const prerequisites = document.getElementById('strategyPrerequisites');
        const categoryFilter = document.getElementById('strategyCategoryFilter');
        
        if (prerequisites) prerequisites.classList.add('d-none');
        if (categoryFilter) categoryFilter.classList.remove('d-none');
    }

    async loadStrategies() {
        const loading = document.getElementById('strategyLoading');
        const cardsContainer = document.getElementById('strategyCardsContainer');
        
        if (loading) loading.classList.remove('d-none');
        
        try {
            const response = await fetch('/api/strategies');
            const data = await response.json();
            
            if (data.success) {
                this.strategies = data.strategies;
                this.filteredStrategies = [...this.strategies];
                this.renderStrategyCards();
                console.log(`✅ Loaded ${this.strategies.length} strategies`);
            } else {
                throw new Error(data.error || 'Failed to load strategies');
            }
        } catch (error) {
            console.error('❌ Error loading strategies:', error);
            if (cardsContainer) {
                cardsContainer.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            Failed to load strategies: ${error.message}
                        </div>
                    </div>
                `;
            }
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    filterByCategory(category) {
        this.selectedCategory = category;
        
        if (category === 'all') {
            this.filteredStrategies = [...this.strategies];
        } else {
            this.filteredStrategies = this.strategies.filter(s => s.category === category);
        }
        
        this.renderStrategyCards();
        console.log(`🔽 Filtered to ${this.filteredStrategies.length} strategies (${category})`);
    }

    updateCategoryButtons(activeButton) {
        const categoryButtons = document.querySelectorAll('[data-category]');
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }

    renderStrategyCards() {
        const container = document.getElementById('strategyCardsContainer');
        if (!container) return;

        if (this.filteredStrategies.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-search fa-2x mb-2"></i>
                        <div>No strategies found for selected category</div>
                    </div>
                </div>
            `;
            return;
        }

        const cardsHTML = this.filteredStrategies.map(strategy => this.createStrategyCard(strategy)).join('');
        container.innerHTML = cardsHTML;
    }

    createStrategyCard(strategy) {
        const categoryColors = {
            'Bullish': 'success',
            'Bearish': 'danger', 
            'Neutral': 'secondary',
            'Volatility': 'warning',
            'Income': 'info',
            'Insurance': 'primary',
            'Hedging': 'dark'
        };

        const badgeColor = categoryColors[strategy.category] || 'secondary';

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card strategy-card h-100" style="cursor: pointer; transition: all 0.2s;" 
                     data-strategy-id="${strategy.id}" 
                     data-strategy-name="${strategy.name}"
                     data-strategy-construction="${strategy.construction || ''}"
                     onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'; this.style.transform='translateY(-2px)'" 
                     onmouseout="this.style.boxShadow=''; this.style.transform=''">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title text-truncate mb-0" style="font-size: 14px;">${strategy.name}</h6>
                            <span class="badge bg-${badgeColor} ms-1" style="font-size: 10px;">${strategy.category}</span>
                        </div>
                        <p class="card-text small text-muted mb-2" style="font-size: 11px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${strategy.description || 'Advanced options strategy'}
                        </p>
                        <div class="small mb-2">
                            <div class="text-muted mb-1" style="font-size: 10px;"><strong>Market:</strong> ${strategy.market_condition || 'Any'}</div>
                            <div class="text-muted" style="font-size: 10px;"><strong>Risk:</strong> ${strategy.risk_profile || 'Moderate'}</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-success fw-bold">Click to Execute</small>
                            <i class="fas fa-chevron-right text-muted"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async selectStrategy(cardElement) {
        const strategyId = cardElement.getAttribute('data-strategy-id');
        const strategyName = cardElement.getAttribute('data-strategy-name'); 
        const construction = cardElement.getAttribute('data-strategy-construction');
        
        console.log(`🎯 Strategy selected: ${strategyName} (ID: ${strategyId})`);
        
        // Find full strategy data
        const strategy = this.strategies.find(s => s.id == strategyId);
        if (!strategy) {
            console.error('❌ Strategy not found:', strategyId);
            return;
        }

        // Show confirmation and execute
        if (await this.confirmStrategyExecution(strategy)) {
            await this.executeStrategy(strategy);
        }
    }

    async confirmStrategyExecution(strategy) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div class="modal fade" id="strategyConfirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Execute Strategy: ${strategy.name}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <strong>Description:</strong>
                                    <p class="text-muted small">${strategy.description}</p>
                                </div>
                                <div class="mb-3">
                                    <strong>Construction:</strong>
                                    <p class="text-muted small">${strategy.construction}</p>
                                </div>
                                <div class="row">
                                    <div class="col-6">
                                        <strong>Max Profit:</strong>
                                        <div class="text-success small">${strategy.max_profit}</div>
                                    </div>
                                    <div class="col-6">
                                        <strong>Max Loss:</strong>
                                        <div class="text-danger small">${strategy.max_loss}</div>
                                    </div>
                                </div>
                                <div class="alert alert-info mt-3">
                                    <i class="fas fa-info-circle me-2"></i>
                                    This will automatically create positions based on the current option chain.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="confirmExecute">Execute Strategy</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bootstrapModal = new bootstrap.Modal(document.getElementById('strategyConfirmModal'));
            
            document.getElementById('confirmExecute').addEventListener('click', () => {
                bootstrapModal.hide();
                resolve(true);
            });
            
            modal.querySelector('.modal').addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            bootstrapModal.show();
        });
    }

    async executeStrategy(strategy) {
        try {
            console.log('🚀 Executing strategy:', strategy.name);
            
            // Parse the strategy construction to determine positions
            const positions = this.parseStrategyConstruction(strategy);
            
            if (positions.length === 0) {
                this.showNotification('Strategy Error', 'Could not parse strategy construction', 'warning');
                return;
            }
            
            // Execute each position
            const results = [];
            for (const position of positions) {
                const result = await this.createPosition(position);
                results.push(result);
            }
            
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            if (successful > 0) {
                this.showNotification(
                    'Strategy Executed', 
                    `${strategy.name}: ${successful} positions created${failed > 0 ? `, ${failed} failed` : ''}`,
                    successful === results.length ? 'success' : 'warning'
                );
                
                // Hide strategy selector and show payoff chart
                this.hideStrategySelector();
                
                // Update position management and payoff chart
                await this.updatePositionManagement();
                
            } else {
                this.showNotification('Strategy Failed', 'No positions could be created', 'danger');
            }
            
        } catch (error) {
            console.error('❌ Strategy execution error:', error);
            this.showNotification('Error', `Failed to execute strategy: ${error.message}`, 'danger');
        }
    }

    parseStrategyConstruction(strategy) {
        const positions = [];
        const construction = strategy.construction || '';
        
        // Simple parsing for common patterns
        // This is a basic implementation - you can enhance it based on your construction format
        
        if (construction.toLowerCase().includes('buy 1 call')) {
            positions.push({
                type: 'BUY',
                optionType: 'CE',
                quantity: 1,
                strike: 'ATM'
            });
        }
        
        if (construction.toLowerCase().includes('sell 1 call')) {
            positions.push({
                type: 'SELL', 
                optionType: 'CE',
                quantity: 1,
                strike: 'ATM'
            });
        }
        
        if (construction.toLowerCase().includes('buy 1 put')) {
            positions.push({
                type: 'BUY',
                optionType: 'PE',
                quantity: 1,
                strike: 'ATM'
            });
        }
        
        if (construction.toLowerCase().includes('sell 1 put')) {
            positions.push({
                type: 'SELL',
                optionType: 'PE', 
                quantity: 1,
                strike: 'ATM'
            });
        }
        
        // Handle spreads (bull call, bear put, etc.)
        if (construction.toLowerCase().includes('bull call spread')) {
            positions.push(
                { type: 'BUY', optionType: 'CE', quantity: 1, strike: 'ATM' },
                { type: 'SELL', optionType: 'CE', quantity: 1, strike: 'OTM+1' }
            );
        }
        
        if (construction.toLowerCase().includes('bear put spread')) {
            positions.push(
                { type: 'BUY', optionType: 'PE', quantity: 1, strike: 'ATM' },
                { type: 'SELL', optionType: 'PE', quantity: 1, strike: 'OTM-1' }
            );
        }
        
        // Handle straddle
        if (construction.toLowerCase().includes('straddle')) {
            if (construction.toLowerCase().includes('long straddle')) {
                positions.push(
                    { type: 'BUY', optionType: 'CE', quantity: 1, strike: 'ATM' },
                    { type: 'BUY', optionType: 'PE', quantity: 1, strike: 'ATM' }
                );
            } else if (construction.toLowerCase().includes('short straddle')) {
                positions.push(
                    { type: 'SELL', optionType: 'CE', quantity: 1, strike: 'ATM' },
                    { type: 'SELL', optionType: 'PE', quantity: 1, strike: 'ATM' }
                );
            }
        }
        
        console.log('📋 Parsed positions:', positions);
        return positions;
    }

    async createPosition(position) {
        try {
            // Find the appropriate row in option chain table
            const { symbol, strike, price } = this.findOptionInChain(position);
            
            if (!symbol) {
                return { success: false, error: 'Option not found in chain' };
            }
            
            // Use paper trading system to create position
            const tradeData = {
                symbol: symbol,
                trade_type: position.type,
                quantity: position.quantity * 75, // Default lot size
                price: price,
                option_type: position.optionType,
                strike_price: strike,
                expiry_date: this.getCurrentExpiryDate()
            };
            
            const response = await fetch('/api/paper_trading/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tradeData)
            });
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('❌ Position creation error:', error);
            return { success: false, error: error.message };
        }
    }

    findOptionInChain(position) {
        const table = document.getElementById('optionChainTable');
        if (!table) return { symbol: null, strike: null, price: null };
        
        const rows = table.querySelectorAll('tbody tr');
        const atmRow = this.findATMRow(rows);
        
        if (!atmRow) return { symbol: null, strike: null, price: null };
        
        let targetRow = atmRow;
        
        // Adjust for OTM strikes
        if (position.strike === 'OTM+1') {
            targetRow = atmRow.nextElementSibling || atmRow;
        } else if (position.strike === 'OTM-1') {
            targetRow = atmRow.previousElementSibling || atmRow;
        }
        
        const cells = targetRow.children;
        if (!cells || cells.length < 22) return { symbol: null, strike: null, price: null };
        
        // Get strike price
        const strikeCell = cells[11]; // Strike price column
        const strike = strikeCell ? parseFloat(strikeCell.textContent) : null;
        
        if (position.optionType === 'CE') {
            // Call option - use CE data
            const symbolCell = cells[17]; // CE symbol column  
            const priceCell = cells[13]; // CE LTP column
            
            return {
                symbol: symbolCell?.textContent?.trim() || '',
                strike: strike,
                price: parseFloat(priceCell?.textContent) || 0
            };
        } else {
            // Put option - use PE data  
            const symbolCell = cells[21]; // PE symbol column
            const priceCell = cells[9]; // PE LTP column
            
            return {
                symbol: symbolCell?.textContent?.trim() || '',
                strike: strike,
                price: parseFloat(priceCell?.textContent) || 0
            };
        }
    }

    findATMRow(rows) {
        // Look for ATM highlighted row
        for (const row of rows) {
            if (row.classList.contains('atm-strike-highlight')) {
                return row;
            }
        }
        
        // Fallback: find middle row
        return rows[Math.floor(rows.length / 2)];
    }

    getCurrentExpiryDate() {
        const expirySelect = document.getElementById('expirySelect');
        return expirySelect ? expirySelect.value : null;
    }

    hideStrategySelector() {
        // Switch back to payoff chart tab
        const payoffTab = document.getElementById('payoff-tab');
        const payoffContent = document.getElementById('payoff-content');
        
        if (payoffTab && payoffContent) {
            // Remove active from strategy tab
            const strategyTab = document.getElementById('strategy-tab');
            const strategyContent = document.getElementById('strategy-content');
            
            if (strategyTab) {
                strategyTab.classList.remove('active');
                strategyTab.classList.add('btn-outline-secondary');
                strategyTab.classList.remove('btn-primary');
            }
            
            if (strategyContent) {
                strategyContent.classList.remove('show', 'active');
            }
            
            // Activate payoff chart tab
            payoffTab.classList.add('active');
            payoffTab.classList.remove('btn-outline-secondary'); 
            payoffTab.classList.add('btn-primary');
            
            payoffContent.classList.add('show', 'active');
        }
    }

    async updatePositionManagement() {
        // Trigger position management updates
        if (window.paperTradingSystem) {
            await window.paperTradingSystem.loadPortfolio();
            window.paperTradingSystem.updateVirtualBalanceDisplay();
        }
        
        // Refresh payoff chart
        if (window.refreshPayoffChart) {
            window.refreshPayoffChart();
        }
        
        // Refresh position tables
        if (window.refreshPositionTables) {
            window.refreshPositionTables();
        }
    }

    showNotification(title, message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        // Add to toast container or create one
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toast);
        const bootstrapToast = new bootstrap.Toast(toast);
        bootstrapToast.show();
        
        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize strategy selector when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.strategySelector = new StrategySelector();
    }, 1000);
});