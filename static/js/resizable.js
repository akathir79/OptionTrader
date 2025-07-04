// Resizable functionality
class ResizableLayout {
    constructor() {
        this.isDragging = false;
        this.currentResizer = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.init();
    }

    init() {
        this.setupResizers();
        this.setupEventListeners();
    }

    setupResizers() {
        const resizers = document.querySelectorAll('.resizer');
        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        });
    }

    setupEventListeners() {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Prevent text selection during drag
        document.addEventListener('selectstart', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        });
    }

    handleMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        this.currentResizer = e.target;

        // Add no-select class to body
        document.body.classList.add('no-select');

        // Store initial positions and dimensions
        this.startX = e.clientX;
        this.startY = e.clientY;

        const isHorizontal = this.currentResizer.classList.contains('resizer-horizontal');

        if (isHorizontal) {
            // For horizontal resizer (top/bottom split)
            const topPanel = this.currentResizer.previousElementSibling;
            const bottomPanel = this.currentResizer.nextElementSibling;

            if (topPanel && bottomPanel) {
                this.startHeight = topPanel.offsetHeight;
                this.topPanel = topPanel;
                this.bottomPanel = bottomPanel;
            }
        } else {
            // For vertical resizer (left/right split)
            const leftPanel = this.currentResizer.previousElementSibling;
            const rightPanel = this.currentResizer.nextElementSibling;

            if (leftPanel && rightPanel) {
                this.startWidth = leftPanel.offsetWidth;
                this.leftPanel = leftPanel;
                this.rightPanel = rightPanel;
            }
        }

        // Change cursor for entire document
        document.body.style.cursor = isHorizontal ? 'row-resize' : 'col-resize';
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.currentResizer) {
            return;
        }

        e.preventDefault();

        const isHorizontal = this.currentResizer.classList.contains('resizer-horizontal');

        if (isHorizontal && this.topPanel && this.bottomPanel) {
            // Handle horizontal resize (top/bottom)
            const deltaY = e.clientY - this.startY;
            const newTopHeight = this.startHeight + deltaY;
            const container = this.topPanel.parentElement;
            const containerHeight = container.offsetHeight;
            const resizerHeight = this.currentResizer.offsetHeight;

            // Calculate constraints
            const minTopHeight = 150;
            const minBottomHeight = 150;
            const maxTopHeight = containerHeight - minBottomHeight - resizerHeight;

            // Apply constraints
            const constrainedHeight = Math.max(minTopHeight, Math.min(newTopHeight, maxTopHeight));
            const remainingHeight = containerHeight - constrainedHeight - resizerHeight;

            // Set flex-basis for both panels
            this.topPanel.style.flexBasis = constrainedHeight + 'px';
            this.bottomPanel.style.flexBasis = remainingHeight + 'px';

        } else if (!isHorizontal && this.leftPanel && this.rightPanel) {
            // Handle vertical resize (left/right)
            const deltaX = e.clientX - this.startX;
            const newLeftWidth = this.startWidth + deltaX;
            const container = this.leftPanel.parentElement;
            const containerWidth = container.offsetWidth;
            const resizerWidth = this.currentResizer.offsetWidth;

            // Calculate constraints
            const minLeftWidth = 250;
            const minRightWidth = 300;
            const maxLeftWidth = containerWidth - minRightWidth - resizerWidth;

            // Apply constraints
            const constrainedWidth = Math.max(minLeftWidth, Math.min(newLeftWidth, maxLeftWidth));
            const remainingWidth = containerWidth - constrainedWidth - resizerWidth;

            // Set flex-basis for both panels
            this.leftPanel.style.flexBasis = constrainedWidth + 'px';
            this.rightPanel.style.flexBasis = remainingWidth + 'px';
        }

        // Trigger resize event for charts
        window.dispatchEvent(new Event('resize'));

        // Refresh charts if they exist
        if (window.payoffChart) {
            setTimeout(() => {
                window.payoffChart.reflow();
            }, 10);
        }
    }

    handleMouseUp(e) {
        if (!this.isDragging) {
            return;
        }

        this.isDragging = false;
        this.currentResizer = null;
        this.leftPanel = null;
        this.rightPanel = null;
        this.topPanel = null;
        this.bottomPanel = null;

        // Remove no-select class and reset cursor
        document.body.classList.remove('no-select');
        document.body.style.cursor = '';

        // Save layout preferences to localStorage
        this.saveLayoutPreferences();
    }

    saveLayoutPreferences() {
        const layout = {};
        const panels = document.querySelectorAll('.resizable-panel[style*="flex-basis"]');

        panels.forEach((panel, index) => {
            const flexBasis = panel.style.flexBasis;
            if (flexBasis) {
                layout[`panel_${index}`] = flexBasis;
            }
        });

        localStorage.setItem('trading_layout_preferences', JSON.stringify(layout));
    }

    loadLayoutPreferences() {
        const saved = localStorage.getItem('trading_layout_preferences');
        if (!saved) return;

        try {
            const layout = JSON.parse(saved);
            const panels = document.querySelectorAll('.resizable-panel');

            panels.forEach((panel, index) => {
                const savedSize = layout[`panel_${index}`];
                if (savedSize) {
                    panel.style.flexBasis = savedSize;
                }
            });

            // Trigger resize for charts
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                if (window.payoffChart) {
                    window.payoffChart.reflow();
                }
            }, 100);

        } catch (e) {
            console.warn('Failed to load layout preferences:', e);
        }
    }

    resetLayout() {
        const panels = document.querySelectorAll('.resizable-panel');
        panels.forEach(panel => {
            panel.style.flexBasis = '';
        });

        localStorage.removeItem('trading_layout_preferences');

        // Trigger resize for charts
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            if (window.payoffChart) {
                window.payoffChart.reflow();
            }
        }, 100);
    }
}

// Initialize resizable layout when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.resizableLayout = new ResizableLayout();

    // Load saved preferences after a short delay
    setTimeout(() => {
        window.resizableLayout.loadLayoutPreferences();
    }, 500);
});

// Add reset layout button functionality
function resetLayout() {
    if (window.resizableLayout) {
        window.resizableLayout.resetLayout();
    }
}