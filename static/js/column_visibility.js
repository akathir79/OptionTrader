/**
 * Option Chain Column Visibility Controller
 * Manages show/hide functionality for option chain table columns
 */

class ColumnVisibilityController {
    constructor() {
        this.columnStates = this.getDefaultColumnStates();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedState();
        this.applyColumnVisibility();
    }

    getDefaultColumnStates() {
        // Default visible columns for essential trading data
        const defaults = {};
        // Make essential columns visible by default
        const essentialColumns = [0, 8, 10, 11, 13, 14, 15, 16, 18, 20, 21, 22, 23, 25, 26, 28, 36];
        
        for (let i = 0; i < 37; i++) {
            defaults[i] = essentialColumns.includes(i);
        }
        
        return defaults;
    }

    setupEventListeners() {
        // Column checkbox change handlers
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-column]')) {
                const columnIndex = parseInt(e.target.dataset.column);
                this.columnStates[columnIndex] = e.target.checked;
                this.applyColumnVisibility();
                this.saveState();
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
        for (let i = 0; i < 37; i++) {
            this.columnStates[i] = true;
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
    }

    deselectAllColumns() {
        for (let i = 0; i < 37; i++) {
            this.columnStates[i] = false;
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
    }

    resetToDefaults() {
        this.columnStates = this.getDefaultColumnStates();
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
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