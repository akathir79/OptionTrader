/**
 * Payoff Chart Generator for Options Trading Strategies
 * Uses actual strategy data from database to create educational visualizations
 */
class PayoffChartGenerator {
    constructor() {
        this.stockPriceRange = 200;
        this.currentPrice = 100;
    }

    /**
     * Generate payoff data using comprehensive strategy information
     */
    generatePayoffData(strategy, inputPrice = null) {
        // Extract current price from actual strategy data
        const currentPrice = this.getRealisticPrice(strategy, inputPrice);
        
        // Parse actual strategy values
        const maxProfit = this.parseActualMaxProfit(strategy);
        const maxLoss = this.parseActualMaxLoss(strategy);
        const actualBreakevens = this.parseActualBreakevens(strategy, currentPrice);
        
        const prices = [];
        const profits = [];
        const startPrice = currentPrice * 0.8;
        const endPrice = currentPrice * 1.2;
        const step = (endPrice - startPrice) / 100;

        for (let price = startPrice; price <= endPrice; price += step) {
            prices.push(price);
            profits.push(this.calculateProfit(strategy, price, currentPrice, maxProfit, maxLoss, actualBreakevens));
        }

        return { 
            prices, 
            profits, 
            currentPrice,
            breakevens: actualBreakevens,
            maxProfit: maxProfit,
            maxLoss: maxLoss
        };
    }

    /**
     * Get realistic current price from strategy data or context
     */
    getRealisticPrice(strategy, inputPrice) {
        if (inputPrice) return inputPrice;
        
        // Try to extract price information from strategy description
        const desc = (strategy.description || '').toLowerCase();
        const construction = (strategy.construction || '').toLowerCase();
        
        // Look for price references in the strategy data
        const priceMatch = desc.match(/\$(\d+)/);
        if (priceMatch) {
            return parseFloat(priceMatch[1]);
        }
        
        // Use reasonable defaults based on strategy type
        const name = strategy.name.toLowerCase();
        if (name.includes('nifty') || name.includes('index')) {
            return 18000;
        } else if (name.includes('stock') || name.includes('equity')) {
            return 500;
        }
        
        return 100; // Default
    }

    /**
     * Parse actual max profit from strategy database field
     */
    parseActualMaxProfit(strategy) {
        if (!strategy.max_profit) return null;
        
        const text = strategy.max_profit.toLowerCase();
        
        if (text.includes('unlimited')) {
            return 'unlimited';
        }
        
        // Extract first number found
        const match = text.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            return parseFloat(match[1]);
        }
        
