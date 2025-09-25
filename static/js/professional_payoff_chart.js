/**
 * Professional Option Payoff Chart with Alternating Profit/Loss Zones
 * Implements comprehensive multi-leg option strategy visualization with individual legs and alternating zones
 * Based on professional option analysis standards and industry best practices
 */

class ProfessionalPayoffChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.chart = null;
        this.currentPositions = [];
        this.spotPrice = null;
        this.breakEvenPoints = [];
        this.maxProfit = null;
        this.maxLoss = null;
        
        this.options = {
            title: options.title || 'Option Strategy Payoff Analysis',
            height: options.height || 500,
            animate: options.animate !== false,
            showSpotLine: options.showSpotLine !== false,
            showBreakevenLines: options.showBreakevenLines !== false,
            showIndividualLegs: options.showIndividualLegs !== false,
            profitColor: options.profitColor || '#22C55E', // Green
            lossColor: options.lossColor || '#EF4444',     // Red
            neutralColor: options.neutralColor || '#6B7280', // Gray
            spotLineColor: options.spotLineColor || '#3B82F6', // Blue
            breakevenColor: options.breakevenColor || '#17A2B8', // Teal
            // Individual leg colors
            longCallColor: options.longCallColor || '#007BFF', // Blue
            shortCallColor: options.shortCallColor || '#FD7E14', // Orange  
            longPutColor: options.longPutColor || '#20C997', // Teal
            shortPutColor: options.shortPutColor || '#6F42C1', // Purple
            ...options
        };
        
        // PERFORMANCE: Add throttling to prevent hanging
        this.updatePending = false;
        this.lastUpdateTime = 0;
        this.updateDelay = 100; // 100ms throttle
        
        // Display toggles - all visible by default
        this.displaySettings = {
            showIndividualLegs: true,
            showSpotPriceLine: true,
            showBreakevenLines: true
        };
        
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
                plotBackgroundColor: '#F8F9FA',
                animation: this.options.animate,
                borderRadius: 8,
                shadow: {
                    color: 'rgba(0,0,0,0.1)',
                    offsetX: 2,
                    offsetY: 2,
                    width: 3
                }
            },
            
            // No title or subtitle to maximize chart space
            
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
     * @param {Object} option - Option details {type/option_type: 'call'|'put', action: 'buy'|'sell', strike: number, premium: number}
     * @param {number} underlyingPrice - Current underlying price
     * @returns {number} Payoff value
     */
    calculateSingleLegPayoff(option, underlyingPrice) {
        // Handle both field names: 'type' and 'option_type'
        const optionType = option.type || option.option_type;
        const { action, strike, premium } = option;
        let intrinsicValue = 0;
        
        if (!optionType) {
            console.error('❌ Option type missing in:', option);
            return 0;
        }
        
        if (optionType.toLowerCase() === 'call' || optionType === 'CE') {
            intrinsicValue = Math.max(underlyingPrice - strike, 0);
        } else if (optionType.toLowerCase() === 'put' || optionType === 'PE') {
            intrinsicValue = Math.max(strike - underlyingPrice, 0);
        }
        
        if (!action || !strike || premium === undefined) {
            console.error('❌ Missing required fields in option:', option);
            return 0;
        }
        
        if (action.toLowerCase() === 'buy') {
            return intrinsicValue - premium;
        } else if (action.toLowerCase() === 'sell') {
            return premium - intrinsicValue;
        }
        
        return 0;
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
     * Update chart with professional alternating profit/loss zones - THROTTLED for performance
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
                this.renderProfessionalPayoffChart();
            } finally {
                this.updatePending = false;
            }
        });
    }
    
    /**
     * Render professional payoff chart with alternating profit/loss zones
     * This is the main rendering method following architect guidance
     */
    renderProfessionalPayoffChart() {
        if (!this.chart || !this.currentPositions || this.currentPositions.length === 0) {
            return;
        }
        
        console.log('🎨 Rendering professional payoff chart with alternating zones...');
        
        // Clear existing series
        while (this.chart.series.length > 0) {
            this.chart.series[0].remove(false);
        }
        
        // Generate payoff data and calculate breakeven points
        const payoffData = this.generatePayoffData();
        if (payoffData.length === 0) return;
        
        this.calculateBreakevenPoints(payoffData);
        this.calculateMaxProfitLoss(payoffData);
        
        // Add individual leg series if enabled
        if (this.options.showIndividualLegs) {
            this.addIndividualLegSeries();
        }
        
        // Add alternating profit/loss zones between breakeven points
        this.addAlternatingZones(payoffData);
        
        // Add main payoff line
        this.chart.addSeries({
            name: 'Net P&L',
            type: 'line',
            data: payoffData,
            color: '#1E293B',
            lineWidth: 4,
            marker: { enabled: false },
            enableMouseTracking: true,
            showInLegend: true,
            zIndex: 15,
            shadow: {
                color: 'rgba(30, 41, 59, 0.3)',
                offsetX: 1,
                offsetY: 1,
                width: 2
            }
        }, false);
        
        // Safe redraw to prevent infinite recursion
        this.chart.redraw(false);
        
        // Update visual elements
        this.updateBreakevenLines();
        if (this.options.showSpotLine && this.spotPrice) {
            this.updateSpotPriceLine();
        }
        
        console.log('✅ Professional payoff chart rendered successfully');
    }
    
    /**
     * Calculate breakeven points from payoff data
     * Finds where the payoff line crosses zero
     */
    calculateBreakevenPoints(payoffData) {
        this.breakEvenPoints = [];
        
        for (let i = 1; i < payoffData.length; i++) {
            const [prevPrice, prevPnl] = payoffData[i - 1];
            const [currPrice, currPnl] = payoffData[i];
            
            // Check for zero crossing
            if ((prevPnl <= 0 && currPnl >= 0) || (prevPnl >= 0 && currPnl <= 0)) {
                // Linear interpolation to find exact breakeven point
                const ratio = Math.abs(prevPnl) / (Math.abs(prevPnl) + Math.abs(currPnl));
                const breakevenPrice = prevPrice + ratio * (currPrice - prevPrice);
                this.breakEvenPoints.push(breakevenPrice);
            }
        }
        
        console.log('📊 Calculated breakeven points:', this.breakEvenPoints);
    }
    
    /**
     * Calculate maximum profit and loss from payoff data
     */
    calculateMaxProfitLoss(payoffData) {
        let maxProfit = -Infinity;
        let maxLoss = Infinity;
        
        for (const [price, pnl] of payoffData) {
            maxProfit = Math.max(maxProfit, pnl);
            maxLoss = Math.min(maxLoss, pnl);
        }
        
        this.maxProfit = maxProfit > 0 ? maxProfit : null;
        this.maxLoss = maxLoss < 0 ? maxLoss : null;
        
        console.log('📈 Max Profit:', this.maxProfit, 'Max Loss:', this.maxLoss);
    }
    
    /**
     * Add individual leg series to show each option position
     */
    addIndividualLegSeries() {
        const strikes = this.currentPositions.map(p => p.strike);
        const minStrike = Math.min(...strikes);
        const maxStrike = Math.max(...strikes);
        const priceRange = maxStrike - minStrike;
        const buffer = Math.max(priceRange * 0.5, 1000);
        
        const startPrice = minStrike - buffer;
        const endPrice = maxStrike + buffer;
        const priceStep = (endPrice - startPrice) / 200;
        
        for (const [index, position] of this.currentPositions.entries()) {
            const legData = [];
            const legName = this.getLegName(position);
            const legColor = this.getLegColor(position);
            
            for (let price = startPrice; price <= endPrice; price += priceStep) {
                const legPayoff = this.calculateSingleLegPayoff(position, price) * position.quantity;
                legData.push([price, legPayoff]);
            }
            
            this.chart.addSeries({
                name: legName,
                type: 'line',
                data: legData,
                color: legColor,
                lineWidth: 2,
                dashStyle: 'Dash',
                marker: { enabled: false },
                enableMouseTracking: false,
                showInLegend: true,
                zIndex: 5,
                opacity: 0.7
            }, false);
        }
    }
    
    /**
     * Get descriptive name for individual leg
     */
    getLegName(position) {
        // Use position.action instead of quantity sign for proper Long/Short determination
        const action = position.action.toLowerCase() === 'buy' ? 'Long' : 'Short';
        const optionType = (position.option_type || position.type).toLowerCase();
        const type = (optionType === 'call' || optionType === 'ce') ? 'Call' : 'Put';
        return `${action} ${type} (${position.strike})`;
    }
    
    /**
     * Get color for individual leg based on type
     */
    getLegColor(position) {
        // Use position.action instead of quantity sign for proper Long/Short determination
        const isLong = position.action.toLowerCase() === 'buy';
        const optionType = (position.option_type || position.type).toLowerCase();
        const isCall = (optionType === 'call' || optionType === 'ce');
        
        if (isCall && isLong) return this.options.longCallColor;
        if (isCall && !isLong) return this.options.shortCallColor;
        if (!isCall && isLong) return this.options.longPutColor;
        return this.options.shortPutColor;
    }
    
    /**
     * Add alternating profit/loss zones between breakeven points
     * This creates the professional alternating green/red zones
     */
    addAlternatingZones(payoffData) {
        if (this.breakEvenPoints.length === 0) {
            // No breakeven points - simple profit/loss zones
            this.addSimpleProfitLossZones(payoffData);
            return;
        }
        
        // Create boundaries including min/max prices
        const prices = payoffData.map(([price]) => price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const boundaries = [minPrice, ...this.breakEvenPoints.sort((a, b) => a - b), maxPrice];
        
        // Create alternating zones between boundaries
        for (let i = 0; i < boundaries.length - 1; i++) {
            const startPrice = boundaries[i];
            const endPrice = boundaries[i + 1];
            const midPrice = (startPrice + endPrice) / 2;
            
            // Find P&L at midpoint to determine if zone is profit or loss
            const midPnl = this.calculateTotalPayoff(midPrice);
            const isProfit = midPnl > 0;
            
            // Create zone data
            const zoneData = payoffData.filter(([price]) => price >= startPrice && price <= endPrice);
            
            if (zoneData.length > 0) {
                this.addProfitLossZone(zoneData, isProfit, i);
            }
        }
    }
    
    /**
     * Add simple profit/loss zones when no breakeven points exist
     */
    addSimpleProfitLossZones(payoffData) {
        const profitZones = [];
        const lossZones = [];
        
        for (const [price, pnl] of payoffData) {
            if (pnl >= 0) {
                profitZones.push([price, pnl]);
                lossZones.push([price, 0]);
            } else {
                profitZones.push([price, 0]);
                lossZones.push([price, pnl]);
            }
        }
        
        // Add profit zone
        this.chart.addSeries({
            name: 'Profit Zone',
            type: 'area',
            data: profitZones,
            color: this.options.profitColor,
            fillColor: this.createGradientFill(this.options.profitColor, true),
            lineWidth: 0,
            threshold: 0,
            marker: { enabled: false },
            enableMouseTracking: false,
            showInLegend: false,
            zIndex: 1
        }, false);
        
        // Add loss zone
        this.chart.addSeries({
            name: 'Loss Zone',
            type: 'area',
            data: lossZones,
            color: this.options.lossColor,
            fillColor: this.createGradientFill(this.options.lossColor, false),
            lineWidth: 0,
            threshold: 0,
            marker: { enabled: false },
            enableMouseTracking: false,
            showInLegend: false,
            zIndex: 1
        }, false);
    }
    
    /**
     * Add individual profit or loss zone
     */
    addProfitLossZone(zoneData, isProfit, zoneIndex) {
        const color = isProfit ? this.options.profitColor : this.options.lossColor;
        const zoneName = isProfit ? `Profit Zone ${zoneIndex + 1}` : `Loss Zone ${zoneIndex + 1}`;
        
        // Create area data that goes from payoff line to zero
        const areaData = zoneData.map(([price, pnl]) => {
            return isProfit ? [price, Math.max(0, pnl)] : [price, Math.min(0, pnl)];
        });
        
        this.chart.addSeries({
            name: zoneName,
            type: 'area',
            data: areaData,
            color: color,
            fillColor: this.createGradientFill(color, isProfit),
            lineWidth: 0,
            threshold: 0,
            marker: { enabled: false },
            enableMouseTracking: false,
            showInLegend: false,
            zIndex: isProfit ? 2 : 1
        }, false);
    }
    
    /**
     * Create gradient fill for zones
     */
    createGradientFill(color, isProfit) {
        const opacity1 = isProfit ? 0.4 : 0.3;
        const opacity2 = isProfit ? 0.1 : 0.1;
        
        return {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
                [0, Highcharts.color(color).setOpacity(opacity1).get('rgba')],
                [1, Highcharts.color(color).setOpacity(opacity2).get('rgba')]
            ]
        };
    }
    
    /**
     * Update breakeven lines on the chart
     */
    updateBreakevenLines() {
        if (!this.chart) return;
        
        // Always remove existing breakeven lines first (even if no new ones to add)
        for (let i = 0; i < 10; i++) {
            this.chart.xAxis[0].removePlotLine(`breakeven${i}`);
        }
        
        // Exit early if no breakeven points to add
        if (!this.breakEvenPoints || this.breakEvenPoints.length === 0) return;
        
        const breakevenPoints = this.breakEvenPoints;
        
        breakevenPoints.forEach((point, index) => {
            this.chart.xAxis[0].addPlotLine({
                id: `breakeven${index}`,
                value: point,
                color: this.options.breakevenColor,
                width: 3,
                dashStyle: 'Dot',
                zIndex: 12,
                label: {
                    text: `Break-even: ₹${point.toFixed(2)}`,
                    align: 'center',
                    style: {
                        color: this.options.breakevenColor,
                        fontWeight: 'bold',
                        fontSize: '12px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        borderRadius: '3px',
                        padding: '2px 4px'
                    },
                    y: -8
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
            console.log(`📈 Chart spot price updated to: ${spotPrice}`);
            
            // Only update spot price line if it's enabled
            if (this.displaySettings.showSpotPriceLine) {
                this.updateLiveSpotPriceLine();
            }
        }
    }
    
    /**
     * Update live moving spot price line (consolidated to use single ID)
     */
    updateLiveSpotPriceLine() {
        if (!this.chart || !this.spotPrice) return;
        
        // Remove existing spot price lines (both legacy and live)
        this.chart.xAxis[0].removePlotLine('currentSpot');
        this.chart.xAxis[0].removePlotLine('realtime-spot');
        
        // Add single unified live spot price line using consistent ID
        this.chart.xAxis[0].addPlotLine({
            id: 'currentSpot', // Use consistent ID to avoid duplicates
            color: '#FF6B35', // Orange for live moving line
            width: 3,
            value: this.spotPrice,
            dashStyle: 'Solid',
            label: {
                text: `Live: ₹${this.spotPrice.toFixed(1)}`,
                align: 'right',
                verticalAlign: 'top',
                style: {
                    color: '#FF6B35',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    backgroundColor: 'rgba(255, 107, 53, 0.1)',
                    padding: '2px 4px',
                    borderRadius: '3px'
                }
            },
            zIndex: 10 // Higher than breakeven lines so it shows on top
        });
        
        console.log(`📍 Live spot price line updated to: ${this.spotPrice}`);
    }
    
    /**
     * Get chart statistics with fresh calculations
     * @returns {Object} Chart statistics
     */
    getChartStats() {
        if (!this.currentPositions || this.currentPositions.length === 0) {
            return { maxProfit: 0, maxLoss: 0, breakevenPoints: [] };
        }
        
        // Generate fresh payoff data
        const payoffData = this.generatePayoffData();
        const pnlValues = payoffData.map(point => point[1]);
        
        // Calculate fresh breakeven points and profit/loss values
        this.calculateBreakevenPoints(payoffData);
        this.calculateMaxProfitLoss(payoffData);
        
        return {
            maxProfit: this.maxProfit || Math.max(...pnlValues),
            maxLoss: this.maxLoss || Math.min(...pnlValues),
            breakevenPoints: this.breakEvenPoints || [],
            netCredit: this.currentPositions.reduce((sum, pos) => sum + (pos.premium * pos.quantity * (pos.action.toLowerCase() === 'sell' ? 1 : -1)), 0)
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
    
    /**
     * Toggle display settings for chart elements
     */
    toggleIndividualLegs() {
        this.displaySettings.showIndividualLegs = !this.displaySettings.showIndividualLegs;
        
        if (this.displaySettings.showIndividualLegs) {
            this.updateIndividualLegs();
        } else {
            this.hideIndividualLegs();
        }
        
        console.log(`Individual legs: ${this.displaySettings.showIndividualLegs ? 'shown' : 'hidden'}`);
        return this.displaySettings.showIndividualLegs;
    }
    
    toggleSpotPriceLine() {
        this.displaySettings.showSpotPriceLine = !this.displaySettings.showSpotPriceLine;
        
        if (this.displaySettings.showSpotPriceLine) {
            this.updateCurrentSpotPrice();
        } else {
            this.hideSpotPriceLine();
        }
        
        console.log(`Spot price line: ${this.displaySettings.showSpotPriceLine ? 'shown' : 'hidden'}`);
        return this.displaySettings.showSpotPriceLine;
    }
    
    toggleBreakevenLines() {
        this.displaySettings.showBreakevenLines = !this.displaySettings.showBreakevenLines;
        
        if (this.displaySettings.showBreakevenLines) {
            this.updateBreakevenLines();
        } else {
            this.hideBreakevenLines();
        }
        
        console.log(`Breakeven lines: ${this.displaySettings.showBreakevenLines ? 'shown' : 'hidden'}`);
        return this.displaySettings.showBreakevenLines;
    }
    
    /**
     * Hide individual leg lines
     */
    hideIndividualLegs() {
        if (!this.chart) return;
        
        // Remove all individual leg series
        const seriesToRemove = this.chart.series.filter(series => 
            series.options.id && series.options.id.startsWith('leg-')
        );
        
        seriesToRemove.forEach(series => series.remove(false));
        this.chart.redraw();
    }
    
    /**
     * Hide spot price line (remove all possible spot line IDs)
     */
    hideSpotPriceLine() {
        if (!this.chart) return;
        
        // Remove both legacy and live spot price lines to ensure clean hide
        this.chart.xAxis[0].removePlotLine('currentSpot');
        this.chart.xAxis[0].removePlotLine('realtime-spot');
        
        console.log('📍 All spot price lines hidden');
    }
    
    /**
     * Hide breakeven lines
     */
    hideBreakevenLines() {
        if (!this.chart) return;
        
        // Remove all breakeven plot lines
        for (let i = 0; i < 10; i++) {
            this.chart.xAxis[0].removePlotLine(`breakeven${i}`);
        }
    }
    
    /**
     * Get current symbol and expiry from option chain
     */
    getCurrentSymbolData() {
        // Get current symbol and expiry from WebSocket handler
        if (window.webSocketHandler) {
            return {
                symbol: window.webSocketHandler.currentSymbol,
                expiry: window.webSocketHandler.currentExpiry,
                spotPrice: window.webSocketHandler.getCurrentSpotPrice()
            };
        }
        return { symbol: null, expiry: null, spotPrice: 0 };
    }
    
    /**
     * Sync chart with current symbol/expiry selection
     */
    syncWithSymbolSelection() {
        const symbolData = this.getCurrentSymbolData();
        
        if (symbolData.spotPrice && symbolData.spotPrice !== this.spotPrice) {
            console.log(`🔄 Syncing chart with symbol ${symbolData.symbol}, spot: ${symbolData.spotPrice}`);
            this.updateSpotPrice(symbolData.spotPrice);
        }
        
        // Update chart title with current symbol info
        if (this.chart && symbolData.symbol) {
            let title = 'Option Strategy Payoff Analysis';
            if (symbolData.symbol) {
                const symbolName = symbolData.symbol.replace('NSE:', '').replace('-INDEX', '');
                title = `${symbolName} Options Strategy`;
            }
            this.chart.setTitle({ text: title });
        }
    }
    
    /**
     * Force refresh chart with latest market data
     */
    refreshWithLiveData() {
        console.log('🔄 Refreshing chart with live data...');
        
        // Sync with current symbol selection
        this.syncWithSymbolSelection();
        
        // Update positions if they exist
        if (this.currentPositions && this.currentPositions.length > 0) {
            this.updateProfitLossZones();
        }
        
        console.log('✅ Chart refreshed with live data');
    }
}

// Export for global use
window.ProfessionalPayoffChart = ProfessionalPayoffChart;