// Simple test to create basic charts without complex logic
console.log('🔧 Simple test script loaded');

function createSimpleTestCharts() {
    console.log('🔧 Creating simple test charts...');
    
    const canvases = document.querySelectorAll('.payoff-thumbnail');
    console.log('🔧 Found canvases:', canvases.length);
    
    canvases.forEach((canvas, index) => {
        console.log(`🔧 Creating chart ${index + 1} for canvas:`, canvas.id);
        
        try {
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: ['80', '90', '100', '110', '120'],
                    datasets: [{
                        label: 'P/L',
                        data: [-5, -3, 0, 3, 5],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    elements: {
                        point: { radius: 0 }
                    }
                }
            });
            console.log(`✅ Chart ${index + 1} created successfully`);
        } catch (error) {
            console.error(`❌ Failed to create chart ${index + 1}:`, error);
        }
    });
}

// Wait for both DOM and Chart.js to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM loaded');
    
    if (typeof Chart !== 'undefined') {
        console.log('🔧 Chart.js is available');
        createSimpleTestCharts();
    } else {
        console.log('🔧 Chart.js not yet loaded, waiting...');
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                console.log('🔧 Chart.js loaded after delay');
                createSimpleTestCharts();
            } else {
                console.error('❌ Chart.js never loaded');
            }
        }, 1000);
    }
});