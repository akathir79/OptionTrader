// Working Payoff Charts - Direct Canvas Drawing
function createPayoffCharts() {
    const canvases = document.querySelectorAll('.payoff-thumbnail');
    
    canvases.forEach((canvas, index) => {
        const strategyName = canvas.getAttribute('data-strategy-name') || 'Unknown Strategy';
        drawPayoffChart(canvas, strategyName);
    });
}

function drawPayoffChart(canvas, strategyName) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Generate strategy-specific curve
    const points = generateCurvePoints(strategyName, canvas.width, canvas.height);
    
    // Draw curve
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    points.forEach((point, i) => {
        if (i === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    
    ctx.stroke();
    
    // Fill area under curve (profit = green, loss = red)
    ctx.globalAlpha = 0.2;
    const midY = canvas.height / 2;
    
    ctx.fillStyle = '#22c55e'; // Green for profit
    ctx.beginPath();
    ctx.moveTo(0, midY);
    points.forEach(point => {
        ctx.lineTo(point.x, Math.min(point.y, midY));
    });
    ctx.lineTo(canvas.width, midY);
    ctx.fill();
    
    ctx.fillStyle = '#ef4444'; // Red for loss
    ctx.beginPath();
    ctx.moveTo(0, midY);
    points.forEach(point => {
        ctx.lineTo(point.x, Math.max(point.y, midY));
    });
    ctx.lineTo(canvas.width, midY);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    
    // Draw zero line
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();
    ctx.setLineDash([]);
}

function generateCurvePoints(strategyName, width, height) {
    const points = [];
    const numPoints = 20;
    const name = strategyName.toLowerCase();
    
    for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const progress = i / numPoints; // 0 to 1
        const stockPrice = 80 + (progress * 40); // 80 to 120
        
        let profit = 0;
        
        // Strategy-specific profit calculations
        if (name.includes('long call')) {
            profit = stockPrice > 105 ? (stockPrice - 105) - 5 : -5;
        } else if (name.includes('short call')) {
            profit = stockPrice > 105 ? 5 - (stockPrice - 105) : 5;
        } else if (name.includes('long put')) {
            profit = stockPrice < 95 ? (95 - stockPrice) - 5 : -5;
        } else if (name.includes('short put')) {
            profit = stockPrice < 95 ? 5 - (95 - stockPrice) : 5;
        } else if (name.includes('iron condor')) {
            if (stockPrice >= 90 && stockPrice <= 110) {
                profit = 3;
            } else {
                profit = Math.max(3 - Math.abs(stockPrice - 100) * 0.2, -2);
            }
        } else if (name.includes('iron butterfly')) {
            const distance = Math.abs(stockPrice - 100);
            profit = distance <= 5 ? 5 - distance : -2;
        } else if (name.includes('straddle') && name.includes('long')) {
            profit = Math.max(Math.abs(stockPrice - 100) - 8, -8);
        } else if (name.includes('straddle') && name.includes('short')) {
            profit = Math.max(8 - Math.abs(stockPrice - 100), -8);
        } else if (name.includes('bull') && name.includes('spread')) {
            profit = stockPrice > 103 ? Math.min(3, stockPrice - 103) : -2;
        } else if (name.includes('bear') && name.includes('spread')) {
            profit = stockPrice < 97 ? Math.min(3, 97 - stockPrice) : -2;
        } else if (name.includes('protective put')) {
            profit = (stockPrice - 100) + Math.max(95 - stockPrice, 0) - 5;
        } else if (name.includes('covered call')) {
            profit = Math.min(stockPrice - 100 + 5, 10);
        } else if (name.includes('collar')) {
            profit = Math.max(Math.min(stockPrice - 100 + 2, 7), -8);
        } else {
            // Default neutral strategy
            const distance = Math.abs(stockPrice - 100);
            profit = 2 * Math.exp(-distance * 0.1);
        }
        
        // Convert profit to y coordinate (invert because canvas y=0 is top)
        const normalizedProfit = Math.max(-10, Math.min(10, profit)) / 20 + 0.5; // -10 to +10 -> 0 to 1
        const y = height - (normalizedProfit * height);
        
        points.push({ x, y });
    }
    
    return points;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    createPayoffCharts();
    
    // Add click handlers for modals
    document.querySelectorAll('.payoff-thumbnail').forEach(canvas => {
        canvas.style.cursor = 'pointer';
        canvas.addEventListener('click', function() {
            const strategyName = this.getAttribute('data-strategy-name');
            if (strategyName) {
                alert(`Detailed analysis for ${strategyName} would open here.`);
            }
        });
    });
});

// Also try with a delay in case DOM isn't ready
setTimeout(createPayoffCharts, 500);