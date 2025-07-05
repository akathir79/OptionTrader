/**
 * Payoff Chart Integration - Enhanced payoff chart with position manager integration
 */

class PayoffChartIntegration {
    constructor() {
        this.chart = null;
        this.chartContainer = 'chartContainer';
        this.currentPositions = [];
        this.spotPrice = 25450; // Default spot price
        this.strikes = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeChart();
        console.log('Payoff Chart Integration initialized');
    }

    setupEventListeners() {
        // Listen for position updates from position manager
        document.addEventListener('positionsUpdated', (e) => {
            this.handlePositionsUpdate(e.detail);
        });

        // Listen for spot price updates
        document.addEventListener('spotPriceUpdated', (e) => {
            this.updateSpotPrice(e.detail.spotPrice);
        });

        // Listen for chart configuration changes
        document.addEventListener('payoffChartConfig', (e) => {
            this.updateChartConfig(e.detail);
        });
    }

    initializeChart() {
        if (typeof Highcharts === 'undefined') {
            console.warn('Highcharts not loaded, will retry...');
            setTimeout(() => this.initializeChart(), 1000);
            return;
        }

        const chartOptions = {
            chart: {
                type: 'line',
                backgroundColor: '#ffffff',
                height: 400,
                zoomType: 'xy',
                events: {
                    load: () => {
                        console.log('Payoff chart loaded successfully');
                    }
                }
            },
            title: {
                text: 'Options Payoff Chart',
                style: {
                    fontSize: '16px',
                    fontWeight: 'bold'
                }
            },
            subtitle: {
                text: 'Real-time P&L visualization based on underlying price movement'
            },
            xAxis: {
                title: {
                    text: 'Underlying Price (₹)',
                    style: { fontWeight: 'bold' }
                },
                labels: {
                    formatter: function() {
                        return '₹' + this.value.toLocaleString();
                    }
                },
                plotLines: [{
                    id: 'spot-price-line',
                    color: '#FF6B6B',
                    width: 3,
                    value: this.spotPrice,
                    dashStyle: 'Solid',
                    label: {
                        text: `Spot: ₹${this.spotPrice.toLocaleString()}`,
                        align: 'center',
                        style: {
                            color: '#000000',
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            padding: '4px',
                            borderRadius: '4px'
                        }
                    },
                    zIndex: 5
                }],
                gridLineWidth: 1,
                gridLineColor: '#e6e6e6'
            },
            yAxis: {
                title: {
                    text: 'Net P&L (₹)',
                    style: { fontWeight: 'bold' }
                },
                labels: {
                    formatter: function() {
                        return '₹' + this.value.toLocaleString();
                    }
                },
                plotLines: [{
                    color: '#333333',
                    width: 2,
                    value: 0,
                    dashStyle: 'Dash',
                    label: {
                        text: 'Breakeven',
                        align: 'right',
                        style: {
                            color: '#333333',
                            fontWeight: 'bold'
                        }
                    }
                }],
                gridLineWidth: 1,
                gridLineColor: '#e6e6e6'
            },
            tooltip: {
                shared: true,
                crosshairs: true,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#cccccc',
                borderRadius: 8,
                shadow: true,
                formatter: function() {
                    let tooltip = `<b>Underlying Price: ₹${this.x.toLocaleString()}</b><br/>`;
                    
                    this.points.forEach(point => {
                        const color = point.series.color;
                        const value = point.y;
                        const valueColor = value >= 0 ? '#28a745' : '#dc3545';
                        tooltip += `<span style="color:${color}">●</span> ${point.series.name}: <span style="color:${valueColor}; font-weight:bold;">₹${value.toLocaleString()}</span><br/>`;
                    });
                    
                    return tooltip;
                }
            },
            legend: {
                enabled: true,
                align: 'center',
                verticalAlign: 'top',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#cccccc',
                borderWidth: 1,
                borderRadius: 5,
                shadow: true,
                itemStyle: {
                    fontWeight: 'normal'
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
                    },
                    states: {
                        hover: {
                            lineWidth: 4
                        }
                    }
                },
                series: {
                    animation: {
                        duration: 1000
                    }
                }
            },
            credits: {
                enabled: false
            },
            exporting: {
                enabled: true,
                buttons: {
                    contextButton: {
                        menuItems: [
                            'viewFullscreen',
                            'separator',
                            'downloadPNG',
                            'downloadJPEG',
                            'downloadPDF',
                            'downloadSVG'
                        ]
                    }
                }
            },
            series: [{
                name: 'Total P&L',
                data: [],
                color: '#007bff',
                zones: [{
                    value: 0,
                    color: '#dc3545'
                }, {
                    color: '#28a745'
                }]
            }]
        };

