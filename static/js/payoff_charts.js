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
     * Generate payoff data using actual strategy information
     */
    generatePayoffData(strategy, currentPrice = 100) {
        const prices = [];
        const profits = [];
        const startPrice = currentPrice * 0.7;
        const endPrice = currentPrice * 1.3;
        const step = (endPrice - startPrice) / 100;

        // Extract real breakeven points from strategy data
        const breakevens = this.parseBreakevenPoints(strategy);
        const maxProfit = this.parseMaxProfit(strategy);
        const maxLoss = this.parseMaxLoss(strategy);

        for (let price = startPrice; price <= endPrice; price += step) {
            prices.push(price);
            profits.push(this.calculateEducationalProfit(strategy, price, currentPrice, breakevens, maxProfit, maxLoss));
        }

        return { prices, profits, currentPrice, breakevens, maxProfit, maxLoss };
    }

    /**
     * Parse breakeven points from strategy data
     */
    parseBreakevenPoints(strategy) {
        if (!strategy.breakeven_points) return [100]; // Default
        
        const text = strategy.breakeven_points.toLowerCase();
        const numbers = text.match(/\$?(\d+(?:\.\d+)?)/g);
        
        if (numbers) {
            return numbers.map(n => parseFloat(n.replace('$', '')));
        }
        
        return [100]; // Default fallback
    }

    /**
     * Parse maximum profit from strategy data
     */
    parseMaxProfit(strategy) {
        if (!strategy.max_profit) return 'Variable';
        
        const text = strategy.max_profit.toLowerCase();
        if (text.includes('unlimited')) return 'Unlimited';
        
        const match = text.match(/\$?(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 'Variable';
    }

    /**
     * Parse maximum loss from strategy data
     */
    parseMaxLoss(strategy) {
        if (!strategy.max_loss) return 'Variable';
        
        const text = strategy.max_loss.toLowerCase();
        if (text.includes('unlimited')) return 'Unlimited';
        
        const match = text.match(/\$?(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 'Variable';
    }

    /**
     * Calculate educational profit/loss curve based on strategy type and real data
     */
    calculateEducationalProfit(strategy, stockPrice, currentPrice, breakevens, maxProfit, maxLoss) {
        const strategyName = strategy.name.toLowerCase();
        
        // Create educational curves based on strategy patterns
        if (strategyName.includes('long call')) {
            return this.createLongCallCurve(stockPrice, breakevens[0], maxLoss);
        } else if (strategyName.includes('short call')) {
            return this.createShortCallCurve(stockPrice, breakevens[0], maxProfit);
        } else if (strategyName.includes('long put')) {
            return this.createLongPutCurve(stockPrice, breakevens[0], maxLoss);
        } else if (strategyName.includes('short put')) {
            return this.createShortPutCurve(stockPrice, breakevens[0], maxProfit);
        } else if (strategyName.includes('straddle')) {
            return this.createStraddleCurve(stockPrice, currentPrice, breakevens, strategyName.includes('long'));
        } else if (strategyName.includes('iron condor') || strategyName.includes('condor')) {
            return this.createCondorCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss);
        } else if (strategyName.includes('iron butterfly') || strategyName.includes('butterfly')) {
            return this.createButterflyCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss);
        } else if (strategyName.includes('spread')) {
            return this.createSpreadCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss, strategy);
        } else if (strategyName.includes('lizard')) {
            return this.createLizardCurve(stockPrice, currentPrice, maxProfit, maxLoss);
        } else if (strategyName.includes('backspread')) {
            return this.createBackspreadCurve(stockPrice, currentPrice, breakevens, maxProfit);
        }
        
        // Default educational curve
        return this.createNeutralCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss);
    }

    // Educational curve generators using real strategy data
    createLongCallCurve(stockPrice, breakeven, maxLoss) {
        const loss = typeof maxLoss === 'number' ? maxLoss : 5;
        if (stockPrice <= breakeven) {
            return -loss;
        } else {
            return (stockPrice - breakeven) - loss;
        }
    }

    createShortCallCurve(stockPrice, breakeven, maxProfit) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 5;
        if (stockPrice <= breakeven) {
            return profit;
        } else {
            return profit - (stockPrice - breakeven);
        }
    }

    createLongPutCurve(stockPrice, breakeven, maxLoss) {
        const loss = typeof maxLoss === 'number' ? maxLoss : 5;
        if (stockPrice >= breakeven) {
            return -loss;
        } else {
            return (breakeven - stockPrice) - loss;
        }
    }

    createShortPutCurve(stockPrice, breakeven, maxProfit) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 5;
        if (stockPrice >= breakeven) {
            return profit;
        } else {
            return profit - (breakeven - stockPrice);
        }
    }

    createStraddleCurve(stockPrice, currentPrice, breakevens, isLong) {
        const center = currentPrice;
        const premium = breakevens.length > 1 ? Math.abs(breakevens[1] - breakevens[0]) / 2 : 8;
        const distance = Math.abs(stockPrice - center);
        
        if (isLong) {
            return Math.max(distance - premium, -premium);
        } else {
            return Math.max(premium - distance, -premium);
        }
    }

    createCondorCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 3;
        const loss = typeof maxLoss === 'number' ? maxLoss : 2;
        
        if (breakevens.length >= 2) {
            const lowerBreakeven = Math.min(...breakevens);
            const upperBreakeven = Math.max(...breakevens);
            
            if (stockPrice >= lowerBreakeven && stockPrice <= upperBreakeven) {
                return profit;
            } else if (stockPrice < lowerBreakeven) {
                return profit - (lowerBreakeven - stockPrice);
            } else {
                return profit - (stockPrice - upperBreakeven);
            }
        }
        
        // Default condor shape
        const range = currentPrice * 0.1;
        if (Math.abs(stockPrice - currentPrice) <= range) {
            return profit;
        } else {
            return -loss;
        }
    }

    createButterflyCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 5;
        const loss = typeof maxLoss === 'number' ? maxLoss : 2;
        
        const center = currentPrice;
        const distance = Math.abs(stockPrice - center);
        const wing = currentPrice * 0.05; // 5% wing
        
        if (distance <= wing) {
            return profit * (1 - distance / wing);
        } else {
            return -loss;
        }
    }

    createSpreadCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss, strategy) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 3;
        const loss = typeof maxLoss === 'number' ? maxLoss : 2;
        
        if (strategy.name.toLowerCase().includes('bull')) {
            // Bull spread
            const breakeven = breakevens[0] || currentPrice;
            if (stockPrice <= breakeven) {
                return -loss;
            } else {
                return Math.min(profit, (stockPrice - breakeven));
            }
        } else if (strategy.name.toLowerCase().includes('bear')) {
            // Bear spread
            const breakeven = breakevens[0] || currentPrice;
            if (stockPrice >= breakeven) {
                return -loss;
            } else {
                return Math.min(profit, (breakeven - stockPrice));
            }
        }
        
        // Default spread
        return stockPrice > currentPrice ? profit : -loss;
    }

    createLizardCurve(stockPrice, currentPrice, maxProfit, maxLoss) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 5;
        
        // Jade Lizard pattern: no upside risk
        if (stockPrice >= currentPrice) {
            return profit;
        } else {
            // Downside risk
            return profit - Math.max(0, (currentPrice - stockPrice) * 0.5);
        }
    }

    createBackspreadCurve(stockPrice, currentPrice, breakevens, maxProfit) {
        const center = currentPrice;
        const distance = Math.abs(stockPrice - center);
        
        if (distance < 5) {
            return -2; // Loss zone between strikes
        } else if (distance > 10) {
            return distance - 7; // Unlimited profit zone
        } else {
            return -2 + (distance - 5) * 0.4; // Transition
        }
    }

    createNeutralCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 2;
        const loss = typeof maxLoss === 'number' ? maxLoss : 1;
        
        const distance = Math.abs(stockPrice - currentPrice);
        
        if (distance <= currentPrice * 0.05) {
            return profit;
        } else {
            return profit - (distance / currentPrice) * 10;
        }
    }

    /**
     * Calculate breakeven points for strategy using actual data
     */
    getBreakevenPoints(strategy, currentPrice) {
        // Use actual parsed breakeven points from strategy data
        return this.parseBreakevenPoints(strategy);
    }

    /**
     * Get profit/loss zones for strategy
     */
    getProfitLossZones(strategy, currentPrice) {
        // Use strategy's actual max_profit and max_loss if available
        const maxProfit = strategy.max_profit || 'Variable';
        const maxLoss = strategy.max_loss || 'Variable';
        const breakevens = strategy.breakeven_points || 'See chart for details';
        
        const strategyName = strategy.name.toLowerCase();
        
        if (strategyName.includes('long call')) {
            return {
                maxProfit: maxProfit,
                maxLoss: maxLoss,
                profitZone: `Above breakeven: ${breakevens}`,
                lossZone: `Below breakeven: ${breakevens}`
            };
        } else if (strategyName.includes('short call')) {
            return {
                maxProfit: maxProfit,
                maxLoss: maxLoss,
                profitZone: `Below breakeven: ${breakevens}`,
                lossZone: `Above breakeven: ${breakevens}`
            };
        } else if (strategyName.includes('iron condor') || strategyName.includes('iron butterfly')) {
            return {
                maxProfit: maxProfit,
                maxLoss: maxLoss,
                profitZone: strategy.market_condition || 'Range-bound movement',
                lossZone: 'Outside profit zone'
            };
        } else if (strategyName.includes('jade lizard')) {
            return {
                maxProfit: maxProfit,
                maxLoss: maxLoss,
                profitZone: 'Between put strike and call spread',
                lossZone: 'Below put strike (unlimited downside)'
            };
        } else if (strategyName.includes('backspread')) {
            return {
                maxProfit: maxProfit,
                maxLoss: maxLoss,
                profitZone: 'Large directional moves',
                lossZone: 'Between strike prices'
            };
        }
        
        // Use strategy's actual data
        return {
            maxProfit: maxProfit,
            maxLoss: maxLoss,
            profitZone: strategy.market_condition || 'See strategy details',
            lossZone: 'Unfavorable market conditions'
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
    // Get strategies data from JSON script
    const strategiesDataElement = document.getElementById('strategiesData');
    if (!strategiesDataElement) {
        console.error('Strategies data not found');
        return;
    }
    
    let strategiesData;
    try {
        strategiesData = JSON.parse(strategiesDataElement.textContent);
    } catch (e) {
        console.error('Failed to parse strategies data:', e);
        return;
    }
    
    document.querySelectorAll('.payoff-thumbnail').forEach((canvas, index) => {
        // Get full strategy data by index
        const strategyData = strategiesData[index];
        if (!strategyData) {
            console.warn(`No strategy data for canvas ${index}`);
            return;
        }
        
        // Create thumbnail chart
        window.payoffChartGenerator.createThumbnailChart(canvas.id, strategyData);
        
        // Add click event listener
        canvas.addEventListener('click', function() {
            showPayoffModal(strategyData);
        });
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
            <div class="text-muted">
                ${strategy.adjustments ? 
                    `<small style="white-space: pre-line; line-height: 1.4;">${strategy.adjustments}</small>` : 
                    '<small>Refer to strategy details for adjustment techniques</small>'
                }
            </div>
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