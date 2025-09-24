/**
 * Options Strategy Payoff Diagram Generator
 * Creates interactive profit/loss charts for all option strategies
 */

class PayoffChartGenerator {
    constructor() {
        this.stockPriceRange = 200; // Range of stock prices to calculate
        this.currentPrice = 100; // Default current stock price
    }

    /**
     * Generate payoff data for different strategy types
     */
    generatePayoffData(strategy, currentPrice = 100) {
        const prices = [];
        const profits = [];
        const startPrice = currentPrice * 0.7;
        const endPrice = currentPrice * 1.3;
        const step = (endPrice - startPrice) / 100;

        for (let price = startPrice; price <= endPrice; price += step) {
            prices.push(price);
            profits.push(this.calculateProfit(strategy, price, currentPrice));
        }

        return { prices, profits, currentPrice };
    }

    /**
     * Calculate profit/loss for specific strategy at given stock price
     */
    calculateProfit(strategy, stockPrice, currentPrice) {
        const strategyName = strategy.name.toLowerCase();
        
        // Strategy-specific calculations
        if (strategyName.includes('long call')) {
            return this.longCallProfit(stockPrice, currentPrice, 5); // $5 premium
        } else if (strategyName.includes('short call')) {
            return this.shortCallProfit(stockPrice, currentPrice, 5);
        } else if (strategyName.includes('long put')) {
            return this.longPutProfit(stockPrice, currentPrice, 5);
        } else if (strategyName.includes('short put')) {
            return this.shortPutProfit(stockPrice, currentPrice, 5);
        } else if (strategyName.includes('bull call spread')) {
            return this.bullCallSpreadProfit(stockPrice, currentPrice, 3, 2);
        } else if (strategyName.includes('bear put spread')) {
            return this.bearPutSpreadProfit(stockPrice, currentPrice, 3, 2);
        } else if (strategyName.includes('long straddle')) {
            return this.longStraddleProfit(stockPrice, currentPrice, 8);
        } else if (strategyName.includes('short straddle')) {
            return this.shortStraddleProfit(stockPrice, currentPrice, 8);
        } else if (strategyName.includes('iron condor')) {
            return this.ironCondorProfit(stockPrice, currentPrice, 2);
        } else if (strategyName.includes('iron butterfly')) {
            return this.ironButterflyProfit(stockPrice, currentPrice, 4);
        } else if (strategyName.includes('protective put')) {
            return this.protectivePutProfit(stockPrice, currentPrice, 5);
        } else if (strategyName.includes('covered call')) {
            return this.coveredCallProfit(stockPrice, currentPrice, 5);
        } else if (strategyName.includes('collar')) {
            return this.collarProfit(stockPrice, currentPrice, 3, 2);
        } else if (strategyName.includes('jade lizard')) {
            return this.jadeLizardProfit(stockPrice, currentPrice, 3.5);
        } else if (strategyName.includes('big lizard')) {
            return this.bigLizardProfit(stockPrice, currentPrice, 16.95);
        } else if (strategyName.includes('reverse iron condor')) {
            return this.reverseIronCondorProfit(stockPrice, currentPrice, 3);
        } else if (strategyName.includes('call ratio backspread')) {
            return this.callRatioBackspreadProfit(stockPrice, currentPrice, 0);
        } else if (strategyName.includes('put ratio backspread')) {
            return this.putRatioBackspreadProfit(stockPrice, currentPrice, 2);
        } else if (strategyName.includes('broken wing butterfly')) {
            return this.brokenWingButterflyProfit(stockPrice, currentPrice, 1);
        } else if (strategyName.includes('christmas tree')) {
            return this.christmasTreeProfit(stockPrice, currentPrice, 2);
        } else if (strategyName.includes('diagonal')) {
            return this.diagonalSpreadProfit(stockPrice, currentPrice, 3);
        }
        
        // Default neutral strategy
        return 0;
    }

    // Individual strategy profit calculations
    longCallProfit(stockPrice, strike, premium) {
        return Math.max(stockPrice - strike, 0) - premium;
    }

    shortCallProfit(stockPrice, strike, premium) {
        return premium - Math.max(stockPrice - strike, 0);
    }

    longPutProfit(stockPrice, strike, premium) {
        return Math.max(strike - stockPrice, 0) - premium;
    }

    shortPutProfit(stockPrice, strike, premium) {
        return premium - Math.max(strike - stockPrice, 0);
    }

