// Working Payoff Chart System - Simplified but effective
console.log('📊 Payoff Charts: Starting initialization...');

// Chart creation function
function createPayoffChart(canvas, strategyName, isDetailed = false) {
    console.log(`📊 Creating chart for: ${strategyName}`);
    
    // Generate educational payoff data based on strategy name
    const data = generatePayoffData(strategyName);
    
    const config = {
        type: 'line',
        data: {
            labels: data.prices,
            datasets: [{
                label: 'Profit/Loss',
                data: data.profits,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: isDetailed ? 3 : 2,
                fill: true,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: isDetailed },
                tooltip: { enabled: isDetailed }
            },
            scales: {
                x: { 
                    display: isDetailed,
                    title: { display: isDetailed, text: 'Stock Price ($)' }
                },
                y: { 
                    display: isDetailed,
                    title: { display: isDetailed, text: 'Profit/Loss ($)' },
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
    
    try {
        new Chart(canvas, config);
        console.log(`✅ Chart created successfully for: ${strategyName}`);
        return true;
    } catch (error) {
        console.error(`❌ Chart creation failed for ${strategyName}:`, error);
        return false;
    }
}

// Generate educational payoff data based on strategy type
function generatePayoffData(strategyName) {
    const name = strategyName.toLowerCase();
    const prices = [];
    const profits = [];
    
    // Generate price range
    for (let i = 80; i <= 120; i += 2) {
        prices.push(i);
    }
    
    // Generate profits based on strategy pattern
    prices.forEach(price => {
        let profit = 0;
        const currentPrice = 100;
        
        if (name.includes('long call')) {
            profit = price > 105 ? (price - 105) - 5 : -5;
        } else if (name.includes('short call')) {
            profit = price > 105 ? 5 - (price - 105) : 5;
        } else if (name.includes('long put')) {
            profit = price < 95 ? (95 - price) - 5 : -5;
        } else if (name.includes('short put')) {
            profit = price < 95 ? 5 - (95 - price) : 5;
        } else if (name.includes('straddle') && name.includes('long')) {
            profit = Math.max(Math.abs(price - currentPrice) - 8, -8);
        } else if (name.includes('straddle') && name.includes('short')) {
            profit = Math.max(8 - Math.abs(price - currentPrice), -8);
        } else if (name.includes('iron condor')) {
            if (price >= 90 && price <= 110) {
                profit = 3;
            } else {
                profit = Math.max(3 - Math.abs(price - currentPrice) * 0.2, -2);
            }
        } else if (name.includes('iron butterfly')) {
            const distance = Math.abs(price - currentPrice);
            profit = distance <= 5 ? 5 - distance : -2;
        } else if (name.includes('bull') && name.includes('spread')) {
            profit = price > 103 ? Math.min(3, price - 103) : -2;
        } else if (name.includes('bear') && name.includes('spread')) {
            profit = price < 97 ? Math.min(3, 97 - price) : -2;
        } else if (name.includes('protective put')) {
            profit = (price - currentPrice) + Math.max(95 - price, 0) - 5;
        } else if (name.includes('covered call')) {
            profit = Math.min(price - currentPrice + 5, 10);
        } else if (name.includes('collar')) {
            profit = Math.max(Math.min(price - currentPrice + 2, 7), -8);
        } else if (name.includes('jade lizard') || name.includes('big lizard')) {
            if (price >= currentPrice) {
                profit = 4;
            } else {
                profit = Math.max(4 - (currentPrice - price) * 0.5, -10);
            }
        } else if (name.includes('backspread')) {
            const distance = Math.abs(price - currentPrice);
            if (distance < 5) {
                profit = -2;
            } else {
                profit = distance - 7;
            }
        } else if (name.includes('christmas tree')) {
            if (price >= 95 && price <= 105) {
                profit = 3;
            } else {
                profit = -1;
            }
        } else if (name.includes('broken wing')) {
            const distance = Math.abs(price - currentPrice);
            profit = distance <= 10 ? 2 - distance * 0.3 : -1;
        } else if (name.includes('diagonal')) {
            profit = Math.max((price - currentPrice) * 0.5 - 3, -3);
        } else if (name.includes('reverse iron condor')) {
            if (price < 90 || price > 110) {
                profit = 5;
            } else {
                profit = -3;
            }
        } else {
            // Default neutral strategy
            const distance = Math.abs(price - currentPrice);
            profit = 2 * Math.exp(-distance * 0.1);
        }
        
        profits.push(profit);
    });
    
    return { prices, profits };
}

// Get strategy analysis info
function getStrategyAnalysis(strategyName) {
    const name = strategyName.toLowerCase();
    
    let maxProfit = 'Variable';
    let maxLoss = 'Variable';
    let profitZone = 'Favorable market conditions';
    let lossZone = 'Unfavorable market conditions';
    
    if (name.includes('long call')) {
        maxProfit = 'Unlimited';
        maxLoss = '$5.00';
        profitZone = 'Stock price rises above $105';
        lossZone = 'Stock price below $105';
    } else if (name.includes('short call')) {
        maxProfit = '$5.00';
        maxLoss = 'Unlimited';
        profitZone = 'Stock price below $105';
        lossZone = 'Stock price rises above $105';
    } else if (name.includes('iron condor')) {
        maxProfit = '$3.00';
        maxLoss = '$2.00';
        profitZone = 'Stock price between $90-$110';
        lossZone = 'Stock price outside range';
    } else if (name.includes('straddle') && name.includes('long')) {
        maxProfit = 'Unlimited';
        maxLoss = '$8.00';
        profitZone = 'Large price movements';
        lossZone = 'Stock price remains stable';
    }
    
    return { maxProfit, maxLoss, profitZone, lossZone };
}

// Initialize charts when page loads
function initializePayoffCharts() {
    console.log('📊 Initializing payoff charts...');
    
    const canvases = document.querySelectorAll('.payoff-thumbnail');
    console.log(`📊 Found ${canvases.length} canvas elements`);
    
    canvases.forEach((canvas, index) => {
        const strategyName = canvas.getAttribute('data-strategy-name');
        if (strategyName) {
            const success = createPayoffChart(canvas, strategyName, false);
            if (success) {
                // Add click handler for modal
                canvas.style.cursor = 'pointer';
                canvas.addEventListener('click', () => showPayoffModal(strategyName));
            }
        } else {
            console.warn(`❌ No strategy name found for canvas ${index}`);
        }
    });
    
    console.log('📊 Chart initialization complete');
}

// Show modal with detailed chart
function showPayoffModal(strategyName) {
    console.log(`📊 Opening modal for: ${strategyName}`);
    
    const modal = document.getElementById('payoffModal');
    if (!modal) {
        console.error('❌ Modal not found');
        return;
    }
    
    // Update modal title
    const titleElement = document.getElementById('modalStrategyName');
    if (titleElement) {
        titleElement.textContent = strategyName;
    }
    
    // Clear previous chart
    const chartCanvas = document.getElementById('modalPayoffChart');
    if (chartCanvas) {
        const existingChart = Chart.getChart(chartCanvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        // Create detailed chart
        createPayoffChart(chartCanvas, strategyName, true);
    }
    
    // Update analysis
    const analysis = getStrategyAnalysis(strategyName);
    const analysisElement = document.getElementById('profitLossAnalysis');
    if (analysisElement) {
        analysisElement.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Maximum Profit</h6>
                    <span class="text-success">${analysis.maxProfit}</span>
                </div>
                <div class="col-md-6">
                    <h6>Maximum Loss</h6>
                    <span class="text-danger">${analysis.maxLoss}</span>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-6">
                    <h6>Profit Zone</h6>
                    <small class="text-muted">${analysis.profitZone}</small>
                </div>
                <div class="col-md-6">
                    <h6>Loss Zone</h6>
                    <small class="text-muted">${analysis.lossZone}</small>
                </div>
            </div>
        `;
    }
    
    // Show modal
    try {
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        console.log(`✅ Modal opened for: ${strategyName}`);
    } catch (error) {
        console.error('❌ Failed to open modal:', error);
    }
}

// Wait for everything to load
function waitForLibrariesAndInit() {
    if (typeof Chart !== 'undefined' && typeof bootstrap !== 'undefined') {
        console.log('✅ All libraries loaded');
        initializePayoffCharts();
    } else {
        console.log('⏳ Waiting for libraries to load...');
        setTimeout(waitForLibrariesAndInit, 500);
    }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 DOM loaded, starting chart system...');
    waitForLibrariesAndInit();
});

console.log('📊 Payoff Charts script loaded successfully');