/**
 * Option Price Microchart Component
 * Creates interactive sparkline charts for option price trends
 */

class OptionMicroChart {
    constructor(symbol, containerId, options = {}) {
        this.symbol = symbol;
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.data = [];
        this.timestamps = [];
        
        // Chart configuration
        this.config = {
            width: options.width || 50,
            height: options.height || 20,
            strokeWidth: options.strokeWidth || 1.5,
            upColor: options.upColor || '#22c55e',
            downColor: options.downColor || '#ef4444',
            neutralColor: options.neutralColor || '#6b7280',
            ...options
        };
        
        this.isLoading = false;
        this.hasError = false;
    }

    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const response = await fetch(`/api/option_history/${encodeURIComponent(this.symbol)}`);
            const result = await response.json();
            
            if (response.ok) {
                this.data = result.prices || [];
                this.timestamps = result.timestamps || [];
                this.hasError = false;
                
                // Check if we have valid data
                if (this.data.length > 0) {
                    this.renderChart();
                } else {
                    // No data available, show appropriate indicator
                    this.showNoData();
                }
            } else {
                this.hasError = true;
                this.showError(result.error || 'Failed to load data');
            }
        } catch (error) {
            this.hasError = true;
            this.showError('Network error');
            console.error('Microchart error:', error);
        } finally {
            this.isLoading = false;
        }
    }

    renderChart() {
        if (!this.container || this.data.length < 2) {
            this.showNoData();
            return;
        }

        const { width, height, strokeWidth } = this.config;
        
        // Calculate trend direction
        const firstPrice = this.data[0];
        const lastPrice = this.data[this.data.length - 1];
        const isUp = lastPrice > firstPrice;
        const isFlat = Math.abs(lastPrice - firstPrice) < (firstPrice * 0.001); // Less than 0.1% change
        
        // Choose color based on trend
        let strokeColor = this.config.neutralColor;
        if (!isFlat) {
            strokeColor = isUp ? this.config.upColor : this.config.downColor;
        }
        
        // Create SVG path
        const svgPath = this.createSVGPath();
        
        // Create SVG element
        this.container.innerHTML = `
            <svg width="${width}" height="${height}" class="option-microchart" data-symbol="${this.symbol}">
                <path d="${svgPath}" 
                      fill="none" 
                      stroke="${strokeColor}" 
                      stroke-width="${strokeWidth}" 
                      stroke-linecap="round"
                      stroke-linejoin="round"/>
            </svg>
        `;
        
        // Add hover functionality
        this.addHoverEffects();
    }

    createSVGPath() {
        if (this.data.length < 2) return '';
        
        const { width, height } = this.config;
        const margin = 2;
        const chartWidth = width - (margin * 2);
        const chartHeight = height - (margin * 2);
        
        // Find min/max for scaling
        const minPrice = Math.min(...this.data);
        const maxPrice = Math.max(...this.data);
        const priceRange = maxPrice - minPrice || 1; // Avoid division by zero
        
        // Create path points
        let path = '';
        
        this.data.forEach((price, index) => {
            const x = margin + (index / (this.data.length - 1)) * chartWidth;
            const y = margin + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
            
            if (index === 0) {
                path += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
            } else {
                path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
            }
        });
        
        return path;
    }

    addHoverEffects() {
        const svg = this.container.querySelector('svg');
        if (!svg) return;
        
        svg.addEventListener('mouseenter', () => {
            this.showTooltip();
        });
        
        svg.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
        
        // Add click event for detailed popup
        svg.addEventListener('click', () => {
            if (window.chartPopup) {
                window.chartPopup.show(this.symbol, this.containerId);
            }
        });
        
        // Add cursor pointer style
        svg.style.cursor = 'pointer';
    }

    showTooltip() {
        if (this.data.length < 2) return;
        
        const firstPrice = this.data[0];
        const lastPrice = this.data[this.data.length - 1];
        const change = lastPrice - firstPrice;
        const changePercent = ((change / firstPrice) * 100);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'microchart-tooltip';
        tooltip.innerHTML = `
            <div class="font-weight-bold">${this.symbol.split(':')[1] || this.symbol}</div>
            <div>Change: ${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)</div>
            <div>Points: ${this.data.length}</div>
        `;
        
        document.body.appendChild(tooltip);
        this.tooltip = tooltip;
        
        // Position tooltip
        this.positionTooltip();
    }

    positionTooltip() {
        if (!this.tooltip || !this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let left = rect.left + rect.width + 10;
        let top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        
        // Adjust if tooltip goes off screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = rect.left - tooltipRect.width - 10;
        }
        
        if (top < 0) top = 10;
        if (top + tooltipRect.height > window.innerHeight) {
            top = window.innerHeight - tooltipRect.height - 10;
        }
        
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }

    showLoading() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="microchart-loading" style="width: ${this.config.width}px; height: ${this.config.height}px;">
                <div class="spinner-border spinner-border-sm text-muted" role="status" style="width: 12px; height: 12px;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    showError(message) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="microchart-error text-muted" style="width: ${this.config.width}px; height: ${this.config.height}px; font-size: 8px;" title="${message}">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
        `;
    }

    showNoData() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="microchart-nodata d-flex align-items-center justify-content-center" style="width: ${this.config.width}px; height: ${this.config.height}px; font-size: 10px; color: #6c757d;" title="No chart data available">
                <i class="fas fa-chart-line" style="opacity: 0.3;"></i>
            </div>
        `;
    }

    // Public method to refresh data
    async refresh() {
        await this.loadData();
    }

    // Cleanup method
    destroy() {
        this.hideTooltip();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

/**
 * Microchart Manager - handles multiple microcharts
 */
class MicroChartManager {
    constructor() {
        this.charts = new Map();
        this.batchSize = 10;
        this.refreshInterval = 300000; // 5 minutes
        this.refreshTimer = null;
    }

    addChart(symbol, containerId, options = {}) {
        const chart = new OptionMicroChart(symbol, containerId, options);
        this.charts.set(symbol, chart);
        return chart;
    }

    async loadAllCharts() {
        const symbols = Array.from(this.charts.keys());
        
        // Load charts in batches to avoid overwhelming the server
        for (let i = 0; i < symbols.length; i += this.batchSize) {
            const batch = symbols.slice(i, i + this.batchSize);
            const promises = batch.map(symbol => {
                const chart = this.charts.get(symbol);
                return chart ? chart.loadData() : Promise.resolve();
            });
            
            await Promise.allSettled(promises);
            
            // Small delay between batches
            if (i + this.batchSize < symbols.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    async refreshAllCharts() {
        await this.loadAllCharts();
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            this.refreshAllCharts();
        }, this.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    removeChart(symbol) {
        const chart = this.charts.get(symbol);
        if (chart) {
            chart.destroy();
            this.charts.delete(symbol);
        }
    }

    clearAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        this.stopAutoRefresh();
    }

    getChart(symbol) {
        return this.charts.get(symbol);
    }
}

// Global instance
window.microChartManager = new MicroChartManager();

// CSS styles for microcharts
const microchartStyles = `
<style>
.option-microchart {
    cursor: pointer;
    transition: opacity 0.2s;
}

.option-microchart:hover {
    opacity: 0.8;
}

.microchart-loading,
.microchart-error,
.microchart-nodata {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e5e7eb;
    border-radius: 2px;
    background-color: #f9fafb;
}

.microchart-tooltip {
    position: absolute;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 11px;
    line-height: 1.4;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    max-width: 200px;
}

.microchart-cell {
    padding: 2px !important;
    text-align: center;
    vertical-align: middle;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', microchartStyles);