    bullCallSpreadProfit(stockPrice, currentPrice, netDebit, strikeSpacing) {
        const longStrike = currentPrice;
        const shortStrike = currentPrice + strikeSpacing;
        return Math.min(Math.max(stockPrice - longStrike, 0) - Math.max(stockPrice - shortStrike, 0), strikeSpacing) - netDebit;
    }

    bearPutSpreadProfit(stockPrice, currentPrice, netDebit, strikeSpacing) {
        const shortStrike = currentPrice;
        const longStrike = currentPrice - strikeSpacing;
        return Math.min(Math.max(longStrike - stockPrice, 0) - Math.max(shortStrike - stockPrice, 0), strikeSpacing) - netDebit;
    }

    longStraddleProfit(stockPrice, strike, premium) {
        return Math.max(stockPrice - strike, 0) + Math.max(strike - stockPrice, 0) - premium;
    }

    shortStraddleProfit(stockPrice, strike, premium) {
        return premium - (Math.max(stockPrice - strike, 0) + Math.max(strike - stockPrice, 0));
    }

    ironCondorProfit(stockPrice, currentPrice, credit) {
        const putStrike1 = currentPrice - 10;
        const putStrike2 = currentPrice - 5;
        const callStrike1 = currentPrice + 5;
        const callStrike2 = currentPrice + 10;
        
        if (stockPrice >= putStrike2 && stockPrice <= callStrike1) {
            return credit;
        } else if (stockPrice < putStrike2) {
            return credit - Math.max(putStrike2 - stockPrice, 0);
        } else {
            return credit - Math.max(stockPrice - callStrike1, 0);
        }
    }

    ironButterflyProfit(stockPrice, currentPrice, credit) {
        const wingSpread = 10;
        if (Math.abs(stockPrice - currentPrice) <= 2) {
            return credit;
        } else {
            return credit - Math.min(Math.abs(stockPrice - currentPrice), wingSpread);
        }
    }

    protectivePutProfit(stockPrice, currentPrice, putPremium) {
        const putStrike = currentPrice * 0.95;
        return (stockPrice - currentPrice) + Math.max(putStrike - stockPrice, 0) - putPremium;
    }

    coveredCallProfit(stockPrice, currentPrice, callPremium) {
        const callStrike = currentPrice * 1.05;
        return (stockPrice - currentPrice) + callPremium - Math.max(stockPrice - callStrike, 0);
    }

    collarProfit(stockPrice, currentPrice, putPremium, callCredit) {
        const putStrike = currentPrice * 0.95;
        const callStrike = currentPrice * 1.05;
        return (stockPrice - currentPrice) + Math.max(putStrike - stockPrice, 0) - putPremium + callCredit - Math.max(stockPrice - callStrike, 0);
    }

    jadeLizardProfit(stockPrice, currentPrice, credit) {
        const putStrike = currentPrice - 5;
        const shortCallStrike = currentPrice + 2;
        const longCallStrike = currentPrice + 7;
        
        let profit = credit;
        
        // Short put loss
        if (stockPrice < putStrike) {
            profit -= (putStrike - stockPrice);
        }
        
        // Call spread
        if (stockPrice > shortCallStrike) {
            profit -= Math.max(stockPrice - shortCallStrike, 0);
            profit += Math.max(stockPrice - longCallStrike, 0);
        }
        
        return profit;
    }

    bigLizardProfit(stockPrice, currentPrice, credit) {
        const strike = currentPrice;
        const longCallStrike = currentPrice + 17;
        
        let profit = credit;
        profit -= Math.max(strike - stockPrice, 0); // Short put
        profit -= Math.max(stockPrice - strike, 0); // Short call
        profit += Math.max(stockPrice - longCallStrike, 0); // Long call
        
        return profit;
    }

    reverseIronCondorProfit(stockPrice, currentPrice, debit) {
        const innerLow = currentPrice - 5;
        const outerLow = currentPrice - 10;
        const innerHigh = currentPrice + 5;
        const outerHigh = currentPrice + 10;
        
        let profit = -debit;
        
        if (stockPrice <= outerLow || stockPrice >= outerHigh) {
            profit += 5; // Max profit at wings
        } else if (stockPrice > innerLow && stockPrice < innerHigh) {
            profit = -debit; // Max loss in middle
        } else {
            // Transition zones
            if (stockPrice < innerLow) {
                profit += (innerLow - stockPrice);
            } else {
                profit += (stockPrice - innerHigh);
            }
        }
        
        return profit;
    }

