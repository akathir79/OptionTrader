// Debug script to test chart loading
console.log('🔍 Debug script loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOM loaded');
    
    // Check if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
        console.log('✅ Chart.js is loaded');
    } else {
        console.error('❌ Chart.js is NOT loaded');
    }
    
    // Check for strategiesData
    const strategiesDataElement = document.getElementById('strategiesData');
    if (strategiesDataElement) {
        console.log('✅ strategiesData element found');
        try {
            const data = JSON.parse(strategiesDataElement.textContent);
            console.log('✅ strategiesData parsed successfully:', data.length, 'strategies');
        } catch (e) {
            console.error('❌ strategiesData parse error:', e);
        }
    } else {
        console.error('❌ strategiesData element NOT found');
    }
    
    // Check for canvas elements
    const canvases = document.querySelectorAll('.payoff-thumbnail');
    console.log('🔍 Found', canvases.length, 'canvas elements');
    
    // Try to create a simple test chart
    if (canvases.length > 0 && typeof Chart !== 'undefined') {
        const firstCanvas = canvases[0];
        console.log('🔍 Attempting to create test chart on:', firstCanvas.id);
        
        try {
            new Chart(firstCanvas, {
                type: 'line',
                data: {
                    labels: ['A', 'B', 'C'],
                    datasets: [{
                        data: [1, 2, 3],
                        borderColor: 'red'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
            console.log('✅ Test chart created successfully');
        } catch (e) {
            console.error('❌ Test chart creation failed:', e);
        }
    }
});