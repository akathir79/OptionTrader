/**
 * Chart Popup Component
 * Creates a detailed chart popup when clicking on microcharts
 */

class ChartPopup {
    constructor() {
        this.popup = null;
        this.chart = null;
        this.isVisible = false;
        this.currentSymbol = null;
        this.currentData = null;
        
        this.init();
    }
    
    init() {
        this.createPopupHTML();
        this.setupEventListeners();
    }
    
    createPopupHTML() {
        // Create popup overlay
        this.popup = document.createElement('div');
        this.popup.className = 'chart-popup-overlay';
        this.popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
        `;
        
        // Create popup container
        const container = document.createElement('div');
        container.className = 'chart-popup-container';
        container.style.cssText = `
            background: var(--bs-dark);
            border: 1px solid var(--bs-border-color);
            border-radius: 8px;
            width: 90%;
            max-width: 800px;
            height: 80%;
            max-height: 600px;
            padding: 20px;
            position: relative;
        `;
        
        container.innerHTML = `
            <div class="popup-header d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h5 class="mb-1" id="popup-symbol">Option Price Chart</h5>
                    <small class="text-muted" id="popup-details">Loading...</small>
                </div>
                <button type="button" class="btn-close btn-close-white" id="popup-close"></button>
            </div>
            <div class="popup-content">
                <div id="detailed-chart" style="width: 100%; height: 400px;"></div>
                <div class="mt-3">
                    <div class="row text-center">
                        <div class="col-3">
                            <small class="text-muted">Current Price</small>
                            <div class="fw-bold" id="popup-current-price">-</div>
                        </div>
                        <div class="col-3">
                            <small class="text-muted">Day Change</small>
                            <div class="fw-bold" id="popup-day-change">-</div>
                        </div>
                        <div class="col-3">
                            <small class="text-muted">High</small>
                            <div class="fw-bold" id="popup-high">-</div>
                        </div>
                        <div class="col-3">
                            <small class="text-muted">Low</small>
                            <div class="fw-bold" id="popup-low">-</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.popup.appendChild(container);
        document.body.appendChild(this.popup);
    }
    
    setupEventListeners() {
        // Close popup events
        const closeBtn = this.popup.querySelector('#popup-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Close on overlay click
        this.popup.addEventListener('click', (e) => {
            if (e.target === this.popup) {
                this.hide();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    async show(symbol, containerId) {
        this.currentSymbol = symbol;
        this.isVisible = true;
        
        // Show popup
        this.popup.style.display = 'flex';
        
        // Update header
        document.getElementById('popup-symbol').textContent = symbol;
        document.getElementById('popup-details').textContent = 'Loading chart data...';
        
        // Load detailed chart data
        await this.loadDetailedChart(symbol);
    }
    
    async loadDetailedChart(symbol) {
        try {
            // Fetch historical data
            const response = await fetch(`/api/option_history/${encodeURIComponent(symbol)}`);
            const data = await response.json();
            
            if (!data.prices || !data.timestamps) {
                throw new Error('Invalid data format');
            }
            
            this.currentData = data;
            this.renderDetailedChart(data);
            this.updateStats(data);
            
        } catch (error) {
            console.error('Error loading detailed chart:', error);
            document.getElementById('popup-details').textContent = 'Error loading chart data';
        }
    }
    
    renderDetailedChart(data) {
        const container = document.getElementById('detailed-chart');
        
        // Prepare chart data
        const chartData = data.timestamps.map((timestamp, index) => [
            timestamp * 1000, // Convert to milliseconds
            data.prices[index]
        ]);
        
        // Create Highcharts chart
        this.chart = Highcharts.chart(container, {
            chart: {
                type: 'line',
                backgroundColor: 'transparent',
                height: 400
            },
            title: {
                text: null
            },
            xAxis: {
                type: 'datetime',
                gridLineColor: 'rgba(255, 255, 255, 0.1)',
                lineColor: 'rgba(255, 255, 255, 0.3)',
                tickColor: 'rgba(255, 255, 255, 0.3)',
                labels: {
                    style: {
                        color: '#fff'
                    }
                }
            },
            yAxis: {
                title: {
                    text: 'Price',
                    style: {
                        color: '#fff'
                    }
                },
                gridLineColor: 'rgba(255, 255, 255, 0.1)',
                lineColor: 'rgba(255, 255, 255, 0.3)',
                labels: {
                    style: {
                        color: '#fff'
                    }
                }
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                line: {
                    animation: true,
                    lineWidth: 2,
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true,
                                radius: 4
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Price',
                data: chartData,
                color: '#28a745',
                fillOpacity: 0.3
            }],
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderColor: '#fff',
                style: {
                    color: '#fff'
                },
                formatter: function() {
                    return `<b>Price: ₹${this.y.toFixed(2)}</b><br/>
                            ${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}`;
                }
            },
            credits: {
                enabled: false
            }
        });
        
        document.getElementById('popup-details').textContent = `${data.count} data points • Last updated: ${new Date().toLocaleTimeString()}`;
    }
    
    updateStats(data) {
        const prices = data.prices;
        const currentPrice = prices[prices.length - 1];
        const previousPrice = prices[prices.length - 2];
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        
        // Current price
        document.getElementById('popup-current-price').textContent = `₹${currentPrice.toFixed(2)}`;
        
        // Day change
        const change = currentPrice - previousPrice;
        const changePercent = ((change / previousPrice) * 100);
        const changeElement = document.getElementById('popup-day-change');
        changeElement.textContent = `₹${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
        changeElement.className = `fw-bold ${change >= 0 ? 'text-success' : 'text-danger'}`;
        
        // High/Low
        document.getElementById('popup-high').textContent = `₹${high.toFixed(2)}`;
        document.getElementById('popup-low').textContent = `₹${low.toFixed(2)}`;
    }
    
    hide() {
        this.isVisible = false;
        this.popup.style.display = 'none';
        
        // Destroy chart to prevent memory leaks
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Global popup instance
window.chartPopup = new ChartPopup();