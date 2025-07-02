// Dashboard component functionality

class Dashboard {
    constructor() {
        this.currentCity = null;
        this.currentState = null;
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
        this.refreshIntervalTime = 5 * 60 * 1000; // 5 minutes
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeMap();
        this.loadInitialData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // City selector change
        const citySelector = document.getElementById('citySelector');
        if (citySelector) {
            citySelector.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value) {
                    const [city, state] = value.split(',');
                    this.selectCity(city.trim(), state.trim());
                }
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Window resize event for map
        window.addEventListener('resize', debounce(() => {
            resizeMap();
        }, 250));
    }

    initializeMap() {
        // Initialize the AQI map
        initializeAQIMap('aqiMap');
        
        // Try to get user's location
        this.getUserLocationAndCenter();
    }

    async getUserLocationAndCenter() {
        try {
            const location = await getUserLocation();
            addUserLocationMarker(location.lat, location.lng);
            centerMapOnLocation(location.lat, location.lng, 8);
            
            // Try to find nearest city for the user's location
            this.findNearestCity(location.lat, location.lng);
        } catch (error) {
            console.log('Could not get user location:', error.message);
            // Default to Delhi if location access is denied
            this.selectCity('Delhi', 'Delhi');
        }
    }

    async findNearestCity(lat, lng) {
        // This is a simplified implementation
        // In a real app, you might use a reverse geocoding service
        const cities = [
            { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
            { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
            { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
            { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
            { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
            { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 }
        ];

        let nearestCity = cities[0];
        let minDistance = this.calculateDistance(lat, lng, nearestCity.lat, nearestCity.lng);

        cities.forEach(city => {
            const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearestCity = city;
            }
        });

        // Select the nearest city
        this.selectCity(nearestCity.name, nearestCity.state);
        
        // Update city selector
        const citySelector = document.getElementById('citySelector');
        if (citySelector) {
            citySelector.value = `${nearestCity.name},${nearestCity.state}`;
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    async loadInitialData() {
        try {
            // Load data for major cities to populate the map
            await this.loadMapData();
            
            // If no city is selected, default to Delhi
            if (!this.currentCity) {
                this.selectCity('Delhi', 'Delhi');
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            showError('Failed to load initial data');
        }
    }

    async loadMapData() {
        try {
            // Get real-time AQI data for major cities
            const response = await api.getRealTimeAQI({ limit: 50 });
            
            if (response.success && response.data) {
                // Add markers to map
                addAQIMarkers(response.data);
            }
        } catch (error) {
            console.error('Error loading map data:', error);
        }
    }

    async selectCity(city, state) {
        this.currentCity = city;
        this.currentState = state;
        
        try {
            // Update current location display
            this.updateLocationDisplay(city, state);
            
            // Load AQI data for the selected city
            await this.loadCityData(city, state);
            
            // Load trend chart data
            await this.loadTrendData(city, state);
            
            // Save selection to localStorage
            saveToLocalStorage('selectedCity', { city, state });
            
        } catch (error) {
            console.error('Error selecting city:', error);
            showError(`Failed to load data for ${city}`);
        }
    }

    updateLocationDisplay(city, state) {
        const currentLocation = document.getElementById('currentLocation');
        if (currentLocation) {
            currentLocation.textContent = `${city}, ${state}`;
        }
    }

    async loadCityData(city, state) {
        try {
            const response = await api.getRealTimeAQI({ 
                city: city,
                state: state,
                limit: 1 
            });
            
            if (response.success && response.data && response.data.length > 0) {
                const data = response.data[0];
                this.updateCurrentAQIDisplay(data);
                this.updatePollutantDisplay(data);
            } else {
                this.showNoDataMessage();
            }
        } catch (error) {
            console.error('Error loading city data:', error);
            this.showNoDataMessage();
        }
    }

    updateCurrentAQIDisplay(data) {
        const currentAQI = document.getElementById('currentAQI');
        const currentCategory = document.getElementById('currentCategory');
        const lastUpdate = document.getElementById('lastUpdate');

        if (currentAQI) {
            currentAQI.textContent = data.aqi_value || '--';
            currentAQI.style.color = getAQIColor(data.aqi_value || 0);
        }

        if (currentCategory) {
            const category = getAQICategoryFromValue(data.aqi_value || 0);
            currentCategory.textContent = category;
            currentCategory.className = `aqi-category ${formatAQICategory(category)}`;
        }

        if (lastUpdate) {
            lastUpdate.textContent = `Last updated: ${formatTimestamp(data.last_update)}`;
        }
    }

    updatePollutantDisplay(data) {
        const pollutants = [
            { id: 'pm25Value', value: data.pm25 },
            { id: 'pm10Value', value: data.pm10 },
            { id: 'no2Value', value: data.no2 },
            { id: 'so2Value', value: data.so2 }
        ];

        pollutants.forEach(pollutant => {
            const element = document.getElementById(pollutant.id);
            if (element) {
                element.textContent = pollutant.value || '--';
            }
        });
    }

    async loadTrendData(city, state) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

            const response = await api.getHistoricalAQI({
                city: city,
                state: state,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                limit: 24
            });

            if (response.success && response.data && response.data.length > 0) {
                createTrendChart('trendChart', response.data);
            } else {
                showNoDataMessage('trendChart', 'No trend data available for the last 24 hours');
            }
        } catch (error) {
            console.error('Error loading trend data:', error);
            showNoDataMessage('trendChart', 'Failed to load trend data');
        }
    }

    showNoDataMessage() {
        const currentAQI = document.getElementById('currentAQI');
        const currentCategory = document.getElementById('currentCategory');
        const lastUpdate = document.getElementById('lastUpdate');

        if (currentAQI) currentAQI.textContent = '--';
        if (currentCategory) {
            currentCategory.textContent = 'No Data';
            currentCategory.className = 'aqi-category';
        }
        if (lastUpdate) lastUpdate.textContent = 'No recent data available';

        // Clear pollutant values
        ['pm25Value', 'pm10Value', 'no2Value', 'so2Value'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });
    }

    async refreshData() {
        if (!this.currentCity || !this.currentState) return;

        try {
            showLoading();
            
            // Refresh current city data
            await this.loadCityData(this.currentCity, this.currentState);
            
            // Refresh trend data
            await this.loadTrendData(this.currentCity, this.currentState);
            
            // Refresh map data
            await this.loadMapData();
            
            showSuccess('Data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing data:', error);
            showError('Failed to refresh data');
        } finally {
            hideLoading();
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (this.autoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                this.refreshData();
            }, this.refreshIntervalTime);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;
        
        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
            showSuccess('Auto-refresh enabled');
        } else {
            this.stopAutoRefresh();
            showSuccess('Auto-refresh disabled');
        }
    }

    // Public methods for external access
    getCurrentCity() {
        return {
            city: this.currentCity,
            state: this.currentState
        };
    }

    setRefreshInterval(minutes) {
        this.refreshIntervalTime = minutes * 60 * 1000;
        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
        }
    }

    destroy() {
        this.stopAutoRefresh();
        // Clean up event listeners if needed
    }
}

// Initialize dashboard when DOM is loaded
let dashboard = null;

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});

// Export for global access
window.dashboard = dashboard;

