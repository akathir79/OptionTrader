/**
 * Position Manager - Handles integration between Option Chain B/S buttons, 
 * Payoff Chart, and Current Position Card
 */

class PositionManager {
    constructor() {
        this.positions = [];
        this.currentSymbol = null;
        this.currentExpiry = null;
        this.currentSpotPrice = null;
        this.lotSize = 75; // Default lot size
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPositionsFromStorage();
        console.log('Position Manager initialized');
    }

    setupEventListeners() {
        // Listen for option chain B/S button clicks using event delegation
        document.addEventListener('click', (e) => {
            console.log('Click detected on:', e.target.tagName, e.target.classList.toString());
            
            // Check if clicked element or its parent has option_button class
            if (e.target.classList.contains('option_button') || 
                e.target.closest('.option_button')) {
                
                const button = e.target.classList.contains('option_button') ? 
                              e.target : e.target.closest('.option_button');
                              
                console.log('Option button clicked:', button);
                this.handleOptionButtonClick({...e, target: button});
            }
        });

        // Listen for payoff chart updates
        document.addEventListener('payoffChartUpdate', (e) => {
            this.handlePayoffChartUpdate(e.detail);
        });

        // Listen for current position card updates
        document.addEventListener('positionCardUpdate', (e) => {
            this.handlePositionCardUpdate(e.detail);
        });

        // Listen for symbol/expiry changes
        document.addEventListener('symbolChanged', (e) => {
            this.handleSymbolChange(e.detail);
        });

        document.addEventListener('expiryChanged', (e) => {
            this.handleExpiryChange(e.detail);
        });

        // Listen for spot price updates
        document.addEventListener('spotPriceUpdated', (e) => {
            this.handleSpotPriceUpdate(e.detail);
        });
    }

    handleOptionButtonClick(event) {
        console.log('handleOptionButtonClick called');
        const button = event.target;
        const row = button.closest('tr');
        const strike = this.getStrikeFromRow(row);
        const isBuy = button.classList.contains('buy_button');
        const optionType = this.getOptionTypeFromButton(button);
        
        console.log('Position details:', {
            strike: strike,
            optionType: optionType,
            isBuy: isBuy,
            rowExists: !!row,
            buttonClasses: button.classList.toString()
        });
        
        if (!strike || !optionType) {
            console.log('Missing strike or option type, returning');
            return;
        }

        // Get current price for this option
        const currentPrice = this.getCurrentPriceFromRow(row, optionType);
        
        // Create or update position
        const position = {
            strike: strike,
            optionType: optionType,
            action: isBuy ? 'BUY' : 'SELL',
            lots: 1,
            entryPrice: currentPrice,
            currentPrice: currentPrice,
            symbol: this.generateOptionSymbol(strike, optionType),
            expiry: this.currentExpiry,
            timestamp: new Date().toISOString()
        };

        this.updatePosition(position);
        this.updateButtonBadge(button, position);
        this.syncWithPayoffChart();
        this.syncWithPositionCard();
    }

    getStrikeFromRow(row) {
        // Find strike column - it should be highlighted with orange background
        const strikeCells = row.querySelectorAll('td');
        for (let cell of strikeCells) {
            if (cell.style.backgroundColor === 'rgb(243, 156, 18)' || 
                cell.textContent.match(/^\d+$/)) {
                return parseFloat(cell.textContent);
            }
        }
        return null;
    }

    getOptionTypeFromButton(button) {
        const cell = button.closest('td');
        const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
        
        // Determine if this is CE or PE based on position relative to strike
        // Assuming strike is in the middle, CE buttons are on the left, PE on the right
        const totalCells = cell.parentNode.children.length;
        const strikeIndex = Math.floor(totalCells / 2);
        
        return cellIndex < strikeIndex ? 'CE' : 'PE';
    }

    getCurrentPriceFromRow(row, optionType) {
        // Find LTP cell for the option type
        const ltpCells = row.querySelectorAll('td');
        // Logic to find the correct LTP cell based on option type
        // This would need to be adjusted based on your table structure
        for (let cell of ltpCells) {
            if (cell.textContent.match(/^\d+\.?\d*$/)) {
                return parseFloat(cell.textContent);
            }
        }
        return 0;
    }

    generateOptionSymbol(strike, optionType) {
        if (!this.currentSymbol || !this.currentExpiry) return '';
        
        // Generate symbol like NSE:NIFTY25JUL25400CE
        const baseSymbol = this.currentSymbol.replace('NSE:', '');
        const expiryCode = this.formatExpiryForSymbol(this.currentExpiry);
        return `NSE:${baseSymbol}${expiryCode}${strike}${optionType}`;
    }

