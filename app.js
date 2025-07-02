// Main application controller

class AirQualityApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.components = {};
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupGlobalEventListeners();
        this.initializeComponents();
        this.showSection('dashboard');
        this.isInitialized = true;
        
        console.log('Air Quality App initialized successfully');
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                const sectionId = href.replace('#', '');
                this.showSection(sectionId);
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const sectionId = e.state?.section || 'dashboard';
            this.showSection(sectionId, false);
        });

        // Set initial state
        const initialSection = window.location.hash.replace('#', '') || 'dashboard';
        history.replaceState({ section: initialSection }, '', `#${initialSection}`);
    }

    setupGlobalEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R for refresh
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshCurrentSection();
            }
            
            // Escape to close modals/toasts
            if (e.key === 'Escape') {
                hideToast();
            }
            
            // Number keys for quick navigation
            if (e.altKey && e.key >= '1' && e.key <= '4') {
                e.preventDefault();
                const sections = ['dashboard', 'forecast', 'historical', 'health'];
                const sectionIndex = parseInt(e.key) - 1;
                if (sections[sectionIndex]) {
                    this.showSection(sections[sectionIndex]);
                }
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            showSuccess('Connection restored');
            this.refreshCurrentSection();
        });

        window.addEventListener('offline', () => {
            showError('Connection lost. Some features may not work.');
        });

        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                // Refresh data when user returns to tab
                setTimeout(() => {
                    this.refreshCurrentSection();
                }, 1000);
            }
        });

        // Handle window resize
        window.addEventListener('resize', debounce(() => {
            this.handleResize();
        }, 250));
    }

    initializeComponents() {
        // Components are initialized by their respective files
        // This method can be used for additional setup if needed
        
        // Set up component references
        this.components = {
            dashboard: window.dashboard,
            forecast: window.forecast,
            historical: window.historical,
            health: window.health
        };
    }

    showSection(sectionId, updateHistory = true) {
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
            
            // Update navigation
            this.updateNavigation(sectionId);
            
            // Update browser history
            if (updateHistory) {
                history.pushState({ section: sectionId }, '', `#${sectionId}`);
            }
            
            // Trigger section-specific actions
            this.onSectionChange(sectionId);
            
            // Update page title
            this.updatePageTitle(sectionId);
        }
    }

    updateNavigation(activeSection) {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${activeSection}`) {
                link.classList.add('active');
            }
        });
    }

    updatePageTitle(sectionId) {
        const titles = {
            dashboard: 'Dashboard - Air Quality Visualizer',
            forecast: 'Forecast - Air Quality Visualizer',
            historical: 'Historical Data - Air Quality Visualizer',
            health: 'Health Recommendations - Air Quality Visualizer'
        };
        
        document.title = titles[sectionId] || 'Air Quality Visualizer';
    }

    onSectionChange(sectionId) {
        // Trigger events for components to react to section changes
        const event = new CustomEvent('sectionChanged', {
            detail: { section: sectionId }
        });
        document.dispatchEvent(event);

        // Section-specific actions
        switch (sectionId) {
            case 'dashboard':
                // Resize map when dashboard becomes active
                setTimeout(() => {
                    if (window.resizeMap) {
                        window.resizeMap();
                    }
                }, 100);
                break;
                
            case 'forecast':
                // Load forecast data if not already loaded
                if (this.components.forecast) {
                    this.components.forecast.loadForecastData();
                }
                break;
                
            case 'historical':
                // Load historical data if not already loaded
                if (this.components.historical) {
                    this.components.historical.loadHistoricalData();
                }
                break;
                
            case 'health':
                // Load health recommendations
                if (this.components.health) {
                    this.components.health.loadHealthRecommendations();
                }
                break;
        }
    }

    refreshCurrentSection() {
        switch (this.currentSection) {
            case 'dashboard':
                if (this.components.dashboard) {
                    this.components.dashboard.refreshData();
                }
                break;
                
            case 'forecast':
                if (this.components.forecast) {
                    this.components.forecast.refreshForecastData();
                }
                break;
                
            case 'historical':
                if (this.components.historical) {
                    this.components.historical.loadHistoricalData();
                }
                break;
                
            case 'health':
                if (this.components.health) {
                    this.components.health.loadHealthRecommendations();
                }
                break;
        }
    }

    handleResize() {
        // Handle responsive behavior
        if (window.resizeMap) {
            window.resizeMap();
        }
        
        // Resize charts
        if (window.Chart) {
            Object.values(Chart.instances).forEach(chart => {
                chart.resize();
            });
        }
    }

    // Utility methods
    getCurrentSection() {
        return this.currentSection;
    }

    isOnline() {
        return navigator.onLine;
    }

    // Data export functionality
    async exportAllData() {
        try {
            showLoading();
            
            const exportData = {
                timestamp: new Date().toISOString(),
                currentSection: this.currentSection,
                dashboard: this.components.dashboard ? this.components.dashboard.getCurrentCity() : null,
                forecast: this.components.forecast ? this.components.forecast.forecastData : [],
                historical: this.components.historical ? this.components.historical.historicalData : [],
                health: this.components.health ? {
                    currentAQI: this.components.health.currentAQI,
                    isSensitiveGroup: this.components.health.isSensitiveGroup,
                    recommendations: this.components.health.recommendations
                } : null
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `air_quality_data_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showSuccess('All data exported successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
            showError('Failed to export data');
        } finally {
            hideLoading();
        }
    }

    // Settings management
    getSettings() {
        return loadFromLocalStorage('appSettings', {
            autoRefresh: true,
            refreshInterval: 5,
            notifications: true,
            theme: 'light'
        });
    }

    saveSettings(settings) {
        saveToLocalStorage('appSettings', settings);
        this.applySettings(settings);
    }

    applySettings(settings) {
        // Apply auto-refresh settings
        if (this.components.dashboard) {
            if (settings.autoRefresh) {
                this.components.dashboard.setRefreshInterval(settings.refreshInterval);
            } else {
                this.components.dashboard.stopAutoRefresh();
            }
        }
        
        // Apply theme (if implemented)
        if (settings.theme) {
            document.body.setAttribute('data-theme', settings.theme);
        }
    }

    // Error handling
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        const errorMessage = error.message || 'An unexpected error occurred';
        showError(`${context}: ${errorMessage}`);
        
        // Log error for debugging (in production, this might send to a logging service)
        this.logError(error, context);
    }

    logError(error, context) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            context: context,
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            section: this.currentSection
        };
        
        // In production, send to logging service
        console.log('Error logged:', errorLog);
    }

    // Performance monitoring
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`Performance: ${name} took ${end - start} milliseconds`);
        return result;
    }

    // Cleanup
    destroy() {
        // Clean up event listeners and components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        // Clear any intervals or timeouts
        if (window.Chart) {
            Object.values(Chart.instances).forEach(chart => {
                chart.destroy();
            });
        }
        
        console.log('Air Quality App destroyed');
    }
}

// Initialize app when DOM is loaded
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    app = new AirQualityApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

// Export for global access
window.app = app;

// Global error handler
window.addEventListener('error', (e) => {
    if (app) {
        app.handleError(e.error, 'Global Error');
    }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    if (app) {
        app.handleError(e.reason, 'Unhandled Promise Rejection');
    }
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker registration can be added here for PWA features
        console.log('Service Worker support detected');
    });
}