    callRatioBackspreadProfit(stockPrice, currentPrice, credit) {
        const shortStrike = currentPrice;
        const longStrike = currentPrice + 5;
        
        let profit = credit;
        profit -= Math.max(stockPrice - shortStrike, 0); // Short call
        profit += 2 * Math.max(stockPrice - longStrike, 0); // 2 long calls
        
        return profit;
    }

    putRatioBackspreadProfit(stockPrice, currentPrice, credit) {
        const shortStrike = currentPrice;
        const longStrike = currentPrice - 10;
        
        let profit = credit;
        profit -= Math.max(shortStrike - stockPrice, 0); // Short put
        profit += 2 * Math.max(longStrike - stockPrice, 0); // 2 long puts
        
        return profit;
    }

    brokenWingButterflyProfit(stockPrice, currentPrice, debit) {
        const longStrike1 = currentPrice + 5;
        const shortStrike = currentPrice;
        const longStrike2 = currentPrice - 5;
        
        let profit = -debit;
        profit += Math.max(longStrike1 - stockPrice, 0);
        profit -= 2 * Math.max(shortStrike - stockPrice, 0);
        profit += Math.max(longStrike2 - stockPrice, 0);
        
        return profit;
    }

    christmasTreeProfit(stockPrice, currentPrice, debit) {
        // Simplified Christmas tree calculation
        const strikes = [currentPrice - 5, currentPrice, currentPrice + 5, currentPrice + 10];
        let profit = -debit;
        
        if (stockPrice >= strikes[1] && stockPrice <= strikes[2]) {
            profit += 3;
        } else if (stockPrice < strikes[0] || stockPrice > strikes[3]) {
            profit -= 2;
        }
        
        return profit;
    }

    diagonalSpreadProfit(stockPrice, currentPrice, debit) {
        // Simplified diagonal spread
        const longStrike = currentPrice + 5;
        const shortStrike = currentPrice;
        
        return Math.max(stockPrice - longStrike, 0) - Math.max(stockPrice - shortStrike, 0) * 0.7 - debit;
    }

    /**
     * Calculate breakeven points for strategy
     */
    getBreakevenPoints(strategy, currentPrice) {
        const strategyName = strategy.name.toLowerCase();
        const breakevens = [];
        
        if (strategyName.includes('long call')) {
            breakevens.push(currentPrice + 5); // Strike + premium
        } else if (strategyName.includes('long put')) {
            breakevens.push(currentPrice - 5); // Strike - premium
        } else if (strategyName.includes('straddle')) {
            breakevens.push(currentPrice - 8, currentPrice + 8); // Strike ± premium
        } else if (strategyName.includes('iron condor')) {
            breakevens.push(currentPrice - 3, currentPrice + 3); // Inner strikes ± credit
        } else if (strategyName.includes('jade lizard')) {
            breakevens.push(currentPrice - 8.5); // Put strike - credit
        }
        // Add more breakeven calculations as needed
        
        return breakevens;
    }

    /**
     * Get profit/loss zones for strategy
     */
    getProfitLossZones(strategy, currentPrice) {
        const strategyName = strategy.name.toLowerCase();
        
        if (strategyName.includes('long call')) {
            return {
                maxProfit: 'Unlimited',
                maxLoss: '$5.00',
                profitZone: `Above $${currentPrice + 5}`,
                lossZone: `Below $${currentPrice + 5}`
            };
        } else if (strategyName.includes('short call')) {
            return {
                maxProfit: '$5.00',
                maxLoss: 'Unlimited',
                profitZone: `Below $${currentPrice + 5}`,
                lossZone: `Above $${currentPrice + 5}`
            };
        } else if (strategyName.includes('iron condor')) {
            return {
                maxProfit: '$2.00',
                maxLoss: '$3.00',
                profitZone: `$${currentPrice - 5} to $${currentPrice + 5}`,
                lossZone: `Outside profit zone`
            };
        }
        
        // Default zones
        return {
            maxProfit: 'Variable',
            maxLoss: 'Variable',
            profitZone: 'See chart',
            lossZone: 'See chart'
        };
    }

