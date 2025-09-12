/**
 * Token Expiry Monitor - Bell Notification System
 * Monitors broker token expiry and displays notifications in navigation bell dropdown
 */
class TokenMonitor {
    constructor() {
        this.notifications = [];
        this.updateInterval = null;
        this.isInitialized = false;
        
        // Notification check intervals (in milliseconds)
        this.CHECK_INTERVAL = 60000; // Check every minute
        
        this.init();
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('🔔 Initializing Token Monitor...');
        
        // Start monitoring
        await this.loadNotifications();
        this.startPeriodicCheck();
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Token Monitor initialized');
    }
    
    async loadNotifications() {
        try {
            const response = await fetch('/api/token-monitor/notifications');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.notifications = data.notifications || [];
            
            console.log(`🔔 Loaded ${this.notifications.length} token notifications`, data);
            this.updateBellUI();
            
        } catch (error) {
            console.error('Error loading token notifications:', error);
            this.notifications = [];
            this.updateBellUI();
        }
    }
    
    updateBellUI() {
        const badge = document.getElementById('tokenBadge');
        const dropdown = document.getElementById('tokenNotificationsDropdown');
        const noNotifications = document.getElementById('noNotifications');
        
        if (!badge || !dropdown) return;
        
        const count = this.notifications.length;
        
        // Update badge
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
        
        // Update dropdown content
        if (count === 0) {
            // Show "No expiring tokens" message
            if (noNotifications) {
                noNotifications.style.display = 'block';
                noNotifications.textContent = 'No expiring tokens';
            }
            
            // Remove any existing notification items
            const existingItems = dropdown.querySelectorAll('.token-notification-item');
            existingItems.forEach(item => item.remove());
        } else {
            // Hide "No notifications" message
            if (noNotifications) {
                noNotifications.style.display = 'none';
            }
            
            // Clear existing notification items
            const existingItems = dropdown.querySelectorAll('.token-notification-item');
            existingItems.forEach(item => item.remove());
            
            // Add new notification items
            this.notifications.forEach(notification => {
                const li = document.createElement('li');
                li.className = 'token-notification-item';
                
                const alertClass = notification.type === 'error' ? 'alert-danger' : 'alert-warning';
                const iconClass = notification.type === 'error' ? 'fa-exclamation-triangle' : 'fa-clock';
                
                li.innerHTML = `
                    <div class="dropdown-item-text p-2">
                        <div class="alert ${alertClass} mb-2 py-2 px-3" style="font-size: 0.85rem;">
                            <i class="fas ${iconClass} me-1"></i>
                            <strong>${notification.brokername}</strong> (${notification.broker_user_id})
                            <br>
                            <small>${notification.message}</small>
                        </div>
                        <div class="d-flex gap-2">
                            ${this.getActionButtons(notification)}
                        </div>
                    </div>
                    <li><hr class="dropdown-divider"></li>
                `;
                
                dropdown.appendChild(li);
            });
        }
    }
    
    getActionButtons(notification) {
        const brokerId = notification.broker_id;
        const supportsRefresh = notification.supports_refresh_token;
        const supportsAccess = notification.supports_access_token;
        
        let buttons = [];
        
        // Show Access Token button if broker supports it
        if (supportsAccess) {
            buttons.push(`<button class="btn btn-sm btn-success create-token-btn" data-broker-id="${brokerId}">
                            <i class="fas fa-key"></i> Access Token
                         </button>`);
        }
        
        // Show Refresh Token button if broker supports it and has a valid refresh token
        if (supportsRefresh) {
            buttons.push(`<button class="btn btn-sm btn-primary refresh-token-btn" data-broker-id="${brokerId}">
                            <i class="fas fa-sync-alt"></i> Refresh Token
                         </button>`);
        }
        
        return buttons.join(' ');
    }
    
    setupEventListeners() {
        // Handle action buttons in dropdown
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('refresh-token-btn') || e.target.closest('.refresh-token-btn')) {
                const button = e.target.classList.contains('refresh-token-btn') ? e.target : e.target.closest('.refresh-token-btn');
                const brokerId = button.dataset.brokerId;
                await this.handleRefreshToken(brokerId, button);
            }
            
            if (e.target.classList.contains('create-token-btn') || e.target.closest('.create-token-btn')) {
                const button = e.target.classList.contains('create-token-btn') ? e.target : e.target.closest('.create-token-btn');
                const brokerId = button.dataset.brokerId;
                await this.handleCreateToken(brokerId, button);
            }
        });
    }
    
    async handleRefreshToken(brokerId, button) {
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            
            const response = await fetch(`/api/broker_settings/${brokerId}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                this.showToast('Access token refreshed successfully!', 'success');
                await this.loadNotifications(); // Reload notifications
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Failed to refresh token', 'error');
            }
            
        } catch (error) {
            console.error('Error refreshing token:', error);
            this.showToast('Error refreshing token: ' + error.message, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
    
    async handleCreateToken(brokerId, button) {
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            
            // Get broker details
            const brokerResponse = await fetch(`/api/broker_settings`);
            const brokers = await brokerResponse.json();
            const broker = brokers.find(b => b.id == brokerId);
            
            if (!broker) {
                throw new Error('Broker not found');
            }
            
            // Handle Fyers authentication flow
            if (broker.brokername.toLowerCase() === 'fyers') {
                const clientId = broker.clientid;
                const redirectUri = broker.redirect_url;
                
                if (!clientId || !redirectUri) {
                    throw new Error('Missing client ID or redirect URL in broker settings');
                }
                
                // Open Fyers auth URL
                const authURL = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=tokenmonitor`;
                window.open(authURL, '_blank');
                
                // Prompt for auth code
                const authCode = prompt('After authorizing, paste the auth_code from the redirect URL:');
                
                if (!authCode) {
                    button.disabled = false;
                    button.innerHTML = originalText;
                    return;
                }
                
                // Exchange auth code for tokens
                const tokenResponse = await fetch(`/api/broker_settings/${brokerId}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ auth_code: authCode })
                });
                
                if (tokenResponse.ok) {
                    this.showToast('Access token created successfully!', 'success');
                    await this.loadNotifications(); // Reload notifications
                } else {
                    const error = await tokenResponse.json();
                    this.showToast(error.error || 'Failed to create token', 'error');
                }
            } else {
                this.showToast('Token creation not implemented for ' + broker.brokername, 'warning');
            }
            
        } catch (error) {
            console.error('Error creating token:', error);
            this.showToast('Error creating token: ' + error.message, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast notification
        const toastContainer = this.getOrCreateToastContainer();
        
        const toastElement = document.createElement('div');
        toastElement.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} alert-dismissible fade show`;
        toastElement.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
        
        toastElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        toastContainer.appendChild(toastElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.remove();
            }
        }, 5000);
    }
    
    getOrCreateToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }
    
    startPeriodicCheck() {
        // Clear any existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Start periodic check
        this.updateInterval = setInterval(() => {
            this.loadNotifications();
        }, this.CHECK_INTERVAL);
        
        console.log(`🔔 Started periodic token check (every ${this.CHECK_INTERVAL / 1000}s)`);
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.isInitialized = false;
        console.log('🔔 Token Monitor destroyed');
    }
}

// Global instance
window.tokenMonitor = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize token monitor
    window.tokenMonitor = new TokenMonitor();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.tokenMonitor) {
        window.tokenMonitor.destroy();
    }
});