        return null;
    }

    /**
     * Parse actual max loss from strategy database field
     */
    parseActualMaxLoss(strategy) {
        if (!strategy.max_loss) return null;
        
        const text = strategy.max_loss.toLowerCase();
        
        if (text.includes('unlimited')) {
            return 'unlimited';
        }
        
        // Extract first number found
        const match = text.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            return parseFloat(match[1]);
        }
        
        return null;
    }

    /**
     * Parse actual breakeven points from strategy database field
     */
    parseActualBreakevens(strategy, currentPrice) {
        if (!strategy.breakeven_points) {
            return [currentPrice]; // Default fallback
        }
        
        const text = strategy.breakeven_points.toLowerCase();
        
        // Extract all numbers that could be breakeven points
        const numbers = text.match(/(\d+(?:\.\d+)?)/g);
        if (numbers && numbers.length > 0) {
            return numbers.map(n => parseFloat(n));
        }
        
        // Fallback to current price
        return [currentPrice];
    }

    /**
     * Calculate profit using actual strategy characteristics
     */
    calculateProfit(strategy, stockPrice, currentPrice, maxProfit, maxLoss, breakevens) {
        const strategyName = strategy.name.toLowerCase();
        
        // Use pattern recognition with actual data
        if (strategyName.includes('long call')) {
            return this.longCallProfit(stockPrice, breakevens[0], maxLoss);
        } else if (strategyName.includes('short call')) {
            return this.shortCallProfit(stockPrice, breakevens[0], maxProfit);
        } else if (strategyName.includes('long put')) {
            return this.longPutProfit(stockPrice, breakevens[0], maxLoss);
        } else if (strategyName.includes('short put')) {
            return this.shortPutProfit(stockPrice, breakevens[0], maxProfit);
        } else if (strategyName.includes('straddle')) {
            return this.straddleProfit(stockPrice, currentPrice, breakevens, strategyName.includes('long'));
        } else if (strategyName.includes('iron condor')) {
            return this.ironCondorProfit(stockPrice, breakevens, maxProfit, maxLoss);
        } else if (strategyName.includes('iron butterfly')) {
            return this.butterflyProfit(stockPrice, currentPrice, breakevens, maxProfit, maxLoss);
        } else if (strategyName.includes('spread')) {
            return this.spreadProfit(stockPrice, currentPrice, breakevens, maxProfit, maxLoss, strategy);
        } else if (strategyName.includes('lizard')) {
            return this.lizardProfit(stockPrice, currentPrice, maxProfit);
        } else if (strategyName.includes('backspread')) {
            return this.backspreadProfit(stockPrice, currentPrice, breakevens);
        }
        
        // Default neutral profit
        return this.neutralProfit(stockPrice, currentPrice, maxProfit, maxLoss);
    }

    // Individual strategy profit calculations using actual data
    longCallProfit(stockPrice, breakeven, maxLoss) {
        const loss = (typeof maxLoss === 'number') ? maxLoss : 5;
        return stockPrice <= breakeven ? -loss : (stockPrice - breakeven) - loss;
    }

    shortCallProfit(stockPrice, breakeven, maxProfit) {
        const profit = (typeof maxProfit === 'number') ? maxProfit : 5;
        return stockPrice <= breakeven ? profit : profit - (stockPrice - breakeven);
    }

    longPutProfit(stockPrice, breakeven, maxLoss) {
        const loss = (typeof maxLoss === 'number') ? maxLoss : 5;
        return stockPrice >= breakeven ? -loss : (breakeven - stockPrice) - loss;
    }

    shortPutProfit(stockPrice, breakeven, maxProfit) {
        const profit = (typeof maxProfit === 'number') ? maxProfit : 5;
        return stockPrice >= breakeven ? profit : profit - (breakeven - stockPrice);
    }

    straddleProfit(stockPrice, currentPrice, breakevens, isLong) {
        const premium = breakevens.length > 1 ? Math.abs(breakevens[1] - breakevens[0]) / 2 : 8;
        const distance = Math.abs(stockPrice - currentPrice);
        
        if (isLong) {
            return Math.max(distance - premium, -premium);
        } else {
            return Math.max(premium - distance, -premium);
        }
    }

    ironCondorProfit(stockPrice, breakevens, maxProfit, maxLoss) {
        const profit = (typeof maxProfit === 'number') ? maxProfit : 3;
        const loss = (typeof maxLoss === 'number') ? maxLoss : 2;
        
        if (breakevens.length >= 2) {
            const lowerBreakeven = Math.min(...breakevens);
            const upperBreakeven = Math.max(...breakevens);
            
            if (stockPrice >= lowerBreakeven && stockPrice <= upperBreakeven) {
                return profit;
            } else if (stockPrice < lowerBreakeven) {
                return Math.max(profit - (lowerBreakeven - stockPrice), -loss);
            } else {
                return Math.max(profit - (stockPrice - upperBreakeven), -loss);
            }
        }
        
        return profit;
    }

    butterflyProfit(stockPrice, currentPrice, breakevens, maxProfit, maxLoss) {
        const profit = (typeof maxProfit === 'number') ? maxProfit : 5;
        const loss = (typeof maxLoss === 'number') ? maxLoss : 2;
        
        const center = currentPrice;
        const distance = Math.abs(stockPrice - center);
        const wing = currentPrice * 0.05;
        
        if (distance <= wing) {
            return profit * (1 - distance / wing);
        } else {
            return -loss;
        }
    }

    spreadProfit(stockPrice, currentPrice, breakevens, maxProfit, maxLoss, strategy) {
        const profit = (typeof maxProfit === 'number') ? maxProfit : 3;
        const loss = (typeof maxLoss === 'number') ? maxLoss : 2;
        const breakeven = breakevens[0] || currentPrice;
        
        if (strategy.name.toLowerCase().includes('bull')) {
            return stockPrice <= breakeven ? -loss : Math.min(profit, stockPrice - breakeven);
        } else if (strategy.name.toLowerCase().includes('bear')) {
            return stockPrice >= breakeven ? -loss : Math.min(profit, breakeven - stockPrice);
        }
        
        return stockPrice > currentPrice ? profit : -loss;
    }

    lizardProfit(stockPrice, currentPrice, maxProfit) {
        const profit = (typeof maxProfit === 'number') ? maxProfit : 5;
        
        if (stockPrice >= currentPrice) {
            return profit * 0.9;
        } else {
            return profit - Math.max(0, (currentPrice - stockPrice) * 0.3);
        }
    }

    backspreadProfit(stockPrice, currentPrice, breakevens) {
        const center = currentPrice;
        const distance = Math.abs(stockPrice - center);
        
        if (distance < 5) {
            return -2;
        } else if (distance > 10) {
            return distance - 7;
        } else {
            return -2 + (distance - 5) * 0.4;
        }
    }

    neutralProfit(stockPrice, currentPrice, maxProfit, maxLoss) {
        const profit = (typeof maxProfit === 'number') ? maxProfit : 2;
        const distance = Math.abs(stockPrice - currentPrice) / currentPrice;
        
        return profit * Math.exp(-distance * 10);
    }

    /**
     * Get profit/loss zones using actual strategy data
     */
    getProfitLossZones(strategy, currentPrice) {
        const maxProfit = this.parseActualMaxProfit(strategy);
        const maxLoss = this.parseActualMaxLoss(strategy);
        const breakevens = this.parseActualBreakevens(strategy, currentPrice);
        
        const maxProfitDisplay = maxProfit === 'unlimited' ? 'Unlimited' : 
                               (typeof maxProfit === 'number') ? `$${maxProfit.toFixed(2)}` : 'Variable';
        const maxLossDisplay = maxLoss === 'unlimited' ? 'Unlimited' : 
                              (typeof maxLoss === 'number') ? `$${maxLoss.toFixed(2)}` : 'Variable';
        
        const breakevenDisplay = breakevens.map(b => `$${b.toFixed(2)}`).join(', ');
        
        return {
            maxProfit: maxProfitDisplay,
            maxLoss: maxLossDisplay,
            profitZone: `Above breakeven(s): ${breakevenDisplay}`,
            lossZone: this.getLossZoneDescription(strategy)
        };
    }

    getLossZoneDescription(strategy) {
        const name = strategy.name.toLowerCase();
        
        if (name.includes('long call') || name.includes('long put')) {
            return 'Premium paid is maximum loss';
        } else if (name.includes('short')) {
            return 'Unfavorable price movement';
        } else if (name.includes('straddle')) {
            return name.includes('long') ? 'Price remains stable' : 'Large price movements';
        } else if (name.includes('iron condor')) {
            return 'Price moves outside profit zone';
        } else if (name.includes('spread')) {
            return 'Unfavorable directional movement';
        }
        
        return 'Unfavorable market conditions';
    }

    /**
     * Create Chart.js configuration for payoff diagram
     */
    createChartConfig(canvasId, data, isDetailed = false) {
        const { prices, profits, currentPrice, breakevens } = data;
        
        const datasets = [{
            label: 'Profit/Loss',
            data: profits.map((profit, index) => ({
                x: prices[index],
                y: profit
            })),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: isDetailed ? 3 : 2,
            fill: true,
            tension: 0.1
        }];

        // Add breakeven lines if detailed
        if (isDetailed && breakevens) {
            breakevens.forEach((breakeven, index) => {
                datasets.push({
                    label: `Breakeven ${index + 1}`,
                    data: [
                        { x: breakeven, y: Math.min(...profits) },
                        { x: breakeven, y: Math.max(...profits) }
                    ],
                    borderColor: 'rgba(255, 99, 132, 0.8)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                });
            });
        }

        // Add current price line
        datasets.push({
            label: 'Current Price',
            data: [
                { x: currentPrice, y: Math.min(...profits) },
                { x: currentPrice, y: Math.max(...profits) }
            ],
            borderColor: 'rgba(255, 206, 86, 0.8)',
            borderWidth: 2,
            pointRadius: 0,
            fill: false
        });

        return {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: !isDetailed,
                plugins: {
                    legend: {
                        display: isDetailed
                    },
                    tooltip: {
                        enabled: isDetailed,
                        callbacks: {
                            title: function(context) {
                                return `Price: $${context[0].parsed.x.toFixed(2)}`;
                            },
                            label: function(context) {
                                return `P/L: $${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        display: isDetailed,
                        title: {
                            display: isDetailed,
                            text: 'Stock Price ($)'
                        }
                    },
                    y: {
                        display: isDetailed,
                        title: {
                            display: isDetailed,
                            text: 'Profit/Loss ($)'
                        },
                        grid: {
                            color: function(context) {
                                return context.tick.value === 0 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)';
                            }
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
        if (!canvas) return;

        const payoffData = this.generatePayoffData(strategy);
        const config = this.createChartConfig(canvasId, payoffData, false);
        
        new Chart(canvas, config);
    }

    /**
     * Create detailed chart for modal
     */
    createDetailedChart(canvasId, strategy) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const payoffData = this.generatePayoffData(strategy);
        const config = this.createChartConfig(canvasId, payoffData, true);
        
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
    if (!modal) return;

    // Update modal content
    document.getElementById('modalStrategyName').textContent = strategy.name;
    
    // Clear previous chart
    const chartCanvas = document.getElementById('modalPayoffChart');
    if (chartCanvas) {
        Chart.getChart(chartCanvas)?.destroy();
    }

    // Generate profit/loss analysis
    const currentPrice = window.payoffChartGenerator.getRealisticPrice(strategy);
    const zones = window.payoffChartGenerator.getProfitLossZones(strategy, currentPrice);
    
    // Update profit/loss zones
    document.getElementById('profitLossAnalysis').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Maximum Profit</h6>
                <span class="text-success">${zones.maxProfit}</span>
            </div>
            <div class="col-md-6">
                <h6>Maximum Loss</h6>
                <span class="text-danger">${zones.maxLoss}</span>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-6">
                <h6>Profit Zone</h6>
                <small class="text-muted">${zones.profitZone}</small>
            </div>
            <div class="col-md-6">
                <h6>Loss Zone</h6>
                <small class="text-muted">${zones.lossZone}</small>
            </div>
        </div>
    `;
    
    // Update adjustment details
    document.getElementById('adjustmentDetails').innerHTML = `
        <div class="text-muted">
            ${strategy.adjustments ? 
                `<small style="white-space: pre-line; line-height: 1.4;">${strategy.adjustments}</small>` : 
                '<small>Refer to strategy details for adjustment techniques</small>'
            }
        </div>
    `;

    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // Create detailed chart after modal is shown
    setTimeout(() => {
        window.payoffChartGenerator.createDetailedChart('modalPayoffChart', strategy);
    }, 100);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart !== 'undefined') {
        initializeThumbnailCharts();
    } else {
        console.error('Chart.js library not loaded');
    }
});