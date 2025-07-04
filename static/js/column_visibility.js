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
            'Chng', 'Gamma', 'Theta', 'Vega', 'Vanna', 'Charm', 'Volga', 'Veta', 'PE B/S', 'Columns'
        ];
        this.columnStates = this.getDefaultColumnStates();
        this.init();
    }

    init() {
        this.createColumnCheckboxes();
        this.setupEventListeners();
        this.loadSavedState();
        this.applyColumnVisibility();
    }

    getDefaultColumnStates() {
        // Default visible columns for essential trading data
        const defaults = {};
        // Make essential columns visible by default
        // Default visible columns: CE B/S(0), LTP(17), Δ(18), Strike(19), Δ(20), LTP(21), PE B/S(38)
        const essentialColumns = [0, 17, 18, 19, 20, 21, 38];
        
        for (let i = 0; i < 40; i++) {
            defaults[i] = essentialColumns.includes(i);
        }
        
        // Hide the Columns dropdown column (index 39) by always making it invisible
        defaults[39] = false;
        
        return defaults;
    }

    createColumnCheckboxes() {
        const container = document.getElementById('columnCheckboxes');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.columnNames.forEach((name, index) => {
            // Skip the Columns dropdown column (index 39) from checkbox creation
            if (index === 39) return;
            
            const isChecked = this.columnStates[index] ? 'checked' : '';
            const checkboxHtml = `
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_${index}" data-column="${index}" ${isChecked}>
                    <label class="form-check-label" for="col_${index}">
                        ${name}
                    </label>
                </div>
            `;
            container.innerHTML += checkboxHtml;
        });
    }

    setupEventListeners() {
        // Column checkbox change handlers
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-column]')) {
                const columnIndex = parseInt(e.target.dataset.column);
                this.columnStates[columnIndex] = e.target.checked;
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
            } else if (e.target.id === 'resetDefaultColumns') {
                this.resetToDefaults();
            }
        });
    }

    applyColumnVisibility() {
        const table = document.getElementById('optionChainTable');
        if (!table) return;

        // Apply to header
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach((cell, index) => {
            cell.style.display = this.columnStates[index] ? '' : 'none';
        });

        // Apply to data rows
        const dataRows = table.querySelectorAll('tbody tr');
        dataRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                cell.style.display = this.columnStates[index] ? '' : 'none';
            });
        });
    }



    selectAllColumns() {
        for (let i = 0; i < 40; i++) {
            // Don't show the Columns dropdown column (index 39)
            this.columnStates[i] = (i !== 39);
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    deselectAllColumns() {
        for (let i = 0; i < 40; i++) {
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
        document.querySelectorAll('[data-column]').forEach(checkbox => {
            const columnIndex = parseInt(checkbox.dataset.column);
            checkbox.checked = this.columnStates[columnIndex];
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