        // Create chart container if it doesn't exist
        if (!document.getElementById(this.chartContainer)) {
            this.createChartContainer();
        }

        this.chart = Highcharts.chart(this.chartContainer, chartOptions);
        
        // Initial empty state
        this.showEmptyState();
    }

    createChartContainer() {
        // Find the payoff chart card body
        const payoffCard = document.querySelector('#payoffChartContent');
        if (payoffCard) {
            const container = document.createElement('div');
            container.id = this.chartContainer;
            container.style.width = '100%';
            container.style.height = '400px';
            container.style.marginTop = '20px';
            
            // Clear existing content and add new container
            payoffCard.innerHTML = '';
            payoffCard.appendChild(container);
        }
    }

    handlePositionsUpdate(data) {
        this.currentPositions = data.positions || [];
        this.spotPrice = data.spotPrice || this.spotPrice;
        this.strikes = data.strikes || [];
        
        if (this.chart) {
            this.updateChart();
        }
    }

    updateChart() {
        if (!this.chart || this.currentPositions.length === 0) {
            this.showEmptyState();
            return;
        }

        // Calculate payoff data
        const payoffData = this.calculatePayoffData();
        
        // Update chart series
        this.chart.series[0].setData(payoffData.totalPayoff, true);
        
        // Update individual position series if they exist
        this.updatePositionSeries(payoffData.positionPayoffs);
        
        // Update spot price line
        this.updateSpotPriceLine();
        
        // Update chart title with position summary
        this.updateChartTitle();
    }

    calculatePayoffData() {
        if (this.currentPositions.length === 0) {
            return { totalPayoff: [], positionPayoffs: [] };
        }

        // Determine price range for payoff calculation
        const strikeList = this.currentPositions.map(p => p.strike);
        const minStrike = Math.min(...strikeList);
        const maxStrike = Math.max(...strikeList);
        
        // Extend range by 20% on each side
        const range = maxStrike - minStrike;
        const startPrice = Math.max(0, minStrike - range * 0.3);
        const endPrice = maxStrike + range * 0.3;
        
        const totalPayoff = [];
        const positionPayoffs = [];
        
        // Initialize position payoff arrays
        this.currentPositions.forEach((position, index) => {
            positionPayoffs[index] = [];
        });

        // Calculate payoff for each price point
        for (let price = startPrice; price <= endPrice; price += Math.max(10, range / 100)) {
            let totalPnL = 0;
            
            this.currentPositions.forEach((position, index) => {
                const positionPnL = this.calculatePositionPayoff(position, price);
                totalPnL += positionPnL;
                positionPayoffs[index].push([price, positionPnL]);
            });
            
            totalPayoff.push([price, totalPnL]);
        }

        return { totalPayoff, positionPayoffs };
    }

    calculatePositionPayoff(position, underlyingPrice) {
        const strike = position.strike;
        const optionType = position.optionType;
        const action = position.action;
        const lots = position.lots;
        const entryPrice = position.entryPrice;
        const lotSize = window.positionManager ? window.positionManager.lotSize : 75;

        // Calculate intrinsic value
        let intrinsicValue = 0;
        if (optionType === 'CE') {
            intrinsicValue = Math.max(0, underlyingPrice - strike);
        } else if (optionType === 'PE') {
            intrinsicValue = Math.max(0, strike - underlyingPrice);
        }

        // Calculate option value (simplified - using intrinsic value only)
        const optionValue = intrinsicValue;
        
        // Calculate P&L
        const priceDiff = optionValue - entryPrice;
        const multiplier = action === 'BUY' ? 1 : -1;
        
        return priceDiff * multiplier * lots * lotSize;
    }

    updatePositionSeries(positionPayoffs) {
        // Remove existing position series (keep only total P&L series)
        while (this.chart.series.length > 1) {
            this.chart.series[this.chart.series.length - 1].remove(false);
        }

        // Add individual position series
        this.currentPositions.forEach((position, index) => {
            if (positionPayoffs[index]) {
                const seriesName = `${position.strike} ${position.optionType} ${position.action}`;
                const color = this.getPositionColor(position, index);
                
                this.chart.addSeries({
                    name: seriesName,
                    data: positionPayoffs[index],
                    color: color,
                    dashStyle: 'Dash',
                    lineWidth: 2,
                    visible: false // Hidden by default, can be toggled in legend
                }, false);
            }
        });

        this.chart.redraw();
    }

    getPositionColor(position, index) {
        const colors = ['#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
        return colors[index % colors.length];
    }

    updateSpotPriceLine() {
        if (!this.chart) return;

        // Remove existing spot price line
        this.chart.xAxis[0].removePlotLine('spot-price-line');
        
        // Add new spot price line
        this.chart.xAxis[0].addPlotLine({
            id: 'spot-price-line',
            color: '#FF6B6B',
            width: 3,
            value: this.spotPrice,
            dashStyle: 'Solid',
            label: {
                text: `Spot: ₹${this.spotPrice.toLocaleString()}`,
                align: 'center',
                rotation: 0,
                style: {
                    color: '#000000',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '4px',
                    borderRadius: '4px'
                }
            },
            zIndex: 5
        });
    }

    updateChartTitle() {
        if (!this.chart) return;

        const positionCount = this.currentPositions.length;
        const totalPnL = this.calculateCurrentTotalPnL();
        const pnlColor = totalPnL >= 0 ? '#28a745' : '#dc3545';
        
        this.chart.setTitle({
            text: `Options Payoff Chart (${positionCount} Position${positionCount !== 1 ? 's' : ''})`,
            style: {
                fontSize: '16px',
                fontWeight: 'bold'
            }
        }, {
            text: `Current P&L: <span style="color: ${pnlColor}; font-weight: bold;">₹${totalPnL.toLocaleString()}</span>`,
            useHTML: true
        });
    }

    calculateCurrentTotalPnL() {
        return this.currentPositions.reduce((total, position) => {
            return total + this.calculatePositionPayoff(position, this.spotPrice);
        }, 0);
    }

    updateSpotPrice(newSpotPrice) {
        this.spotPrice = newSpotPrice;
        if (this.chart) {
            this.updateSpotPriceLine();
            this.updateChartTitle();
        }
    }

    showEmptyState() {
        if (!this.chart) return;

        this.chart.series[0].setData([], true);
        
        this.chart.setTitle({
            text: 'Options Payoff Chart',
            style: {
                fontSize: '16px',
                fontWeight: 'bold'
            }
        }, {
            text: 'Add positions by clicking Buy/Sell buttons in the option chain',
            style: {
                color: '#666666',
                fontSize: '14px'
            }
        });
    }

    updateChartConfig(config) {
        if (!this.chart) return;

        // Update chart configuration based on user preferences
        if (config.height) {
            this.chart.setSize(null, config.height);
        }
        
        if (config.backgroundColor) {
            this.chart.update({
                chart: {
                    backgroundColor: config.backgroundColor
                }
            });
        }
    }

    // Public methods for external access
    exportChart() {
        if (this.chart) {
            this.chart.exportChart({
                type: 'image/png',
                filename: `payoff-chart-${new Date().toISOString().split('T')[0]}`
            });
        }
    }

    fullscreen() {
        if (this.chart) {
            this.chart.fullscreen.toggle();
        }
    }

    resetZoom() {
        if (this.chart) {
            this.chart.zoomOut();
        }
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Initialize payoff chart integration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Highcharts to be available
    function initWhenReady() {
        if (typeof Highcharts !== 'undefined') {
            window.payoffChartIntegration = new PayoffChartIntegration();
        } else {
            setTimeout(initWhenReady, 100);
        }
    }
    initWhenReady();
});

// Export for other modules
window.PayoffChartIntegration = PayoffChartIntegration;