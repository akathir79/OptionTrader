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
     * Generate payoff data using extracted strategy information
     */
    generatePayoffData(strategy, inputPrice = null) {
        // Extract comprehensive strategy data
        const strategyData = this.extractStrategyData(strategy);
        const currentPrice = inputPrice || strategyData.currentPrice;
        
        const prices = [];
        const profits = [];
        const startPrice = currentPrice * 0.8;
        const endPrice = currentPrice * 1.2;
        const step = (endPrice - startPrice) / 100;

        for (let price = startPrice; price <= endPrice; price += step) {
            prices.push(price);
            profits.push(this.calculateEducationalProfit(strategy, price, strategyData));
        }

        return { 
            prices, 
            profits, 
            currentPrice,
            breakevens: strategyData.breakevens,
            maxProfit: strategyData.maxProfit,
            maxLoss: strategyData.maxLoss,
            maxProfitType: strategyData.maxProfitType,
            maxLossType: strategyData.maxLossType
        };
    }

    /**
     * Extract educational data from strategy for meaningful charts
     */
    extractStrategyData(strategy) {
        const strategyName = strategy.name.toLowerCase();
        
        // Create realistic current prices based on strategy type
        let currentPrice = 100; // Default
        if (strategyName.includes('nifty') || strategyName.includes('index')) {
            currentPrice = 18000; // Nifty level
        } else if (strategyName.includes('stock') || strategyName.includes('equity')) {
            currentPrice = 500; // Stock level
        }
        
        // Extract profit/loss information from strategy descriptions
        const maxProfitInfo = this.extractProfitLossInfo(strategy.max_profit, strategy.description);
        const maxLossInfo = this.extractProfitLossInfo(strategy.max_loss, strategy.description);
        
        // Create educational breakeven points based on strategy characteristics
        const breakevens = this.generateEducationalBreakevens(strategy, currentPrice);
        
        return {
            currentPrice,
            maxProfit: maxProfitInfo.value,
            maxProfitType: maxProfitInfo.type, // 'limited', 'unlimited', 'variable'
            maxLoss: maxLossInfo.value,
            maxLossType: maxLossInfo.type,
            breakevens,
            strategyPattern: this.getStrategyPattern(strategyName)
        };
    }

    /**
     * Extract profit/loss information with intelligent parsing
     */
    extractProfitLossInfo(text, description) {
        if (!text) return { value: null, type: 'variable' };
        
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('unlimited')) {
            return { value: null, type: 'unlimited' };
        }
        
        // Try to extract numeric values
        const match = lowerText.match(/\$?(\d+(?:\.\d+)?)/);
        if (match) {
            return { value: parseFloat(match[1]), type: 'limited' };
        }
        
        // Check description for context clues
        if (description) {
            const descLower = description.toLowerCase();
            if (descLower.includes('premium received') || descLower.includes('credit')) {
                return { value: 5, type: 'limited' }; // Educational default
            }
            if (descLower.includes('premium paid') || descLower.includes('debit')) {
                return { value: 3, type: 'limited' }; // Educational default
            }
        }
        
        return { value: null, type: 'variable' };
    }

    /**
     * Generate educational breakeven points based on strategy type
     */
    generateEducationalBreakevens(strategy, currentPrice) {
        const strategyName = strategy.name.toLowerCase();
        
        if (strategyName.includes('long call')) {
            return [currentPrice + 5]; // Strike + premium
        } else if (strategyName.includes('long put')) {
            return [currentPrice - 5]; // Strike - premium
        } else if (strategyName.includes('straddle')) {
            return [currentPrice - 8, currentPrice + 8]; // ATM ± total premium
        } else if (strategyName.includes('iron condor')) {
            return [currentPrice - 15, currentPrice + 15]; // Wing breakevens
        } else if (strategyName.includes('iron butterfly')) {
            return [currentPrice - 10, currentPrice + 10]; // Wing breakevens
        } else if (strategyName.includes('bull call spread')) {
            return [currentPrice + 3]; // Lower strike + net debit
        } else if (strategyName.includes('bear put spread')) {
            return [currentPrice - 3]; // Higher strike - net debit
        } else if (strategyName.includes('jade lizard')) {
            return [currentPrice - 12]; // Put strike - credit
        } else if (strategyName.includes('backspread')) {
            return [currentPrice - 8, currentPrice + 8]; // Multiple breakevens
        }
        
        // Default breakeven at current price
        return [currentPrice];
    }

    /**
     * Determine strategy pattern for curve generation
     */
    getStrategyPattern(strategyName) {
        if (strategyName.includes('long call') || strategyName.includes('long put')) {
            return 'long_option';
        } else if (strategyName.includes('short call') || strategyName.includes('short put')) {
            return 'short_option';
        } else if (strategyName.includes('straddle') || strategyName.includes('strangle')) {
            return 'volatility';
        } else if (strategyName.includes('iron condor') || strategyName.includes('condor')) {
            return 'iron_condor';
        } else if (strategyName.includes('iron butterfly') || strategyName.includes('butterfly')) {
            return 'butterfly';
        } else if (strategyName.includes('spread')) {
            return 'spread';
        } else if (strategyName.includes('lizard')) {
            return 'lizard';
        } else if (strategyName.includes('backspread')) {
            return 'backspread';
        }
        
        return 'neutral';
    }

    /**
     * Calculate educational profit/loss using comprehensive strategy data
     */
    calculateEducationalProfit(strategy, stockPrice, strategyData) {
        const { currentPrice, maxProfit, maxLoss, breakevens, strategyPattern } = strategyData;
        
        switch (strategyPattern) {
            case 'long_option':
                return this.createLongOptionCurve(stockPrice, breakevens[0], maxLoss, strategy.name.includes('call'));
            
            case 'short_option':
                return this.createShortOptionCurve(stockPrice, breakevens[0], maxProfit, strategy.name.includes('call'));
            
            case 'volatility':
                return this.createVolatilityCurve(stockPrice, currentPrice, breakevens, strategy.name.includes('long'));
            
            case 'iron_condor':
                return this.createIronCondorCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss);
            
            case 'butterfly':
                return this.createButterflyPattern(stockPrice, currentPrice, breakevens, maxProfit, maxLoss);
            
            case 'spread':
                return this.createSpreadPattern(stockPrice, currentPrice, breakevens, maxProfit, maxLoss, strategy);
            
            case 'lizard':
                return this.createLizardPattern(stockPrice, currentPrice, maxProfit);
            
            case 'backspread':
                return this.createBackspreadPattern(stockPrice, currentPrice, breakevens);
            
            default:
                return this.createNeutralPattern(stockPrice, currentPrice, maxProfit, maxLoss);
        }
    }

    // New educational curve generators using pattern-based approach
    createLongOptionCurve(stockPrice, breakeven, maxLoss, isCall) {
        const loss = typeof maxLoss === 'number' ? maxLoss : 5;
        
        if (isCall) {
            // Long call: Loss until breakeven, then profit
            return stockPrice <= breakeven ? -loss : (stockPrice - breakeven) - loss;
        } else {
            // Long put: Loss until breakeven, then profit
            return stockPrice >= breakeven ? -loss : (breakeven - stockPrice) - loss;
        }
    }

    createShortOptionCurve(stockPrice, breakeven, maxProfit, isCall) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 5;
        
        if (isCall) {
            // Short call: Profit until breakeven, then loss
            return stockPrice <= breakeven ? profit : profit - (stockPrice - breakeven);
        } else {
            // Short put: Profit until breakeven, then loss
            return stockPrice >= breakeven ? profit : profit - (breakeven - stockPrice);
        }
    }

    createVolatilityCurve(stockPrice, currentPrice, breakevens, isLong) {
        const premium = breakevens.length > 1 ? Math.abs(breakevens[1] - breakevens[0]) / 2 : 8;
        const distance = Math.abs(stockPrice - currentPrice);
        
        if (isLong) {
            // Long straddle/strangle: Loss in middle, profit on wings
            return Math.max(distance - premium, -premium);
        } else {
            // Short straddle/strangle: Profit in middle, loss on wings
            return Math.max(premium - distance, -premium);
        }
    }

    createIronCondorCurve(stockPrice, currentPrice, breakevens, maxProfit, maxLoss) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 3;
        const loss = typeof maxLoss === 'number' ? maxLoss : 2;
        
        if (breakevens.length >= 2) {
            const lowerBreakeven = Math.min(...breakevens);
            const upperBreakeven = Math.max(...breakevens);
            
            if (stockPrice >= lowerBreakeven && stockPrice <= upperBreakeven) {
                return profit; // Profit zone
            } else if (stockPrice < lowerBreakeven) {
                return Math.max(profit - (lowerBreakeven - stockPrice), -loss);
            } else {
                return Math.max(profit - (stockPrice - upperBreakeven), -loss);
            }
        }
        
        // Default condor shape
        const range = currentPrice * 0.1;
        return Math.abs(stockPrice - currentPrice) <= range ? profit : -loss;
    }

    createButterflyPattern(stockPrice, currentPrice, breakevens, maxProfit, maxLoss) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 5;
        const loss = typeof maxLoss === 'number' ? maxLoss : 2;
        
        const center = currentPrice;
        const distance = Math.abs(stockPrice - center);
        const wing = currentPrice * 0.05;
        
        if (distance <= wing) {
            return profit * (1 - distance / wing);
        } else {
            return -loss;
        }
    }

    createSpreadPattern(stockPrice, currentPrice, breakevens, maxProfit, maxLoss, strategy) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 3;
        const loss = typeof maxLoss === 'number' ? maxLoss : 2;
        const breakeven = breakevens[0] || currentPrice;
        
        if (strategy.name.toLowerCase().includes('bull')) {
            return stockPrice <= breakeven ? -loss : Math.min(profit, stockPrice - breakeven);
        } else if (strategy.name.toLowerCase().includes('bear')) {
            return stockPrice >= breakeven ? -loss : Math.min(profit, breakeven - stockPrice);
        }
        
        return stockPrice > currentPrice ? profit : -loss;
    }

    createLizardPattern(stockPrice, currentPrice, maxProfit) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 5;
        
        // Jade Lizard: Limited upside risk, downside exposure
        if (stockPrice >= currentPrice) {
            return profit * 0.9; // Slight profit cap
        } else {
            return profit - Math.max(0, (currentPrice - stockPrice) * 0.3);
        }
    }

    createBackspreadPattern(stockPrice, currentPrice, breakevens) {
        const center = currentPrice;
        const distance = Math.abs(stockPrice - center);
        
        if (distance < 5) {
            return -2; // Loss zone between strikes
        } else if (distance > 10) {
            return distance - 7; // Profit zone on wings
        } else {
            return -2 + (distance - 5) * 0.4; // Transition
        }
    }

    createNeutralPattern(stockPrice, currentPrice, maxProfit, maxLoss) {
        const profit = typeof maxProfit === 'number' ? maxProfit : 2;
        const distance = Math.abs(stockPrice - currentPrice) / currentPrice;
        
        // Neutral strategy: Profit near current price
        return profit * Math.exp(-distance * 10);
    }


    /**
     * Calculate breakeven points for strategy using actual data
     */
    getBreakevenPoints(strategy, currentPrice) {
        // Use educational breakeven points from strategy data
        const strategyData = this.extractStrategyData(strategy);
        return strategyData.breakevens;
    }

    /**
     * Get profit/loss zones using comprehensive strategy data
     */
    getProfitLossZones(strategy, currentPrice) {
        const strategyData = this.extractStrategyData(strategy);
        const maxProfit = strategyData.maxProfitType === 'unlimited' ? 'Unlimited' : 
                         (strategyData.maxProfit ? `$${strategyData.maxProfit.toFixed(2)}` : 'Variable');
        const maxLoss = strategyData.maxLossType === 'unlimited' ? 'Unlimited' : 
                       (strategyData.maxLoss ? `$${strategyData.maxLoss.toFixed(2)}` : 'Variable');
        
        const breakevens = strategyData.breakevens.map(b => `$${b.toFixed(2)}`).join(', ');
        
        // Create meaningful profit/loss zones based on strategy pattern
        const zones = this.getPatternZones(strategyData.strategyPattern, strategy);
        
        return {
            maxProfit: maxProfit,
            maxLoss: maxLoss,
            profitZone: `Above breakeven(s): ${breakevens}`,
            lossZone: zones.lossZone || 'Outside profit zones'
        };
    }

    /**
     * Get pattern-specific profit/loss zones
     */
    getPatternZones(pattern, strategy) {
        switch (pattern) {
            case 'long_option':
                return {
                    profitZone: strategy.name.includes('call') ? 'Stock price rises above breakeven' : 'Stock price falls below breakeven',
                    lossZone: 'Premium paid is maximum loss'
                };
            
            case 'short_option':
                return {
                    profitZone: 'Time decay and favorable price movement',
                    lossZone: strategy.name.includes('call') ? 'Stock price rises significantly' : 'Stock price falls significantly'
                };
            
            case 'volatility':
                return {
                    profitZone: strategy.name.includes('long') ? 'Large price movements in either direction' : 'Stock price stays near current level',
                    lossZone: strategy.name.includes('long') ? 'Stock price remains stable' : 'Large price movements'
                };
            
            case 'iron_condor':
                return {
                    profitZone: 'Stock price remains between breakeven points',
                    lossZone: 'Stock moves beyond outer strikes'
                };
            
            case 'butterfly':
                return {
                    profitZone: 'Stock price stays near center strike',
                    lossZone: 'Stock moves significantly from center'
                };
            
            case 'spread':
                return {
                    profitZone: strategy.name.includes('bull') ? 'Stock price rises moderately' : 'Stock price falls moderately',
                    lossZone: 'Unfavorable directional movement'
                };
            
            case 'lizard':
                return {
                    profitZone: 'No upside risk, collect premium',
                    lossZone: 'Significant downside movement'
                };
            
            case 'backspread':
                return {
                    profitZone: 'Large directional moves beyond breakevens',
                    lossZone: 'Stock price between strikes'
                };
            
            default:
                return {
                    profitZone: 'Favorable market conditions',
                    lossZone: 'Unfavorable market conditions'
                };
        }
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