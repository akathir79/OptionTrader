// Panel Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.resizable-container');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const toggleLeftBtn = document.getElementById('toggleLeftPanel');
    const toggleRightBtn = document.getElementById('toggleRightPanel');
    const resetBtn = document.getElementById('resetPanels');

    if (!container || !leftPanel || !rightPanel || !toggleLeftBtn || !toggleRightBtn || !resetBtn) {
        console.log('Panel toggle elements not found');
        return;
    }

    let currentState = 'default'; // 'default', 'left-full', 'right-full'

    // Toggle left panel to full width
    function toggleLeftFull() {
        if (currentState === 'left-full') {
            resetToDefault();
        } else {
            container.classList.remove('panel-right-full');
            container.classList.add('panel-left-full');
            currentState = 'left-full';
            
            // Show reset button, hide other toggles
            resetBtn.style.display = 'block';
            toggleLeftBtn.style.display = 'none';
            toggleRightBtn.style.display = 'none';
            
            console.log('Panel state: Left panel full');
        }
    }

    // Toggle right panel to full width
    function toggleRightFull() {
        if (currentState === 'right-full') {
            resetToDefault();
        } else {
            container.classList.remove('panel-left-full');
            container.classList.add('panel-right-full');
            currentState = 'right-full';
            
            // Show reset button, hide other toggles
            resetBtn.style.display = 'block';
            toggleLeftBtn.style.display = 'none';
            toggleRightBtn.style.display = 'none';
            
            console.log('Panel state: Right panel full');
        }
    }

    // Reset to default split view
    function resetToDefault() {
        container.classList.remove('panel-left-full', 'panel-right-full');
        currentState = 'default';
        
        // Show toggle buttons, hide reset button
        resetBtn.style.display = 'none';
        toggleLeftBtn.style.display = 'block';
        toggleRightBtn.style.display = 'block';
        
        console.log('Panel state: Default split view');
    }

    // Event listeners
    toggleLeftBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleLeftFull();
    });

    toggleRightBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleRightFull();
    });

    resetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        resetToDefault();
    });

    // Keyboard shortcuts (optional)
    document.addEventListener('keydown', function(e) {
        // Ctrl + Shift + L for left panel toggle
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            toggleLeftFull();
        }
        // Ctrl + Shift + R for right panel toggle
        else if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            toggleRightFull();
        }
        // Ctrl + Shift + C for reset to center/default
        else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            resetToDefault();
        }
    });

    console.log('Panel toggle functionality initialized');
});