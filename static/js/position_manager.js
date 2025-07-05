/**
 * Position Manager - Synchronized Trading System
 * Handles position management, payoff chart updates, and three-card synchronization
 */

class PositionManager {
    constructor() {
        this.positions = [];
        this.currentSymbol = '';
        this.currentExpiry = '';
        this.lotSize = 75;
        this.payoffChart = null;
        this.init();
    }

    init() {
        this.loadPositions();
        this.setupEventListeners();
        this.initPayoffChart();
    }

    setupEventListeners() {
        // Clear all positions button
        const clearBtn = document.getElementById('clearAllPositions');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllPositions());
        }
    }

    // Add Buy/Sell buttons to option chain table
    addTradingButtons() {
        const tableBody = document.getElementById('optionChainTableBody');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 11) return;

            const strike = parseFloat(cells[10].textContent.replace(/,/g, ''));
            const callLTP = parseFloat(cells[2].textContent.replace(/,/g, '')) || 0;
            const putLTP = parseFloat(cells[18].textContent.replace(/,/g, '')) || 0;

            // Add CE Buy/Sell buttons (after OI column)
            const ceBuyButton = this.createTradeButton('BUY', 'CE', strike, callLTP, 'btn-success');
            const ceSellButton = this.createTradeButton('SELL', 'CE', strike, callLTP, 'btn-danger');
            
            // Add PE Buy/Sell buttons (after OI column)
            const peBuyButton = this.createTradeButton('BUY', 'PE', strike, putLTP, 'btn-success');
            const peSellButton = this.createTradeButton('SELL', 'PE', strike, putLTP, 'btn-danger');

            // Create cells for buttons
            const ceButtonCell = document.createElement('td');
            ceButtonCell.className = 'text-center buy-sell-cell';
            ceButtonCell.appendChild(ceBuyButton);
            ceButtonCell.appendChild(ceSellButton);

            const peButtonCell = document.createElement('td');
            peButtonCell.className = 'text-center buy-sell-cell';
            peButtonCell.appendChild(peBuyButton);
            peButtonCell.appendChild(peSellButton);

            // Insert CE buttons at the beginning
            row.insertBefore(ceButtonCell, cells[0]);
            
            // Append PE buttons at the end
            row.appendChild(peButtonCell);
        });
    }

    createTradeButton(action, optionType, strike, ltp, btnClass) {
        const button = document.createElement('button');
        button.className = `btn ${btnClass} btn-sm me-1 trade-btn`;
        button.innerHTML = `${action.charAt(0)}<span class="count-badge d-none">0</span>`;
        button.style.position = 'relative';
        button.style.fontSize = '11px';
        button.style.padding = '2px 6px';
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            this.addPosition(action, optionType, strike, ltp);
        });

        return button;
    }

    async addPosition(action, optionType, strike, ltp) {
        if (!this.currentSymbol || !this.currentExpiry) {
            this.showAlert('Please select a symbol and expiry first', 'warning');
            return;
        }

        if (!ltp || ltp <= 0) {
            this.showAlert('Invalid LTP price', 'warning');
            return;
        }

        const positionData = {
            symbol: this.currentSymbol,
            strike: strike,
            expiry: this.currentExpiry,
            option_type: optionType,
            action: action,
            quantity: this.lotSize,
            entry_price: ltp,
            current_price: ltp,
            lot_size: this.lotSize
        };

        try {
            const response = await fetch('/api/positions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(positionData)
            });

            if (response.ok) {
                const newPosition = await response.json();
                this.positions.push(newPosition);
                this.updateAllCards();
                this.showAlert(`${action} ${optionType} position added successfully`, 'success');
            } else {
                throw new Error('Failed to add position');
            }
        } catch (error) {
            console.error('Error adding position:', error);
            this.showAlert('Failed to add position', 'danger');
        }
    }

    async loadPositions() {
        try {
            const response = await fetch('/api/positions');
            if (response.ok) {
                this.positions = await response.json();
                this.updateAllCards();
            }
        } catch (error) {
            console.error('Error loading positions:', error);
        }
    }

    async clearAllPositions() {
        if (!confirm('Are you sure you want to clear all positions?')) return;

        try {
            const response = await fetch('/api/positions/clear', {
                method: 'DELETE'
            });

            if (response.ok) {
                this.positions = [];
                this.updateAllCards();
                this.showAlert('All positions cleared', 'success');
            }
        } catch (error) {
            console.error('Error clearing positions:', error);
            this.showAlert('Failed to clear positions', 'danger');
        }
    }

    updateAllCards() {
        this.updatePositionsCard();
        this.updatePayoffChart();
        this.updateTradingButtons();
    }

    updatePositionsCard() {
        const tableBody = document.getElementById('positionsTableBody');
        const positionCount = document.getElementById('positionCount');
        const totalPnL = document.getElementById('totalPnL');
        const totalPremium = document.getElementById('totalPremium');

        if (!tableBody) return;

        // Update position count
        if (positionCount) {
            positionCount.textContent = `${this.positions.length} Position${this.positions.length !== 1 ? 's' : ''}`;
        }

        // Clear table
        tableBody.innerHTML = '';

        if (this.positions.length === 0) {
            tableBody.innerHTML = '<tr class="text-center text-muted"><td colspan="12">No positions added yet</td></tr>';
            if (totalPnL) totalPnL.textContent = '₹0.00';
            if (totalPremium) totalPremium.textContent = '₹0.00';
            return;
        }

        let totalP = 0;
        let totalPnLValue = 0;

        this.positions.forEach((position, index) => {
            const row = document.createElement('tr');
            
            const premium = position.entry_price * position.quantity;
            const pnl = position.pnl || 0;
            
            if (position.action === 'BUY') {
                totalP += premium;
            } else {
                totalP -= premium;
            }
            totalPnLValue += pnl;

            row.innerHTML = `
                <td>
                    <span class="badge ${position.option_type === 'CE' ? 'bg-success' : 'bg-info'}">${position.option_type}</span>
                </td>
                <td>
                    <span class="badge ${position.action === 'BUY' ? 'bg-primary' : 'bg-warning'}">${position.action}</span>
                </td>
                <td>1</td>
                <td>${position.quantity}</td>
                <td class="small">${position.symbol}</td>
                <td>${position.strike}</td>
                <td class="small">${position.expiry}</td>
                <td>₹${position.entry_price.toFixed(2)}</td>
                <td>₹${position.current_price.toFixed(2)}</td>
                <td>0.00</td>
                <td class="${pnl >= 0 ? 'text-success' : 'text-danger'}">₹${pnl.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="positionManager.removePosition(${position.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });

        // Update totals
        if (totalPnL) {
            totalPnL.textContent = `₹${totalPnLValue.toFixed(2)}`;
            totalPnL.className = `h5 mb-0 ${totalPnLValue >= 0 ? 'text-success' : 'text-danger'}`;
        }
        if (totalPremium) {
            totalPremium.textContent = `₹${totalP.toFixed(2)}`;
        }
    }

    async updatePayoffChart() {
        if (this.positions.length === 0) {
            this.clearPayoffChart();
            return;
        }

        try {
            const response = await fetch('/api/positions/payoff');
            if (response.ok) {
                const data = await response.json();
                this.renderPayoffChart(data.payoff_data);
            }
        } catch (error) {
            console.error('Error updating payoff chart:', error);
        }
    }

    initPayoffChart() {
        // Initialize Highcharts or Chart.js here
        const chartContainer = document.getElementById('payoffChart');
        if (chartContainer && typeof Highcharts !== 'undefined') {
            this.payoffChart = Highcharts.chart('payoffChart', {
                chart: {
                    type: 'line',
                    height: 300
                },
                title: {
                    text: 'Option Strategy Payoff'
                },
                xAxis: {
                    title: { text: 'Underlying Price' }
                },
                yAxis: {
                    title: { text: 'P&L' },
                    plotLines: [{
                        value: 0,
                        color: 'black',
                        dashStyle: 'solid',
                        width: 1
                    }]
                },
                series: [{
                    name: 'Payoff',
                    data: []
                }],
                legend: { enabled: false }
            });
        }
    }

    renderPayoffChart(payoffData) {
        if (this.payoffChart && payoffData.length > 0) {
            this.payoffChart.series[0].setData(payoffData);
        }
    }

    clearPayoffChart() {
        if (this.payoffChart) {
            this.payoffChart.series[0].setData([]);
        }
    }

    updateTradingButtons() {
        // Update button badges/counts if needed
        const buttons = document.querySelectorAll('.trade-btn');
        buttons.forEach(button => {
            const badge = button.querySelector('.count-badge');
            if (badge) {
                // Count positions for this button
                const strike = parseFloat(button.closest('tr').querySelector('td:nth-child(11)').textContent);
                const count = this.getPositionCount(strike);
                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('d-none');
                } else {
                    badge.classList.add('d-none');
                }
            }
        });
    }

    getPositionCount(strike) {
        return this.positions.filter(pos => pos.strike === strike).length;
    }

    async removePosition(positionId) {
        try {
            const response = await fetch(`/api/positions/${positionId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.positions = this.positions.filter(pos => pos.id !== positionId);
                this.updateAllCards();
                this.showAlert('Position removed', 'success');
            }
        } catch (error) {
            console.error('Error removing position:', error);
            this.showAlert('Failed to remove position', 'danger');
        }
    }

    setCurrentInstrument(symbol, expiry, lotSize = 75) {
        this.currentSymbol = symbol;
        this.currentExpiry = expiry;
        this.lotSize = lotSize;
    }

    showAlert(message, type = 'info') {
        // Create a simple toast notification
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 3000);
    }
}

// Initialize position manager
let positionManager;
document.addEventListener('DOMContentLoaded', function() {
    positionManager = new PositionManager();
    
    // Integrate with existing WebSocket handler
    if (window.wsHandler) {
        const originalUpdateOptionChain = window.wsHandler.updateOptionChainTable;
        window.wsHandler.updateOptionChainTable = function(strikes) {
            originalUpdateOptionChain.call(this, strikes);
            // Add trading buttons after table is updated
            setTimeout(() => {
                positionManager.addTradingButtons();
            }, 100);
        };
    }
});