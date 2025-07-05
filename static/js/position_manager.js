/**
 * Position Manager for Option Chain Interactive Trading
 * Based on the payoff chart HTML implementation
 */

class PositionManager {
    constructor() {
        this.defaultLotSize = 75;
        this.defaultLot = 1;
        this.counters = [];
        this.firstClickFlags = [];
        this.payoffChart = null;
        this.currentSpotPrice = 22950; // Default, will be updated from real data
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initPayoffChart();
        this.setupPositionCard();
    }

    setupEventListeners() {
        // Close all dropdowns when clicking outside
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });

        // Setup Clear All button
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllPositions();
            });
        }
    }

    // Initialize Highcharts payoff chart
    initPayoffChart() {
        if (typeof Highcharts === 'undefined') {
            console.warn('Highcharts not loaded, payoff chart will not be available');
            return;
        }

        this.payoffChart = Highcharts.chart('payoffChartContainer', {
            chart: { 
                type: 'area',
                height: 300
            },
            title: { text: 'Multi-Leg Payoff Chart' },
            xAxis: { 
                title: { text: 'Underlying Price' }, 
                crosshair: true 
            },
            yAxis: { 
                title: { text: 'Net P&L (₹)' },
                plotLines: [{
                    value: 0,
                    color: '#000',
                    width: 1,
                    zIndex: 4
                }]
            },
            tooltip: { 
                valuePrefix: '₹',
                valueSuffix: '',
                pointFormat: '<b>{point.y:,.0f}</b>'
            },
            plotOptions: {
                area: {
                    marker: { enabled: false },
                    zoneAxis: 'x',
                    zones: []
                }
            },
            series: [{
                name: 'Payoff',
                data: [],
                color: '#007bff'
            }],
            credits: { enabled: false }
        });
    }

    // Setup the current position card
    setupPositionCard() {
        const positionCard = document.getElementById('currentPositionCard');
        if (!positionCard) return;

        positionCard.innerHTML = `
            <div class="card-header">
                <h6 class="mb-0">Current Positions</h6>
            </div>
            <div class="card-body p-2">
                <div id="positionSummary" class="position-summary">
                    <div class="row text-center">
                        <div class="col-6">
                            <div class="metric-label">Net P&L</div>
                            <div class="metric-value" id="netPL">₹0.00</div>
                        </div>
                        <div class="col-6">
                            <div class="metric-label">Total Margin</div>
                            <div class="metric-value" id="totalMargin">₹0.00</div>
                        </div>
                    </div>
                    <div class="row text-center mt-2">
                        <div class="col-6">
                            <div class="metric-label">Max Profit</div>
                            <div class="metric-value" id="maxProfit">₹0.00</div>
                        </div>
                        <div class="col-6">
                            <div class="metric-label">Max Loss</div>
                            <div class="metric-value" id="maxLoss">₹0.00</div>
                        </div>
                    </div>
                </div>
                <div id="positionList" class="mt-2"></div>
            </div>
        `;
    }

    // Create B/S buttons for a specific row
    createButton(rowIndex, key, label, extraClass) {
        const div = document.createElement('div');
        div.className = `option_button ${extraClass}`;
        div.id = `${key}Btn_${rowIndex}`;
        div.textContent = label + ' ';

        // The numeric badge that shows how many lots
        const badge = document.createElement('span');
        badge.className = 'count_badge';
        badge.id = `${key}Badge_${rowIndex}`;
        badge.textContent = '0';
        div.appendChild(badge);

        // The "+ Add" / "X Remove" dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown_menu';
        dropdown.id = `${key}Menu_${rowIndex}`;
        
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add';
        addBtn.onclick = (e) => this.increment(rowIndex, key, e);
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'X Remove';
        removeBtn.onclick = (e) => this.removeCount(rowIndex, key, e);

        dropdown.appendChild(addBtn);
        dropdown.appendChild(removeBtn);
        div.appendChild(dropdown);

        // Main click handler
        div.onclick = (e) => this.onButtonClick(e, rowIndex, key);
        return div;
    }

    // Initialize counters for a row
    initializeRowCounters(rowIndex) {
        if (!this.counters[rowIndex]) {
            this.counters[rowIndex] = { ceBuy: 0, ceSell: 0, peBuy: 0, peSell: 0 };
            this.firstClickFlags[rowIndex] = { ceBuy: true, ceSell: true, peBuy: true, peSell: true };
        }
    }

    // Handle button clicks - first click adds, subsequent clicks show dropdown
    onButtonClick(e, rowIndex, key) {
        e.stopPropagation();
        this.initializeRowCounters(rowIndex);
        
        if (this.firstClickFlags[rowIndex][key]) {
            this.increment(rowIndex, key, e);
            this.firstClickFlags[rowIndex][key] = false;
        } else {
            this.toggleDropdown(rowIndex, key);
        }
    }

    // Add position (+ Add)
    increment(rowIndex, key, e) {
        e.stopPropagation();
        this.initializeRowCounters(rowIndex);
        
        this.counters[rowIndex][key]++;
        this.updateUI(rowIndex, key);
        this.hideDropdown(rowIndex, key);
        this.updatePositionCard();
        this.updatePayoffChart();
    }

    // Remove position (X Remove)
    removeCount(rowIndex, key, e) {
        e.stopPropagation();
        this.initializeRowCounters(rowIndex);
        
        if (this.counters[rowIndex][key] > 0) {
            this.counters[rowIndex][key]--;
            this.updateUI(rowIndex, key);
            if (this.counters[rowIndex][key] === 0) {
                this.firstClickFlags[rowIndex][key] = true;
            }
            this.hideDropdown(rowIndex, key);
            this.updatePositionCard();
            this.updatePayoffChart();
        }
    }

    // Update UI to reflect new counts
    updateUI(rowIndex, key) {
        const badgeEl = document.getElementById(`${key}Badge_${rowIndex}`);
        const val = this.counters[rowIndex][key];
        
        if (badgeEl) {
            badgeEl.textContent = val;
            badgeEl.style.display = val > 0 ? 'block' : 'none';
        }

        const btnEl = document.getElementById(`${key}Btn_${rowIndex}`);
        if (btnEl) {
            if (val > 0) btnEl.classList.add('active');
            else btnEl.classList.remove('active');
        }
    }

    // Dropdown management
    toggleDropdown(rowIndex, key) {
        this.closeAllDropdowns();
        const menu = document.getElementById(`${key}Menu_${rowIndex}`);
        if (menu) {
            menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
        }
    }

    hideDropdown(rowIndex, key) {
        const menu = document.getElementById(`${key}Menu_${rowIndex}`);
        if (menu) menu.style.display = 'none';
    }

    closeAllDropdowns() {
        document.querySelectorAll('.dropdown_menu').forEach((m) => {
            m.style.display = 'none';
        });
    }

    // Get current positions data
    getCurrentPositions() {
        const positions = [];
        
        for (let rowIndex = 0; rowIndex < this.counters.length; rowIndex++) {
            if (!this.counters[rowIndex]) continue;
            
            const rowData = this.getRowData(rowIndex);
            if (!rowData) continue;

            Object.keys(this.counters[rowIndex]).forEach(key => {
                const count = this.counters[rowIndex][key];
                if (count > 0) {
                    const action = this.getActionFromKey(key);
                    const premium = this.getPremiumFromKey(key, rowData);
                    
                    positions.push({
                        rowIndex,
                        key,
                        action,
                        strike: rowData.strike,
                        premium,
                        count,
                        expiry: rowData.expiry || '27 Jan',
                        date: rowData.date || new Date().toLocaleDateString()
                    });
                }
            });
        }
        
        return positions;
    }

    // Helper to get row data from the table
    getRowData(rowIndex) {
        const tableBody = document.getElementById('optionChainTableBody');
        if (!tableBody) return null;
        
        const rows = tableBody.querySelectorAll('tr');
        if (!rows[rowIndex]) return null;
        
        const cells = rows[rowIndex].querySelectorAll('td');
        if (cells.length < 10) return null;
        
        return {
            strike: parseFloat(cells[4].textContent.trim()) || 0,
            callLtp: parseFloat(cells[1].textContent.trim()) || 0,
            putLtp: parseFloat(cells[7].textContent.trim()) || 0,
            expiry: '27 Jan', // Default expiry
            date: new Date().toLocaleDateString()
        };
    }

    // Convert key to action text
    getActionFromKey(key) {
        switch (key) {
            case 'ceBuy': return 'CE Buy';
            case 'ceSell': return 'CE Sell';
            case 'peBuy': return 'PE Buy';
            case 'peSell': return 'PE Sell';
            default: return key;
        }
    }

    // Get premium from key and row data
    getPremiumFromKey(key, rowData) {
        if (key.startsWith('ce')) {
            return rowData.callLtp || 0;
        } else {
            return rowData.putLtp || 0;
        }
    }

    // Calculate single option payoff
    singleOptionPayoff(action, strike, premium, count, spotPrice) {
        let payoff = 0;
        switch (action) {
            case 'CE Buy':
                payoff = Math.max(spotPrice - strike, 0) - premium;
                break;
            case 'CE Sell':
                payoff = premium - Math.max(spotPrice - strike, 0);
                break;
            case 'PE Buy':
                payoff = Math.max(strike - spotPrice, 0) - premium;
                break;
            case 'PE Sell':
                payoff = premium - Math.max(strike - spotPrice, 0);
                break;
        }
        return payoff * count * this.defaultLotSize * this.defaultLot;
    }

    // Update payoff chart
    updatePayoffChart() {
        if (!this.payoffChart) return;

        const positions = this.getCurrentPositions();
        
        if (positions.length === 0) {
            this.payoffChart.series[0].setData([], true);
            return;
        }

        // Build payoff data across a range
        const allStrikes = positions.map(pos => pos.strike);
        const minStrike = Math.min(...allStrikes) - 500;
        const maxStrike = Math.max(...allStrikes) + 500;
        const step = Math.max(1, Math.floor((maxStrike - minStrike) / 100));

        const payoffData = [];
        for (let S = minStrike; S <= maxStrike; S += step) {
            let total = 0;
            positions.forEach(pos => {
                total += this.singleOptionPayoff(pos.action, pos.strike, pos.premium, pos.count, S);
            });
            payoffData.push([S, total]);
        }

        payoffData.sort((a, b) => a[0] - b[0]);
        this.payoffChart.series[0].setData(payoffData, true);

        // Update zones for profit/loss coloring
        this.updateChartZones(payoffData);
    }

    // Update chart zones for profit/loss visualization
    updateChartZones(payoffData) {
        const zones = [];
        let currentColor = payoffData[0][1] >= 0 ? '#28A745' : '#FF4C4C';
        
        // Find breakeven points
        for (let i = 1; i < payoffData.length; i++) {
            const [x1, y1] = payoffData[i - 1];
            const [x2, y2] = payoffData[i];
            
            if ((y1 < 0 && y2 >= 0) || (y1 > 0 && y2 <= 0)) {
                const slope = (y2 - y1) / (x2 - x1);
                const intercept = y1 - slope * x1;
                const breakeven = -intercept / slope;
                
                zones.push({ value: breakeven, color: currentColor });
                currentColor = currentColor === '#FF4C4C' ? '#28A745' : '#FF4C4C';
            }
        }
        
        // Final zone
        zones.push({ color: currentColor });
        
        this.payoffChart.series[0].update({
            zones: zones
        }, true);
    }

    // Update current position card
    updatePositionCard() {
        const positions = this.getCurrentPositions();
        
        // Calculate metrics
        let totalMargin = 0;
        let netCredit = 0;
        let currentPL = 0;
        
        positions.forEach(pos => {
            const countSize = pos.count * this.defaultLotSize;
            if (pos.action.endsWith('Buy')) {
                const buyMargin = pos.premium * countSize;
                totalMargin += buyMargin;
                netCredit -= buyMargin;
            } else {
                const optionProceeds = pos.premium * countSize;
                const underlyingValue = this.currentSpotPrice * countSize * 0.2;
                totalMargin += optionProceeds + underlyingValue;
                netCredit += optionProceeds;
            }
            
            currentPL += this.singleOptionPayoff(pos.action, pos.strike, pos.premium, pos.count, this.currentSpotPrice);
        });

        // Calculate max profit/loss
        const { maxProfit, maxLoss } = this.calculateMaxProfitLoss(positions);
        
        // Update UI
        this.updatePositionMetrics(currentPL, totalMargin, maxProfit, maxLoss);
        this.updatePositionList(positions);
    }

    // Calculate max profit and loss
    calculateMaxProfitLoss(positions) {
        if (positions.length === 0) return { maxProfit: 0, maxLoss: 0 };
        
        const allStrikes = positions.map(pos => pos.strike);
        const minStrike = Math.min(...allStrikes) - 500;
        const maxStrike = Math.max(...allStrikes) + 500;
        const step = Math.max(1, Math.floor((maxStrike - minStrike) / 100));

        const payoffValues = [];
        for (let S = minStrike; S <= maxStrike; S += step) {
            let total = 0;
            positions.forEach(pos => {
                total += this.singleOptionPayoff(pos.action, pos.strike, pos.premium, pos.count, S);
            });
            payoffValues.push(total);
        }

        return {
            maxProfit: Math.max(...payoffValues),
            maxLoss: Math.min(...payoffValues)
        };
    }

    // Update position metrics display
    updatePositionMetrics(currentPL, totalMargin, maxProfit, maxLoss) {
        // Update our dedicated position card elements
        const elements = {
            netPL: document.getElementById('netPL'),
            totalMargin: document.getElementById('totalMargin'),
            maxProfit: document.getElementById('maxProfit'),
            maxLoss: document.getElementById('maxLoss')
        };

        if (elements.netPL) {
            elements.netPL.textContent = `₹${currentPL.toFixed(2)}`;
            elements.netPL.style.color = this.getColor(currentPL);
        }
        
        if (elements.totalMargin) {
            elements.totalMargin.textContent = `₹${totalMargin.toFixed(2)}`;
            elements.totalMargin.style.color = this.getColor(totalMargin);
        }
        
        if (elements.maxProfit) {
            elements.maxProfit.textContent = `₹${maxProfit.toFixed(2)}`;
            elements.maxProfit.style.color = this.getColor(maxProfit);
        }
        
        if (elements.maxLoss) {
            elements.maxLoss.textContent = `₹${maxLoss.toFixed(2)}`;
            elements.maxLoss.style.color = this.getColor(maxLoss);
        }

        // Also update the main payoff chart metric elements
        const chartElements = {
            pnlValue: document.getElementById('pnlValue'),
            marginValue: document.getElementById('marginValue'),
            maxProfitValue: document.getElementById('maxProfitValue'),
            maxLossValue: document.getElementById('maxLossValue')
        };

        if (chartElements.pnlValue) {
            chartElements.pnlValue.textContent = `₹${currentPL.toFixed(2)} (${currentPL >= 0 ? '+' : ''}${(currentPL/totalMargin*100).toFixed(2)}%)`;
            chartElements.pnlValue.className = `fw-bold ${this.getBootstrapColorClass(currentPL)}`;
        }
        
        if (chartElements.marginValue) {
            chartElements.marginValue.innerHTML = `₹${totalMargin.toFixed(0)} <span class="text-muted">□</span>`;
        }
        
        if (chartElements.maxProfitValue) {
            chartElements.maxProfitValue.textContent = maxProfit === Infinity ? 'Unlimited' : `₹${maxProfit.toFixed(0)} (${(maxProfit/totalMargin*100).toFixed(1)}%)`;
            chartElements.maxProfitValue.className = `fw-bold ${this.getBootstrapColorClass(maxProfit)}`;
        }
        
        if (chartElements.maxLossValue) {
            chartElements.maxLossValue.textContent = maxLoss === -Infinity ? '(Unlimited)' : `₹${maxLoss.toFixed(0)}`;
            chartElements.maxLossValue.className = `fw-bold ${this.getBootstrapColorClass(maxLoss)}`;
        }
    }

    // Update position list
    updatePositionList(positions) {
        const positionList = document.getElementById('positionList');
        if (!positionList) return;

        if (positions.length === 0) {
            positionList.innerHTML = '<div class="text-center text-muted">No positions</div>';
            return;
        }

        const positionHTML = positions.map(pos => `
            <div class="position-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge ${pos.action.includes('Buy') ? 'bg-success' : 'bg-danger'}">
                            ${pos.action}
                        </span>
                        <span class="fw-bold">${pos.strike}</span>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">×${pos.count}</div>
                        <div class="text-muted small">₹${pos.premium.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `).join('');

        positionList.innerHTML = positionHTML;
    }

    // Helper to get color based on value
    getColor(val) {
        if (val < 0) return '#dc3545';
        if (val > 0) return '#28a745';
        return '#6c757d';
    }

    // Helper to get Bootstrap color class based on value
    getBootstrapColorClass(val) {
        if (val < 0) return 'text-danger';
        if (val > 0) return 'text-success';
        return 'text-muted';
    }

    // Update current spot price
    updateSpotPrice(spotPrice) {
        this.currentSpotPrice = spotPrice;
        this.updatePositionCard();
        this.updatePayoffChart();
    }

    // Clear all positions
    clearAllPositions() {
        this.counters = [];
        this.firstClickFlags = [];
        
        // Reset all button states
        document.querySelectorAll('.option_button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.count_badge').forEach(badge => {
            badge.textContent = '0';
            badge.style.display = 'none';
        });
        
        this.updatePositionCard();
        this.updatePayoffChart();
    }
}

// Global instance
window.positionManager = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.positionManager = new PositionManager();
});