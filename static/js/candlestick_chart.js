/**
 * Candlestick Chart Component with Support/Resistance Levels
 * Uses Highcharts for professional candlestick visualization
 */
class CandlestickChart {
    constructor() {
        this.currentSymbol = null;
        this.currentTimeframe = '1';
        this.supportResistanceEnabled = true;
        this.chart = null;
        this.modal = null;
        this.isVisible = false;
    }

    async show(symbol) {
        console.log('Opening candlestick chart for symbol:', symbol);
        this.currentSymbol = symbol;
        
        // Wait for DOM elements to be available
        const modalElement = document.getElementById('candlestickModal');
        const titleElement = document.getElementById('chartSymbolTitle');
        
        if (!modalElement) {
            console.error('Candlestick modal element not found - modal may not be loaded yet');
            return;
        }
        
        // Update title if element exists
        if (titleElement) {
            titleElement.textContent = `${symbol} - Chart Analysis`;
        }
        
        // Setup event listeners first
        this.setupEventListeners();
        
        // Show modal with proper initialization
        try {
            // Check if bootstrap is available
            if (typeof bootstrap !== 'undefined') {
                console.log('Using Bootstrap modal');
                this.modal = new bootstrap.Modal(modalElement);
                this.modal.show();
            } else {
                console.log('Using manual modal display');
                // Fallback: manually show modal
                modalElement.classList.add('show');
                modalElement.style.display = 'block';
                document.body.classList.add('modal-open');
                
                // Create backdrop
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                backdrop.id = 'candlestick-backdrop';
                document.body.appendChild(backdrop);
            }
            this.isVisible = true;
            
            // Load initial chart with delay to ensure modal is visible
            setTimeout(async () => {
                await this.loadChart();
            }, 100);
            
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    }

    setupEventListeners() {
        // Timeframe change
        document.querySelectorAll('input[name="timeframe"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentTimeframe = e.target.value;
                this.loadChart();
            });
        });
        
        // Support/Resistance toggle
        document.getElementById('supportResistanceToggle').addEventListener('change', (e) => {
            this.supportResistanceEnabled = e.target.checked;
            if (this.chart) {
                this.updateSupportResistance();
            }
        });
        
        // Modal close button event
        const closeButton = document.querySelector('#candlestickModal .btn-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Modal hidden event (Bootstrap)
        const modalElement = document.getElementById('candlestickModal');
        modalElement.addEventListener('hidden.bs.modal', () => {
            this.isVisible = false;
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    async loadChart() {
        this.showLoading();
        
        try {
            // Fetch historical data with current timeframe
            console.log(`Loading chart data for ${this.currentSymbol} with resolution ${this.currentTimeframe}`);
            const response = await fetch(`/api/option_history/${encodeURIComponent(this.currentSymbol)}?resolution=${this.currentTimeframe}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Chart data received:', {
                symbol: data.symbol,
                count: data.count,
                hasTimestamps: !!data.timestamps,
                hasPrices: !!data.prices,
                timestampsLength: data.timestamps?.length,
                pricesLength: data.prices?.length
            });
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.count > 0 && data.timestamps && data.prices) {
                this.renderChart(data);
            } else {
                this.showNoData();
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showError(`Failed to load chart data: ${error.message}`);
            this.hideLoading();
        }
    }

    renderChart(data) {
        // Use real OHLC data from the API
        let candlestickData = [];
        let volumeData = [];
        
        if (data.ohlc_data && data.ohlc_data.length > 0) {
            // Use real OHLC data: [timestamp_ms, open, high, low, close, volume]
            candlestickData = data.ohlc_data.map(candle => [
                candle[0], // timestamp (already in milliseconds)
                candle[1], // open
                candle[2], // high
                candle[3], // low
                candle[4]  // close
            ]);
            
            volumeData = data.ohlc_data.map(candle => [
                candle[0], // timestamp
                candle[5] || 1000  // volume (fallback to 1000 if not available)
            ]);
        } else {
            // Fallback: create OHLC from price data (for compatibility)
            for (let i = 0; i < data.timestamps.length; i++) {
                const timestamp = data.timestamps[i] * 1000;
                const price = data.prices[i];
                const open = i > 0 ? data.prices[i-1] : price;
                const high = Math.max(open, price) * 1.002;
                const low = Math.min(open, price) * 0.998;
                const close = price;
                
                candlestickData.push([timestamp, open, high, low, close]);
                volumeData.push([timestamp, 1000]);
            }
        }

        // Calculate support and resistance levels
        const supportResistanceLevels = this.calculateSupportResistance(data.prices);
        console.log('Support/Resistance levels:', supportResistanceLevels);

        // Chart configuration for Highcharts Stock
        const chartConfig = {
            chart: {
                height: '100%',
                backgroundColor: 'transparent',
                style: {
                    fontFamily: 'var(--bs-font-sans-serif)'
                }
            },
            title: {
                text: `${this.currentSymbol} - ${this.getTimeframeName()} Chart`,
                style: {
                    color: 'var(--bs-body-color)',
                    fontSize: '16px'
                }
            },
            xAxis: {
                type: 'datetime',
                labels: {
                    style: {
                        color: 'var(--bs-body-color)'
                    },
                    formatter: function() {
                        return Highcharts.dateFormat('%H:%M<br/>%d %b', this.value);
                    }
                },
                gridLineColor: 'var(--bs-border-color)',
                crosshair: true
            },
            yAxis: [{
                title: {
                    text: 'Price',
                    style: {
                        color: 'var(--bs-body-color)'
                    }
                },
                labels: {
                    style: {
                        color: 'var(--bs-body-color)'
                    }
                },
                gridLineColor: 'var(--bs-border-color)',
                height: '70%'
            }, {
                title: {
                    text: 'Volume',
                    style: {
                        color: 'var(--bs-body-color)'
                    }
                },
                labels: {
                    style: {
                        color: 'var(--bs-body-color)'
                    }
                },
                top: '75%',
                height: '25%',
                offset: 0
            }],
            plotOptions: {
                candlestick: {
                    color: '#dc3545', // Red for bearish
                    upColor: '#198754', // Green for bullish
                    lineColor: '#dc3545',
                    upLineColor: '#198754'
                },
                column: {
                    color: 'rgba(108, 117, 125, 0.5)'
                }
            },
            tooltip: {
                backgroundColor: 'var(--bs-body-bg)',
                borderColor: 'var(--bs-border-color)',
                style: {
                    color: 'var(--bs-body-color)'
                },
                shared: true,
                formatter: function() {
                    let tooltip = '<b>' + Highcharts.dateFormat('%A, %b %e, %Y %H:%M', this.x) + '</b><br/>';
                    
                    this.points.forEach(function(point) {
                        if (point.series.type === 'candlestick') {
                            tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}<br/>`;
                            tooltip += `Open: <b>${point.point.open.toFixed(2)}</b><br/>`;
                            tooltip += `High: <b>${point.point.high.toFixed(2)}</b><br/>`;
                            tooltip += `Low: <b>${point.point.low.toFixed(2)}</b><br/>`;
                            tooltip += `Close: <b>${point.point.close.toFixed(2)}</b><br/>`;
                        } else if (point.series.type === 'column') {
                            tooltip += `<span style="color:${point.color}">●</span> Volume: <b>${point.y.toLocaleString()}</b><br/>`;
                        }
                    });
                    
                    return tooltip;
                }
            },
            legend: {
                enabled: false
            },
            series: [{
                type: 'candlestick',
                name: this.currentSymbol,
                data: candlestickData,
                yAxis: 0
            }, {
                type: 'column',
                name: 'Volume',
                data: volumeData,
                yAxis: 1
            }],
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 768
                    },
                    chartOptions: {
                        title: {
                            style: {
                                fontSize: '14px'
                            }
                        }
                    }
                }]
            }
        };

        // Add support/resistance levels if enabled
        if (this.supportResistanceEnabled) {
            chartConfig.yAxis[0].plotLines = this.createSupportResistancePlotLines(supportResistanceLevels);
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        this.chart = Highcharts.stockChart('candlestickChart', chartConfig);
        
        // Hide loading after chart is created
        this.hideLoading();
    }

    calculateSupportResistance(prices) {
        if (prices.length < 10) return { support: [], resistance: [] };
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const currentPrice = prices[prices.length - 1];
        
        // Simple, reliable approach - always create both support and resistance
        const supportLevels = [];
        const resistanceLevels = [];
        
        // Method 1: Calculate based on price distribution
        const priceRange = maxPrice - minPrice;
        const buckets = {};
        const bucketSize = priceRange / 20;
        
        prices.forEach(price => {
            const bucket = Math.floor((price - minPrice) / bucketSize);
            buckets[bucket] = (buckets[bucket] || 0) + 1;
        });
        
        // Find significant levels
        const threshold = Math.max(3, prices.length * 0.03);
        Object.entries(buckets).forEach(([bucket, count]) => {
            if (count >= threshold) {
                const level = minPrice + (parseInt(bucket) * bucketSize) + (bucketSize / 2);
                if (level < currentPrice * 0.998) {
                    supportLevels.push(level);
                } else if (level > currentPrice * 1.002) {
                    resistanceLevels.push(level);
                }
            }
        });
        
        // Method 2: Always ensure we have at least 2 support and 2 resistance levels
        // Add technical levels based on price ranges
        const lowSupport = minPrice + (priceRange * 0.2);
        const midSupport = minPrice + (priceRange * 0.4);
        const midResistance = minPrice + (priceRange * 0.6);
        const highResistance = minPrice + (priceRange * 0.8);
        
        if (lowSupport < currentPrice && !supportLevels.includes(lowSupport)) {
            supportLevels.push(lowSupport);
        }
        if (midSupport < currentPrice && !supportLevels.includes(midSupport)) {
            supportLevels.push(midSupport);
        }
        if (midResistance > currentPrice && !resistanceLevels.includes(midResistance)) {
            resistanceLevels.push(midResistance);
        }
        if (highResistance > currentPrice && !resistanceLevels.includes(highResistance)) {
            resistanceLevels.push(highResistance);
        }
        
        // Sort and return top 3 of each
        supportLevels.sort((a, b) => b - a); // Highest support first
        resistanceLevels.sort((a, b) => a - b); // Lowest resistance first
        
        return {
            support: supportLevels.slice(0, 3),
            resistance: resistanceLevels.slice(0, 3)
        };
    }

    createSupportResistancePlotLines(levels) {
        const plotLines = [];
        
        // Support levels (green)
        levels.support.forEach((level, index) => {
            plotLines.push({
                color: 'rgba(25, 135, 84, 0.8)',
                width: 2,
                value: level,
                dashStyle: 'dash',
                label: {
                    text: `Support ${index + 1}: ${level.toFixed(2)}`,
                    style: {
                        color: '#198754',
                        fontSize: '10px'
                    }
                }
            });
        });
        
        // Resistance levels (red)
        levels.resistance.forEach((level, index) => {
            plotLines.push({
                color: 'rgba(220, 53, 69, 0.8)',
                width: 2,
                value: level,
                dashStyle: 'dash',
                label: {
                    text: `Resistance ${index + 1}: ${level.toFixed(2)}`,
                    style: {
                        color: '#dc3545',
                        fontSize: '10px'
                    }
                }
            });
        });
        
        return plotLines;
    }

    updateSupportResistance() {
        if (!this.chart) return;
        
        const yAxis = this.chart.yAxis[0];
        
        if (this.supportResistanceEnabled) {
            // Re-fetch data and recalculate levels
            this.loadChart();
        } else {
            // Remove all plot lines
            while (yAxis.plotLinesAndBands.length > 0) {
                yAxis.removePlotLine(yAxis.plotLinesAndBands[0].id);
            }
        }
    }

    getTimeframeName() {
        const timeframes = {
            '1': '1 Minute',
            '3': '3 Minutes',
            '5': '5 Minutes',
            '15': '15 Minutes',
            '60': '1 Hour',
            'D': 'Daily',
            'W': 'Weekly',
            'M': 'Monthly'
        };
        return timeframes[this.currentTimeframe] || this.currentTimeframe;
    }

    showLoading() {
        const loader = document.getElementById('chartLoading');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoading() {
        const loader = document.getElementById('chartLoading');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showError(message) {
        const container = document.getElementById('candlestickChart');
        container.innerHTML = `
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-warning mb-3" style="font-size: 48px;"></i>
                    <h5>Chart Error</h5>
                    <p class="text-muted">${message}</p>
                    <button class="btn btn-primary btn-sm" onclick="refreshCandlestickChart()">
                        <i class="fas fa-refresh me-1"></i>Retry
                    </button>
                </div>
            </div>
        `;
    }

    showNoData() {
        const container = document.getElementById('candlestickChart');
        container.innerHTML = `
            <div class="d-flex justify-content-center align-items-center h-100">
                <div class="text-center">
                    <i class="fas fa-chart-line text-muted mb-3" style="font-size: 48px;"></i>
                    <h5>No Chart Data</h5>
                    <p class="text-muted">No historical data available for this symbol</p>
                </div>
            </div>
        `;
    }

    async refresh() {
        if (this.isVisible && this.currentSymbol) {
            await this.loadChart();
        }
    }

    hide() {
        if (this.modal && typeof this.modal.hide === 'function') {
            this.modal.hide();
        } else {
            // Manual hide for fallback
            const modalElement = document.getElementById('candlestickModal');
            if (modalElement) {
                modalElement.classList.remove('show');
                modalElement.style.display = 'none';
                document.body.classList.remove('modal-open');
                
                // Remove backdrop
                const backdrop = document.getElementById('candlestick-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            }
        }
        this.isVisible = false;
        
        // Destroy chart
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Load Highcharts library and initialize chart component
function loadHighcharts() {
    if (window.Highcharts) {
        // Highcharts already loaded
        window.candlestickChart = new CandlestickChart();
        return;
    }

    // Load Highcharts from CDN
    const script1 = document.createElement('script');
    script1.src = 'https://code.highcharts.com/stock/highstock.js';
    script1.onload = function() {
        const script2 = document.createElement('script');
        script2.src = 'https://code.highcharts.com/modules/accessibility.js';
        script2.onload = function() {
            // Initialize chart component
            window.candlestickChart = new CandlestickChart();
        };
        document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
}

// Auto-load when script is included
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHighcharts);
} else {
    loadHighcharts();
}