    /**
     * Create Chart.js configuration for payoff diagram
     */
    createChartConfig(strategy, payoffData, isDetailed = false) {
        const breakevens = this.getBreakevenPoints(strategy, payoffData.currentPrice);
        const zones = this.getProfitLossZones(strategy, payoffData.currentPrice);
        
        return {
            type: 'line',
            data: {
                labels: payoffData.prices.map(p => p.toFixed(0)),
                datasets: [{
                    label: 'Profit/Loss',
                    data: payoffData.profits,
                    borderColor: '#3b82f6',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)'); // Green for profit
                        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)'); // Blue middle
                        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)'); // Red for loss
                        return gradient;
                    },
                    fill: true,
                    tension: 0.2,
                    pointRadius: isDetailed ? 2 : 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: isDetailed
                    },
                    title: {
                        display: isDetailed,
                        text: `${strategy.name} - Payoff Diagram`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        enabled: isDetailed,
                        callbacks: {
                            label: function(context) {
                                const price = payoffData.prices[context.dataIndex];
                                const profit = context.parsed.y;
                                return `Price: $${price.toFixed(2)}, P&L: $${profit.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: isDetailed,
                        title: {
                            display: isDetailed,
                            text: 'Stock Price ($)'
                        },
                        grid: {
                            display: isDetailed
                        }
                    },
                    y: {
                        display: isDetailed,
                        title: {
                            display: isDetailed,
                            text: 'Profit/Loss ($)'
                        },
                        grid: {
                            display: isDetailed
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        };
    }

    /**
     * Create thumbnail chart for strategy card
     */
    createThumbnailChart(canvasId, strategy) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        const payoffData = this.generatePayoffData(strategy, 100);
        const config = this.createChartConfig(strategy, payoffData, false);
        
        return new Chart(canvas, config);
    }

    /**
     * Create detailed chart for modal
     */
    createDetailedChart(canvasId, strategy) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        const payoffData = this.generatePayoffData(strategy, 100);
        const config = this.createChartConfig(strategy, payoffData, true);
        
        return new Chart(canvas, config);
    }
}

// Global instance
window.payoffChartGenerator = new PayoffChartGenerator();

/**
 * Initialize thumbnail charts for all strategies
 */
function initializeThumbnailCharts() {
    document.querySelectorAll('.payoff-thumbnail').forEach(canvas => {
        const strategyData = JSON.parse(canvas.dataset.strategy);
        window.payoffChartGenerator.createThumbnailChart(canvas.id, strategyData);
    });
}

/**
 * Show detailed payoff modal
 */
function showPayoffModal(strategy) {
    const modal = document.getElementById('payoffModal');
    const modalTitle = document.getElementById('modalStrategyTitle');
    const modalBody = document.getElementById('payoffModalBody');
    
    modalTitle.textContent = `${strategy.name} - Payoff Analysis`;
    
    // Create detailed chart canvas
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-12">
                <div style="height: 400px; position: relative;">
                    <canvas id="detailedPayoffChart"></canvas>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-6">
                <h6 class="text-primary">Profit/Loss Analysis</h6>
                <div id="profitLossDetails"></div>
            </div>
            <div class="col-md-6">
                <h6 class="text-success">Breakeven Points</h6>
                <div id="breakevenDetails"></div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <h6 class="text-warning">Key Adjustment Points</h6>
                <div id="adjustmentDetails"></div>
            </div>
        </div>
    `;
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Create detailed chart after modal is shown
    setTimeout(() => {
        const chart = window.payoffChartGenerator.createDetailedChart('detailedPayoffChart', strategy);
        const payoffData = window.payoffChartGenerator.generatePayoffData(strategy, 100);
        const breakevens = window.payoffChartGenerator.getBreakevenPoints(strategy, 100);
        const zones = window.payoffChartGenerator.getProfitLossZones(strategy, 100);
        
        // Populate details
        document.getElementById('profitLossDetails').innerHTML = `
            <small class="text-muted">
                <strong>Max Profit:</strong> ${zones.maxProfit}<br>
                <strong>Max Loss:</strong> ${zones.maxLoss}<br>
                <strong>Profit Zone:</strong> ${zones.profitZone}<br>
                <strong>Loss Zone:</strong> ${zones.lossZone}
            </small>
        `;
        
        document.getElementById('breakevenDetails').innerHTML = `
            <small class="text-muted">
                ${breakevens.length > 0 ? 
                    breakevens.map(point => `<span class="badge bg-info me-1">$${point.toFixed(2)}</span>`).join('') : 
                    '<span class="text-muted">See chart for details</span>'
                }
            </small>
        `;
        
        document.getElementById('adjustmentDetails').innerHTML = `
            <small class="text-muted">
                ${strategy.adjustments ? strategy.adjustments.substring(0, 200) + '...' : 'Refer to strategy details for adjustment techniques'}
            </small>
        `;
    }, 100);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart !== 'undefined') {
        initializeThumbnailCharts();
    } else {
        console.error('Chart.js not loaded. Please include Chart.js library.');
    }
});