    formatExpiryForSymbol(expiry) {
        // Convert expiry to symbol format (e.g., "31-Jul-25" to "25JUL")
        if (!expiry) return '';
        
        const parts = expiry.split('-');
        if (parts.length === 3) {
            const day = parts[0];
            const month = parts[1].toUpperCase();
            const year = parts[2];
            return `${year}${month}${day}`;
        }
        return expiry.replace(/-/g, '');
    }

    updatePosition(newPosition) {
        const existingIndex = this.positions.findIndex(p => 
            p.strike === newPosition.strike && 
            p.optionType === newPosition.optionType &&
            p.expiry === newPosition.expiry
        );

        if (existingIndex >= 0) {
            // Update existing position
            const existing = this.positions[existingIndex];
            
            if (existing.action === newPosition.action) {
                // Same action - increase lots
                existing.lots += newPosition.lots;
            } else {
                // Opposite action - reduce lots or reverse position
                if (existing.lots > newPosition.lots) {
                    existing.lots -= newPosition.lots;
                } else if (existing.lots < newPosition.lots) {
                    existing.action = newPosition.action;
                    existing.lots = newPosition.lots - existing.lots;
                    existing.entryPrice = newPosition.entryPrice;
                } else {
                    // Equal lots - remove position
                    this.positions.splice(existingIndex, 1);
                    this.savePositionsToStorage();
                    return;
                }
            }
            existing.currentPrice = newPosition.currentPrice;
            existing.timestamp = newPosition.timestamp;
        } else {
            // Add new position
            this.positions.push(newPosition);
        }

        this.savePositionsToStorage();
    }

    updateButtonBadge(button, position) {
        let badge = button.querySelector('.count_badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'count_badge';
            button.appendChild(badge);
        }

        // Find total lots for this strike/option type
        const totalLots = this.getTotalLotsForPosition(position.strike, position.optionType);
        
        if (totalLots > 0) {
            badge.textContent = totalLots;
            badge.style.display = 'block';
            button.classList.add('active');
        } else {
            badge.style.display = 'none';
            button.classList.remove('active');
        }
    }

    getTotalLotsForPosition(strike, optionType) {
        return this.positions
            .filter(p => p.strike === strike && p.optionType === optionType && p.expiry === this.currentExpiry)
            .reduce((total, p) => {
                return p.action === 'BUY' ? total + p.lots : total - p.lots;
            }, 0);
    }

    syncWithPayoffChart() {
        // Update payoff chart with current positions
        if (window.updatePayoffChart) {
            const payoffData = this.generatePayoffData();
            window.updatePayoffChart(payoffData);
        }

        // Dispatch event for payoff chart
        const event = new CustomEvent('positionsUpdated', {
            detail: {
                positions: this.positions,
                spotPrice: this.currentSpotPrice,
                strikes: this.getUniqueStrikes()
            }
        });
        document.dispatchEvent(event);
    }

    syncWithPositionCard() {
        // Update current position card
        this.updateCurrentPositionCard();
        
        // Dispatch event for position card updates
        const event = new CustomEvent('positionCardSync', {
            detail: {
                positions: this.positions,
                totalPnL: this.calculateTotalPnL(),
                lotSize: this.lotSize
            }
        });
        document.dispatchEvent(event);
    }

    updateCurrentPositionCard() {
        const positionContainer = document.getElementById('currentPositions');
        if (!positionContainer) return;

        // Clear existing positions
        positionContainer.innerHTML = '';

        // Group positions by expiry
        const positionsByExpiry = this.groupPositionsByExpiry();

        Object.keys(positionsByExpiry).forEach(expiry => {
            const expiryGroup = positionsByExpiry[expiry];
            this.createExpirySection(positionContainer, expiry, expiryGroup);
        });

        // Update summary
        this.updatePositionSummary();
    }

    groupPositionsByExpiry() {
        const groups = {};
        this.positions.forEach(position => {
            if (!groups[position.expiry]) {
                groups[position.expiry] = [];
            }
            groups[position.expiry].push(position);
        });
        return groups;
    }

