/**
 * Professional Option Payoff Chart with Profit/Loss Zones
 * Implements comprehensive option strategy visualization with green profit zones and red loss zones
 * Based on professional option analysis standards
 */

class ProfessionalPayoffChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.chart = null;
        this.currentPositions = [];
        this.spotPrice = null;
        this.options = {
            title: options.title || 'Option Strategy Payoff Chart',
            height: options.height || 400,
            animate: options.animate !== false,
            showSpotLine: options.showSpotLine !== false,
            showBreakevenLines: options.showBreakevenLines !== false,
            profitColor: options.profitColor || '#22C55E', // Green
            lossColor: options.lossColor || '#EF4444',     // Red
            neutralColor: options.neutralColor || '#6B7280', // Gray
            spotLineColor: options.spotLineColor || '#3B82F6', // Blue
            breakevenColor: options.breakevenColor || '#F59E0B', // Orange
            ...options
        };
        
        // PERFORMANCE FIX: Add throttling to prevent hanging
        this.updatePending = false;
        this.lastUpdateTime = 0;
        this.updateDelay = 100; // 100ms throttle
        
        this.init();
    }
    
    init() {
        console.log('🎯 Initializing Professional Payoff Chart...');
        this.createChart();
    }
    
    createChart() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }
        
        this.chart = Highcharts.chart(this.containerId, {
            chart: {
                type: 'line',
                height: this.options.height,
                backgroundColor: '#FFFFFF',
                plotBackgroundColor: '#FAFBFC',
                animation: this.options.animate
                // REMOVED: Infinite recursion redraw event that was causing hanging
            },
            
            title: {
                text: this.options.title,
                style: {
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#1F2937'
                }
            },
            
            xAxis: {
                title: {
                    text: 'Underlying Price (₹)',
                    style: { color: '#374151', fontWeight: '600' }
                },
                crosshair: {
                    width: 1,
                    color: '#9CA3AF',
                    dashStyle: 'dash'
                },
                gridLineWidth: 1,
                gridLineColor: '#E5E7EB',
                labels: {
                    style: { color: '#6B7280' },
                    formatter: function() {
                        return '₹' + this.value.toFixed(0);
                    }
                }
            },
            
            yAxis: {
                title: {
                    text: 'Profit/Loss (₹)',
                    style: { color: '#374151', fontWeight: '600' }
                },
                gridLineWidth: 1,
                gridLineColor: '#E5E7EB',
                labels: {
                    style: { color: '#6B7280' },
                    formatter: function() {
                        const value = this.value;
                        const color = value >= 0 ? '#22C55E' : '#EF4444';
                        return `<span style="color: ${color}">₹${value.toFixed(0)}</span>`;
                    }
                },
                plotLines: [{
                    value: 0,
                    color: '#374151',
                    width: 2,
                    zIndex: 4,
                    label: {
                        text: 'Breakeven Line',
                        align: 'right',
                        style: {
                            color: '#374151',
                            fontWeight: 'bold'
                        }
                    }
                }]
            },
            
            tooltip: {
                shared: false,
                useHTML: true,
                backgroundColor: '#FFFFFF',
                borderColor: '#D1D5DB',
                borderRadius: 8,
                shadow: true,
                formatter: function() {
                    const underlyingPrice = this.x;
                    const pnl = this.y;
                    const isProfit = pnl >= 0;
                    const color = isProfit ? '#22C55E' : '#EF4444';
                    const sign = isProfit ? '+' : '';
                    
                    return `
                        <div style="padding: 8px;">
                            <strong>Underlying: ₹${underlyingPrice.toFixed(2)}</strong><br/>
                            <span style="color: ${color}; font-weight: bold;">
                                P&L: ${sign}₹${pnl.toFixed(2)}
                            </span>
                        </div>
                    `;
                }
            },
            
            legend: {
                enabled: true,
                align: 'center',
                verticalAlign: 'bottom',
                itemStyle: {
                    color: '#374151',
                    fontWeight: '500'
                }
            },
            
            plotOptions: {
                line: {
                    lineWidth: 3,
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true,
                                radius: 6
                            }
                        }
                    }
                },
                area: {
                    fillOpacity: 0.3,
                    lineWidth: 0,
                    marker: {
                        enabled: false
                    },
                    enableMouseTracking: false
                }
            },
            
            credits: {
                enabled: false
            },
            
            exporting: {
                enabled: false
            }
        });
        
        console.log('✅ Professional Payoff Chart created');
    }
    
    /**
     * Calculate single-leg option payoff
     * @param {Object} option - Option details {type: 'call'|'put', action: 'buy'|'sell', strike: number, premium: number}
     * @param {number} underlyingPrice - Current underlying price
     * @returns {number} Payoff value
     */
    calculateSingleLegPayoff(option, underlyingPrice) {
        const { type, action, strike, premium } = option;
        let intrinsicValue = 0;
        
        if (type.toLowerCase() === 'call' || type === 'CE') {
            intrinsicValue = Math.max(underlyingPrice - strike, 0);
        } else if (type.toLowerCase() === 'put' || type === 'PE') {
            intrinsicValue = Math.max(strike - underlyingPrice, 0);
        }
        
        if (action.toLowerCase() === 'buy') {
            return intrinsicValue - premium;
        } else if (action.toLowerCase() === 'sell') {
            return premium - intrinsicValue;
        }
        
        return 0;
    }
    
    /**
     * Calculate breakeven points for current strategy
     * @returns {Array} Array of breakeven prices
     */
    calculateBreakevenPoints() {
        if (!this.currentPositions || this.currentPositions.length === 0) {
            return [];
        }
        
        const breakevenPoints = [];
        const minStrike = Math.min(...this.currentPositions.map(p => p.strike));
        const maxStrike = Math.max(...this.currentPositions.map(p => p.strike));
        const priceRange = maxStrike - minStrike;
        const bufferRange = Math.max(priceRange * 0.5, 1000);
        
        // Search for breakeven points by checking sign changes
        for (let price = minStrike - bufferRange; price <= maxStrike + bufferRange; price += 1) {
            const currentPnL = this.calculateTotalPayoff(price);
            const nextPnL = this.calculateTotalPayoff(price + 1);
            
            // Check for sign change (breakeven point)
            if ((currentPnL <= 0 && nextPnL > 0) || (currentPnL >= 0 && nextPnL < 0)) {
                // Refine the breakeven point with binary search
                let low = price;
                let high = price + 1;
                let iterations = 0;
                const maxIterations = 20;
                
                while (high - low > 0.01 && iterations < maxIterations) {
                    const mid = (low + high) / 2;
                    const midPnL = this.calculateTotalPayoff(mid);
                    
                    if (Math.abs(midPnL) < 0.01) {
                        breakevenPoints.push(mid);
                        break;
                    }
                    
                    if (midPnL * currentPnL > 0) {
                        low = mid;
                    } else {
                        high = mid;
                    }
                    iterations++;
                }
                
                if (iterations === maxIterations) {
                    breakevenPoints.push((low + high) / 2);
                }
            }
        }
        
        // Remove duplicates and sort
        return [...new Set(breakevenPoints.map(p => Math.round(p * 100) / 100))].sort((a, b) => a - b);
    }
    
    /**
     * Calculate total payoff for all positions at given underlying price
     * @param {number} underlyingPrice - Underlying price to calculate payoff for
     * @returns {number} Total payoff
     */
    calculateTotalPayoff(underlyingPrice) {
        if (!this.currentPositions || this.currentPositions.length === 0) {
            return 0;
        }
        
        let totalPayoff = 0;
        
        for (const position of this.currentPositions) {
            const legPayoff = this.calculateSingleLegPayoff(position, underlyingPrice);
            totalPayoff += legPayoff * position.quantity;
        }
        
        return totalPayoff;
    }
    
    /**
     * Generate payoff data points for charting
     * @returns {Array} Array of [price, payoff] points
     */
    generatePayoffData() {
        if (!this.currentPositions || this.currentPositions.length === 0) {
            return [];
        }
        
        const strikes = this.currentPositions.map(p => p.strike);
        const minStrike = Math.min(...strikes);
        const maxStrike = Math.max(...strikes);
        const priceRange = maxStrike - minStrike;
        const buffer = Math.max(priceRange * 0.5, 1000);
        
        const startPrice = minStrike - buffer;
        const endPrice = maxStrike + buffer;
        const priceStep = (endPrice - startPrice) / 200; // 200 data points for smooth curves
        
        const payoffData = [];
        
        for (let price = startPrice; price <= endPrice; price += priceStep) {
            const totalPayoff = this.calculateTotalPayoff(price);
            payoffData.push([price, totalPayoff]);
        }
        
        return payoffData;
    }
    
    /**
     * Update chart with profit and loss zones - THROTTLED for performance
     */
    updateProfitLossZones() {
        if (!this.chart || !this.currentPositions || this.currentPositions.length === 0) {
            return;
        }
        
        // PERFORMANCE FIX: Throttle updates to prevent hanging
        const now = Date.now();
        if (this.updatePending || (now - this.lastUpdateTime) < this.updateDelay) {
            return;
        }
        
        this.updatePending = true;
        this.lastUpdateTime = now;
        
        // Defer to next frame to prevent blocking UI
        requestAnimationFrame(() => {
            try {
                this.updateProfitLossZonesImmediate();
            } finally {
                this.updatePending = false;
            }
        });
    }
    
    /**
     * Immediate update implementation (called via requestAnimationFrame)
     */
    updateProfitLossZonesImmediate() {
        if (!this.chart || !this.currentPositions || this.currentPositions.length === 0) {
            return;
        }
        
        const payoffData = this.generatePayoffData();
        if (payoffData.length === 0) return;
        
        // Separate profit and loss zones
        const profitZones = [];
        const lossZones = [];
        
        for (let i = 0; i < payoffData.length; i++) {
            const [price, pnl] = payoffData[i];
            
            if (pnl >= 0) {
                profitZones.push([price, pnl]);
                lossZones.push([price, 0]);
            } else {
                profitZones.push([price, 0]);
                lossZones.push([price, pnl]);
            }
        }
        
        // Remove existing series
        while (this.chart.series.length > 0) {
            this.chart.series[0].remove(false);
        }
        
        // Add profit zone (green area above zero line)
        this.chart.addSeries({
            name: 'Profit Zone',
            type: 'area',
            data: profitZones,
            color: this.options.profitColor,
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.color(this.options.profitColor).setOpacity(0.4).get('rgba')],
                    [1, Highcharts.color(this.options.profitColor).setOpacity(0.1).get('rgba')]
                ]
            },
            lineWidth: 0,
            threshold: 0,
            marker: { enabled: false },
            enableMouseTracking: false,
            showInLegend: true
        }, false);
        
        // Add loss zone (red area below zero line)
        this.chart.addSeries({
            name: 'Loss Zone',
            type: 'area',
            data: lossZones,
            color: this.options.lossColor,
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.color(this.options.lossColor).setOpacity(0.1).get('rgba')],
                    [1, Highcharts.color(this.options.lossColor).setOpacity(0.4).get('rgba')]
                ]
            },
            lineWidth: 0,
            threshold: 0,
            marker: { enabled: false },
            enableMouseTracking: false,
            showInLegend: true
        }, false);
        
        // Add main payoff line
        this.chart.addSeries({
            name: 'Net P&L',
            type: 'line',
            data: payoffData,
            color: '#1F2937',
            lineWidth: 3,
            marker: { enabled: false },
            enableMouseTracking: true,
            showInLegend: true,
            zIndex: 10
        }, false);
        
        // FIXED: Use redraw(false) to prevent infinite recursion
        this.chart.redraw(false);
        
        // Update breakeven lines
        if (this.options.showBreakevenLines) {
            this.updateBreakevenLines();
        }
        
        // Update spot price line
        if (this.options.showSpotLine && this.spotPrice) {
            this.updateSpotPriceLine();
        }
    }
    
    /**
     * Update breakeven lines on the chart
     */
    updateBreakevenLines() {
        if (!this.chart) return;
        
        // Remove existing breakeven lines
        for (let i = 0; i < 10; i++) {
            this.chart.xAxis[0].removePlotLine(`breakeven${i}`);
        }
        
        const breakevenPoints = this.calculateBreakevenPoints();
        
        breakevenPoints.forEach((point, index) => {
            this.chart.xAxis[0].addPlotLine({
                id: `breakeven${index}`,
                value: point,
                color: this.options.breakevenColor,
                width: 2,
                dashStyle: 'Dash',
                zIndex: 6,
                label: {
                    text: `BE: ₹${point.toFixed(0)}`,
                    align: 'center',
                    style: {
                        color: this.options.breakevenColor,
                        fontWeight: 'bold',
                        fontSize: '11px'
                    },
                    y: -5
                }
            });
        });
        
        console.log(`✅ Updated ${breakevenPoints.length} breakeven lines:`, breakevenPoints);
    }
    
    /**
     * Update spot price line on the chart
     */
    updateSpotPriceLine() {
        if (!this.chart || !this.spotPrice) return;
        
        this.chart.xAxis[0].removePlotLine('currentSpot');
        
        this.chart.xAxis[0].addPlotLine({
            id: 'currentSpot',
            value: this.spotPrice,
            color: this.options.spotLineColor,
            width: 3,
            zIndex: 8,
            label: {
                text: `Spot: ₹${this.spotPrice.toFixed(0)}`,
                align: 'center',
                style: {
                    color: this.options.spotLineColor,
                    fontWeight: 'bold',
                    fontSize: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '3px',
                    padding: '3px 6px'
                },
                y: -10
            }
        });
    }
    
    /**
     * Update positions and refresh chart
     * @param {Array} positions - Array of position objects
     */
    updatePositions(positions) {
        console.log('🎯 Updating payoff chart positions:', positions);
        this.currentPositions = positions || [];
        this.updateProfitLossZones();
    }
    
    /**
     * Update spot price and refresh chart
     * @param {number} spotPrice - Current spot price
     */
    updateSpotPrice(spotPrice) {
        if (spotPrice && spotPrice > 0) {
            this.spotPrice = spotPrice;
            this.updateSpotPriceLine();
        }
    }
    
    /**
     * Get chart statistics
     * @returns {Object} Chart statistics
     */
    getChartStats() {
        if (!this.currentPositions || this.currentPositions.length === 0) {
            return { maxProfit: 0, maxLoss: 0, breakevenPoints: [] };
        }
        
        const payoffData = this.generatePayoffData();
        const pnlValues = payoffData.map(point => point[1]);
        
        return {
            maxProfit: Math.max(...pnlValues),
            maxLoss: Math.min(...pnlValues),
            breakevenPoints: this.calculateBreakevenPoints(),
            netCredit: this.currentPositions.reduce((sum, pos) => sum + (pos.premium * pos.quantity * (pos.action === 'sell' ? 1 : -1)), 0)
        };
    }
    
    /**
     * Resize chart (called when container is resized)
     */
    reflow() {
        if (this.chart) {
            this.chart.reflow();
        }
    }
    
    /**
     * Destroy chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Export for global use
window.ProfessionalPayoffChart = ProfessionalPayoffChart;