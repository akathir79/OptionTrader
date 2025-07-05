/**
 * Position Manager - EXACT COPY of working reference implementation
 */

// Global counters and flags - exact copy from working reference
let counters = [];
let firstClickFlags = [];
const defaultLotSize = 75;
const defaultLot = 1;

class PositionManagerWorking {
    constructor() {
        this.positions = [];
        this.currentSymbol = null;
        this.currentExpiry = null;
        this.currentSpotPrice = null;
        this.lotSize = 75;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCounters();
        console.log('Position Manager Working initialized');
    }

    initializeCounters() {
        // Initialize counters for existing table rows
        const tableBody = document.querySelector('#optionChainTableBody');
        if (tableBody) {
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach((row, rowIndex) => {
                counters[rowIndex] = { ceBuy: 0, ceSell: 0, peBuy: 0, peSell: 0 };
                firstClickFlags[rowIndex] = { ceBuy: true, ceSell: true, peBuy: true, peSell: true };
            });
        }
    }

    setupEventListeners() {
        // Add click listeners to existing buttons - exact copy from reference
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('option_button')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Extract rowIndex and key from button ID or data attributes
                const button = e.target;
                const row = button.closest('tr');
                const tableBody = document.querySelector('#optionChainTableBody');
                const rowIndex = Array.from(tableBody.querySelectorAll('tr')).indexOf(row);
                
                if (rowIndex === -1) return;
                
                // Determine button key
                const isBuy = button.classList.contains('buy_button');
                const buttonCell = button.closest('td');
                const isCallSide = buttonCell.classList.contains('call_bs') || 
                                  Array.from(row.querySelectorAll('td')).indexOf(buttonCell) < 3;
                
                const key = isCallSide ? 
                    (isBuy ? 'ceBuy' : 'ceSell') : 
                    (isBuy ? 'peBuy' : 'peSell');
                
                // Initialize if needed
                if (!counters[rowIndex]) {
                    counters[rowIndex] = { ceBuy: 0, ceSell: 0, peBuy: 0, peSell: 0 };
                }
                if (!firstClickFlags[rowIndex]) {
                    firstClickFlags[rowIndex] = { ceBuy: true, ceSell: true, peBuy: true, peSell: true };
                }
                
                console.log('Button clicked:', { rowIndex, key, isFirstClick: firstClickFlags[rowIndex][key] });
                
                // Exact logic from reference
                this.onButtonClick(e, rowIndex, key);
            }
        });
    }

    // EXACT COPY from reference implementation
    onButtonClick(e, rowIndex, key) {
        e.stopPropagation();
        if (firstClickFlags[rowIndex][key]) {
            this.increment(rowIndex, key, e);
            firstClickFlags[rowIndex][key] = false;
        } else {
            this.toggleDropdown(rowIndex, key);
        }
    }

    // EXACT COPY from reference implementation
    increment(rowIndex, key, e) {
        e.stopPropagation();
        counters[rowIndex][key]++;
        this.updateUI(rowIndex, key);
        this.hideDropdown(rowIndex, key);
        this.logAction(rowIndex, key, true);
        this.updatePayoffChartAndMargin();
    }

    // EXACT COPY from reference implementation
    removeCount(rowIndex, key, e) {
        e.stopPropagation();
        if (counters[rowIndex][key] > 0) {
            counters[rowIndex][key]--;
            this.updateUI(rowIndex, key);
            if (counters[rowIndex][key] === 0) {
                firstClickFlags[rowIndex][key] = true;
            }
            this.hideDropdown(rowIndex, key);
            this.logAction(rowIndex, key, false);
            this.updatePayoffChartAndMargin();
        }
    }

    // EXACT COPY from reference implementation
    updateUI(rowIndex, key) {
        // Find button by class and position
        const tableBody = document.querySelector('#optionChainTableBody');
        const row = tableBody.querySelectorAll('tr')[rowIndex];
        if (!row) return;
        
        // Find the specific button
        const buttons = row.querySelectorAll('.option_button');
        let targetButton = null;
        
        buttons.forEach(button => {
            const isBuy = button.classList.contains('buy_button');
            const buttonCell = button.closest('td');
            const isCallSide = Array.from(row.querySelectorAll('td')).indexOf(buttonCell) < 3;
            
            const buttonKey = isCallSide ? 
                (isBuy ? 'ceBuy' : 'ceSell') : 
                (isBuy ? 'peBuy' : 'peSell');
                
            if (buttonKey === key) {
                targetButton = button;
            }
        });
        
        if (!targetButton) return;
        
        const val = counters[rowIndex][key];
        
        // Update or create badge
        let badge = targetButton.querySelector('.count_badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'count_badge';
            targetButton.appendChild(badge);
        }
        
        badge.textContent = val;
        badge.style.display = val > 0 ? "block" : "none";

        if (val > 0) {
            targetButton.classList.add("active");
        } else {
            targetButton.classList.remove("active");
        }
        
        console.log('UI updated:', { rowIndex, key, count: val });
    }

    // EXACT COPY from reference implementation
    logAction(rowIndex, key, isAdd) {
        const tableBody = document.querySelector('#optionChainTableBody');
        const row = tableBody.querySelectorAll('tr')[rowIndex];
        if (!row) return;
        
        // Get strike from row
        const strikeCell = row.querySelector('td:nth-child(3)');
        const strike = strikeCell ? parseInt(strikeCell.textContent.trim()) : 0;
        
        const countVal = counters[rowIndex][key];
        
        // Create position entry
        const position = {
            rowIndex: rowIndex,
            key: key,
            strike: strike,
            optionType: key.startsWith('ce') ? 'CE' : 'PE',
            action: key.includes('Buy') ? 'BUY' : 'SELL',
            count: countVal,
            entryPrice: 100, // Default for now
            currentPrice: 100,
            lotSize: defaultLotSize,
            lots: countVal,
            timestamp: new Date().toISOString()
        };
        
        if (isAdd) {
            // Add or update position
            const existingIndex = this.positions.findIndex(p => 
                p.rowIndex === rowIndex && p.key === key
            );
            
            if (existingIndex >= 0) {
                this.positions[existingIndex] = position;
            } else {
                this.positions.push(position);
            }
        } else {
            // Remove or update position
            if (countVal === 0) {
                this.positions = this.positions.filter(p => 
                    !(p.rowIndex === rowIndex && p.key === key)
                );
            } else {
                const existingIndex = this.positions.findIndex(p => 
                    p.rowIndex === rowIndex && p.key === key
                );
                if (existingIndex >= 0) {
                    this.positions[existingIndex] = position;
                }
            }
        }
        
        console.log('Position logged:', position);
        this.updateCurrentPositionCard();
    }

    updatePayoffChartAndMargin() {
        // Create payoff data from positions
        const payoffData = this.positions.map(position => ({
            strike: position.strike,
            optionType: position.optionType,
            action: position.action,
            lots: position.count,
            entryPrice: position.entryPrice,
            currentPrice: position.currentPrice
        }));
        
        // Trigger payoff chart update
        const event = new CustomEvent('positionsUpdated', {
            detail: { positions: payoffData }
        });
        document.dispatchEvent(event);
        
        console.log('Payoff chart updated with positions:', payoffData);
    }

    updateCurrentPositionCard() {
        // Update the current position card
        const positionCard = document.querySelector('#currentPositionCard .card-body');
        if (!positionCard) return;
        
        if (this.positions.length === 0) {
            positionCard.innerHTML = '<p class="text-muted">No positions selected</p>';
            return;
        }
        
        let html = '<div class="position-list">';
        this.positions.forEach(position => {
            const colorClass = position.action === 'BUY' ? 'text-success' : 'text-danger';
            html += `
                <div class="position-item d-flex justify-content-between align-items-center mb-2">
                    <span class="${colorClass}">
                        ${position.action} ${position.count} ${position.strike} ${position.optionType}
                    </span>
                    <span class="text-muted">₹${position.entryPrice}</span>
                </div>
            `;
        });
        html += '</div>';
        
        positionCard.innerHTML = html;
    }

    toggleDropdown(rowIndex, key) {
        // For now, just increment again - can add dropdown later
        console.log('Toggle dropdown - incrementing instead');
        this.increment(rowIndex, key, { stopPropagation: () => {} });
    }

    hideDropdown(rowIndex, key) {
        // No-op for now
    }

    clearAllPositions() {
        // Reset all counters
        counters.forEach((row, rowIndex) => {
            Object.keys(row).forEach(key => {
                counters[rowIndex][key] = 0;
                firstClickFlags[rowIndex][key] = true;
                this.updateUI(rowIndex, key);
            });
        });
        
        this.positions = [];
        this.updateCurrentPositionCard();
        this.updatePayoffChartAndMargin();
        
        console.log('All positions cleared');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other components to load
    setTimeout(() => {
        window.positionManagerWorking = new PositionManagerWorking();
    }, 1000);
});

// Export for other modules
window.PositionManagerWorking = PositionManagerWorking;