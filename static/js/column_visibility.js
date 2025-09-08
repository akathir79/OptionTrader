/**
 * Option Chain Column Visibility Controller
 * Manages show/hide functionality for option chain table columns
 */

class ColumnVisibilityController {
    constructor() {
        this.columnNames = [
            'CE B/S', 'Veta', 'Volga', 'Charm', 'Vanna', 'Vega', 'Theta', 'Gamma', 'Chng', 'Bid Qty',
            'Bid', 'Ask', 'Ask Qty', 'Chng in OI', 'OI', 'Vol', 'Chart', 'LTP', 'Δ', 'Strike',
            'Δ', 'LTP', 'Chart', 'Vol', 'OI', 'Chng in OI', 'Ask Qty', 'Ask', 'Bid', 'Bid Qty',
            'Chng', 'Gamma', 'Theta', 'Vega', 'Vanna', 'Charm', 'Volga', 'Veta', 'PE B/S'
        ];
        this.columnStates = this.getDefaultColumnStates();
        this.groupedControls = []; // Initialize grouped controls
        this.init();
    }

    init() {
        this.createColumnCheckboxes();
        this.setupEventListeners();
        this.loadSavedState();
        this.applyColumnVisibility();
    }

    getDefaultColumnStates() {
        // Default visible columns for essential trading data only
        const defaults = {};
        // Essential columns: CE B/S(0), Change in OI(13), Vol(15), LTP(17), Delta(18), Strike(19), Delta(20), LTP(21), Vol(23), Change in OI(25), PE B/S(38)
        const essentialColumns = [0, 13, 15, 17, 18, 19, 20, 21, 23, 25, 38];
        
        for (let i = 0; i < 39; i++) {
            defaults[i] = essentialColumns.includes(i);
        }
        
        return defaults;
    }

    createColumnCheckboxes() {
        const container = document.getElementById('columnCheckboxes');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Grouped controls for better UX - one checkbox controls both CE and PE sides
        const groupedControls = [
            { name: 'B/S', columns: [0, 38], essential: true },
            { name: 'LTP', columns: [17, 21], essential: true },
            { name: 'Vol', columns: [15, 23], essential: true },
            { name: 'Delta (Δ)', columns: [18, 20], essential: true },
            { name: 'Change in OI', columns: [13, 25], essential: true },
            { name: 'Strike', columns: [19], essential: true },
            { name: 'Chart', columns: [16, 22], essential: false },
            { name: 'OI', columns: [14, 24], essential: false },
            { name: 'Bid', columns: [10, 28], essential: false },
            { name: 'Ask', columns: [11, 27], essential: false },
            { name: 'Bid Qty', columns: [9, 29], essential: false },
            { name: 'Ask Qty', columns: [12, 26], essential: false },
            { name: 'Change', columns: [8, 30], essential: false },
            { name: 'Gamma', columns: [7, 31], essential: false },
            { name: 'Theta', columns: [6, 32], essential: false },
            { name: 'Vega', columns: [5, 33], essential: false },
            { name: 'Vanna', columns: [4, 34], essential: false },
            { name: 'Charm', columns: [3, 35], essential: false },
            { name: 'Volga', columns: [2, 36], essential: false },
            { name: 'Veta', columns: [1, 37], essential: false }
        ];
        
        // Create essential columns first
        groupedControls.filter(group => group.essential).forEach((group, index) => {
            const isChecked = group.columns.every(col => this.columnStates[col]) ? 'checked' : '';
            const checkboxHtml = `
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="group_${index}" data-group="${index}" ${isChecked}>
                    <label class="form-check-label" for="group_${index}" style="font-weight: 500;">
                        ${group.name}
                    </label>
                </div>
            `;
            container.innerHTML += checkboxHtml;
        });
        
        // Add separator
        container.innerHTML += '<hr class="my-2">';
        container.innerHTML += '<div style="font-size: 11px; color: #6c757d; margin-bottom: 8px;">Advanced Columns:</div>';
        
        // Create advanced columns
        groupedControls.filter(group => !group.essential).forEach((group, index) => {
            const realIndex = index + 6; // Offset for essential columns
            const isChecked = group.columns.every(col => this.columnStates[col]) ? 'checked' : '';
            const checkboxHtml = `
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="group_${realIndex}" data-group="${realIndex}" ${isChecked}>
                    <label class="form-check-label" for="group_${realIndex}" style="font-size: 11px;">
                        ${group.name}
                    </label>
                </div>
            `;
            container.innerHTML += checkboxHtml;
        });
        
        // Store grouped controls for reference
        this.groupedControls = groupedControls;
    }

    setupEventListeners() {
        // Grouped checkbox change handlers
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-group]')) {
                const groupIndex = parseInt(e.target.dataset.group);
                const group = this.groupedControls[groupIndex];
                const isChecked = e.target.checked;
                
                // Toggle all columns in this group
                group.columns.forEach(columnIndex => {
                    this.columnStates[columnIndex] = isChecked;
                });
                
                this.applyColumnVisibility();
                this.saveState();
                this.refreshTableData(); // Intelligent refresh when columns change
            }
        });

        // Bulk action handlers
        document.addEventListener('click', (e) => {
            if (e.target.id === 'selectAllColumns') {
                this.selectAllColumns();
            } else if (e.target.id === 'deselectAllColumns') {
                this.deselectAllColumns();
            } else if (e.target.id === 'resetToDefaults') {
                this.resetToDefaults();
            }
        });
    }

    applyColumnVisibility() {
        const table = document.getElementById('optionChainTable');
        if (!table) return;

        // Apply to header - more robust checking
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach((cell, index) => {
            if (index < this.columnStates.length) {
                cell.style.display = this.columnStates[index] ? '' : 'none';
            }
        });

        // Apply to data rows - more robust checking
        const dataRows = table.querySelectorAll('tbody tr');
        dataRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (index < this.columnStates.length) {
                    cell.style.display = this.columnStates[index] ? '' : 'none';
                }
            });
        });
        
        // Log for debugging
        console.log('Column visibility applied - Headers:', headerCells.length, 'Data columns expected:', this.columnStates.length);
    }



    selectAllColumns() {
        for (let i = 0; i < 39; i++) {
            this.columnStates[i] = true;
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    deselectAllColumns() {
        for (let i = 0; i < 39; i++) {
            this.columnStates[i] = false;
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    resetToDefaults() {
        this.columnStates = this.getDefaultColumnStates();
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    refreshTableData() {
        // Intelligent refresh when columns change to prevent data misalignment
        console.log('Refreshing option chain data due to column visibility change');
        
        // Refresh the data if WebSocket handler exists
        if (window.webSocketHandler && typeof window.webSocketHandler.refreshOptionChain === 'function') {
            window.webSocketHandler.refreshOptionChain();
        }
    }

    updateCheckboxes() {
        document.querySelectorAll('[data-group]').forEach(checkbox => {
            const groupIndex = parseInt(checkbox.dataset.group);
            const group = this.groupedControls[groupIndex];
            // Check if all columns in this group are visible
            checkbox.checked = group.columns.every(col => this.columnStates[col]);
        });
    }

    saveState() {
        localStorage.setItem('optionChainColumnStates', JSON.stringify(this.columnStates));
    }

    loadSavedState() {
        const saved = localStorage.getItem('optionChainColumnStates');
        if (saved) {
            try {
                this.columnStates = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load saved column states:', e);
            }
        }
        this.updateCheckboxes();
    }

    // Method to refresh visibility when table content changes
    refreshVisibility() {
        this.applyColumnVisibility();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.columnVisibilityController = new ColumnVisibilityController();
});