    createExpirySection(container, expiry, positions) {
        const section = document.createElement('div');
        section.className = 'position-expiry-section mb-3';
        
        // Create expiry header
        const header = document.createElement('div');
        header.className = 'expiry-header d-flex justify-content-between align-items-center p-2 bg-primary text-white rounded';
        header.innerHTML = `
            <span><i class="fas fa-calendar-alt me-2"></i>${expiry}</span>
            <span class="badge bg-light text-dark">${positions.length} Position${positions.length !== 1 ? 's' : ''}</span>
        `;
        section.appendChild(header);

        // Create positions list
        const positionsList = document.createElement('div');
        positionsList.className = 'positions-list';
        
        positions.forEach(position => {
            const positionElement = this.createPositionElement(position);
            positionsList.appendChild(positionElement);
        });
        
        section.appendChild(positionsList);
        container.appendChild(section);
    }

    createPositionElement(position) {
        const element = document.createElement('div');
        element.className = 'position-item d-flex justify-content-between align-items-center p-2 border-bottom';
        
        const pnl = this.calculatePositionPnL(position);
        const pnlClass = pnl >= 0 ? 'text-success' : 'text-danger';
        
        element.innerHTML = `
            <div class="position-details">
                <div class="fw-bold">${position.strike} ${position.optionType}</div>
                <div class="small text-muted">${position.action} ${position.lots} lot${position.lots !== 1 ? 's' : ''}</div>
            </div>
            <div class="position-values text-end">
                <div class="fw-bold ${pnlClass}">₹${pnl.toFixed(2)}</div>
                <div class="small text-muted">@₹${position.currentPrice.toFixed(2)}</div>
            </div>
            <div class="position-controls">
                <button class="btn btn-sm btn-outline-secondary" onclick="positionManager.editPosition('${position.strike}', '${position.optionType}', '${position.expiry}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="positionManager.removePosition('${position.strike}', '${position.optionType}', '${position.expiry}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return element;
    }

    calculatePositionPnL(position) {
        const priceDiff = position.currentPrice - position.entryPrice;
        const multiplier = position.action === 'BUY' ? 1 : -1;
        return priceDiff * multiplier * position.lots * this.lotSize;
    }

    calculateTotalPnL() {
        return this.positions.reduce((total, position) => {
            return total + this.calculatePositionPnL(position);
        }, 0);
    }

    updatePositionSummary() {
        const summaryElement = document.getElementById('positionSummary');
        if (!summaryElement) return;

        const totalPnL = this.calculateTotalPnL();
        const totalPositions = this.positions.length;
        const pnlClass = totalPnL >= 0 ? 'text-success' : 'text-danger';

        summaryElement.innerHTML = `
            <div class="d-flex justify-content-between">
                <span>Total Positions: <strong>${totalPositions}</strong></span>
                <span>Lot Size: <strong>${this.lotSize}</strong></span>
            </div>
            <div class="mt-2">
                <span>Total P&L: <strong class="${pnlClass}">₹${totalPnL.toFixed(2)}</strong></span>
            </div>
        `;
    }

    generatePayoffData() {
        if (this.positions.length === 0) return { strikes: [], payoffData: [] };

        const strikes = this.getUniqueStrikes();
        const payoffData = [];

        // Generate payoff for a range around current strikes
        const minStrike = Math.min(...strikes) - 500;
        const maxStrike = Math.max(...strikes) + 500;
        
        for (let price = minStrike; price <= maxStrike; price += 50) {
            let totalPayoff = 0;
            
            this.positions.forEach(position => {
                const intrinsicValue = this.calculateIntrinsicValue(price, position.strike, position.optionType);
                const optionValue = Math.max(0, intrinsicValue);
                const positionValue = optionValue - position.entryPrice;
                const multiplier = position.action === 'BUY' ? 1 : -1;
                totalPayoff += positionValue * multiplier * position.lots * this.lotSize;
            });
            
            payoffData.push([price, totalPayoff]);
        }

        return { strikes, payoffData, spotPrice: this.currentSpotPrice };
    }

    calculateIntrinsicValue(spotPrice, strikePrice, optionType) {
        if (optionType === 'CE') {
            return Math.max(0, spotPrice - strikePrice);
        } else if (optionType === 'PE') {
            return Math.max(0, strikePrice - spotPrice);
        }
        return 0;
    }

    getUniqueStrikes() {
        return [...new Set(this.positions.map(p => p.strike))].sort((a, b) => a - b);
    }

    // Event handlers
    handleSymbolChange(data) {
        this.currentSymbol = data.symbol;
        this.syncWithPayoffChart();
    }

    handleExpiryChange(data) {
        this.currentExpiry = data.expiry;
        this.syncWithPositionCard();
    }

    handleSpotPriceUpdate(data) {
        this.currentSpotPrice = data.spotPrice;
        this.updateCurrentPrices();
        this.syncWithPayoffChart();
        this.syncWithPositionCard();
    }

    updateCurrentPrices() {
        // Update current prices for all positions based on live data
        // This would integrate with your WebSocket data
        if (window.webSocketHandler && window.webSocketHandler.getCurrentLiveData) {
            const liveData = window.webSocketHandler.getCurrentLiveData();
            
            this.positions.forEach(position => {
                if (liveData[position.symbol]) {
                    position.currentPrice = liveData[position.symbol].ltp || position.currentPrice;
                }
            });
        }
    }

    // Storage methods
    savePositionsToStorage() {
        localStorage.setItem('tradingPositions', JSON.stringify(this.positions));
    }

    loadPositionsFromStorage() {
        const stored = localStorage.getItem('tradingPositions');
        if (stored) {
            try {
                this.positions = JSON.parse(stored);
                this.syncAllButtonBadges();
            } catch (e) {
                console.warn('Error loading positions from storage:', e);
                this.positions = [];
            }
        }
    }

    syncAllButtonBadges() {
        // Update all button badges based on stored positions
        document.querySelectorAll('.option_button').forEach(button => {
            const row = button.closest('tr');
            const strike = this.getStrikeFromRow(row);
            const optionType = this.getOptionTypeFromButton(button);
            
            if (strike && optionType) {
                const position = { strike, optionType };
                this.updateButtonBadge(button, position);
            }
        });
    }

    // Public methods for external access
    clearAllPositions() {
        this.positions = [];
        this.savePositionsToStorage();
        this.syncWithPayoffChart();
        this.syncWithPositionCard();
        this.syncAllButtonBadges();
    }

    setLotSize(lotSize) {
        this.lotSize = lotSize;
        // Update all lot size displays
        const lotSizeElements = document.querySelectorAll('#lotSizeDisplay, #footerLotSize');
        lotSizeElements.forEach(element => {
            if (element) element.textContent = lotSize;
        });
        this.syncWithPayoffChart();
        this.syncWithPositionCard();
    }

    exportPositions() {
        return JSON.stringify(this.positions, null, 2);
    }

    importPositions(positionsJson) {
        try {
            this.positions = JSON.parse(positionsJson);
            this.savePositionsToStorage();
            this.syncWithPayoffChart();
            this.syncWithPositionCard();
            this.syncAllButtonBadges();
            return true;
        } catch (e) {
            console.error('Error importing positions:', e);
            return false;
        }
    }

    // Position management methods
    editPosition(strike, optionType, expiry) {
        const position = this.positions.find(p => 
            p.strike == strike && p.optionType === optionType && p.expiry === expiry
        );
        
        if (position) {
            // Show edit modal or interface
            this.showPositionEditModal(position);
        }
    }

    removePosition(strike, optionType, expiry) {
        this.positions = this.positions.filter(p => 
            !(p.strike == strike && p.optionType === optionType && p.expiry === expiry)
        );
        
        this.savePositionsToStorage();
        this.syncWithPayoffChart();
        this.syncWithPositionCard();
        this.syncAllButtonBadges();
    }

    showPositionEditModal(position) {
        // Create and show position edit modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Position</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Strike: ${position.strike} ${position.optionType}</label>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Action</label>
                            <select class="form-select" id="editAction">
                                <option value="BUY" ${position.action === 'BUY' ? 'selected' : ''}>BUY</option>
                                <option value="SELL" ${position.action === 'SELL' ? 'selected' : ''}>SELL</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Lots</label>
                            <input type="number" class="form-control" id="editLots" value="${position.lots}" min="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Entry Price</label>
                            <input type="number" class="form-control" id="editEntryPrice" value="${position.entryPrice}" step="0.01">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="savePositionEdit">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Handle save
        modal.querySelector('#savePositionEdit').addEventListener('click', () => {
            position.action = modal.querySelector('#editAction').value;
            position.lots = parseInt(modal.querySelector('#editLots').value);
            position.entryPrice = parseFloat(modal.querySelector('#editEntryPrice').value);
            
            this.savePositionsToStorage();
            this.syncWithPayoffChart();
            this.syncWithPositionCard();
            this.syncAllButtonBadges();
            
            bsModal.hide();
        });
        
        // Cleanup on close
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }
}

// Initialize position manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.positionManager = new PositionManager();
});

// Export for other modules
window.PositionManager = PositionManager;