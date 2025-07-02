// Forecast component functionality

class Forecast {
    constructor() {
        this.currentCity = null;
        this.currentState = null;
        this.forecastData = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadForecastData();
    }

    setupEventListeners() {
        // Listen for city changes from dashboard
        document.addEventListener('cityChanged', (event) => {
            const { city, state } = event.detail;
            this.currentCity = city;
            this.currentState = state;
            this.loadForecastData();
        });

        // Refresh forecast data when forecast section becomes active
        const forecastSection = document.getElementById('forecast');
        if (forecastSection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (forecastSection.classList.contains('active')) {
                            this.loadForecastData();
                        }
                    }
                });
            });
            observer.observe(forecastSection, { attributes: true });
        }
    }

    async loadForecastData() {
        try {
            // Get current city from dashboard if not set
            if (!this.currentCity && window.dashboard) {
                const currentLocation = window.dashboard.getCurrentCity();
                this.currentCity = currentLocation.city;
                this.currentState = currentLocation.state;
            }

            if (!this.currentCity) {
                this.showNoForecastData();
                return;
            }

            // Load forecast data from API
            const response = await api.getAQIForecast({
                city: this.currentCity,
                state: this.currentState,
                days: 7
            });

            if (response.success && response.data && response.data.length > 0) {
                this.forecastData = response.data;
                this.displayForecastCards();
                this.displayForecastChart();
            } else {
                // Try to generate forecasts if none exist
                await this.generateForecasts();
            }
        } catch (error) {
            console.error('Error loading forecast data:', error);
            this.showNoForecastData();
        }
    }

    async generateForecasts() {
        try {
            showLoading();
            
            // Generate forecasts for current city
            const cities = [{
                city: this.currentCity,
                state: this.currentState,
                latitude: this.getCityCoordinates(this.currentCity).lat,
                longitude: this.getCityCoordinates(this.currentCity).lng
            }];

            const response = await api.generateForecasts(cities, 7);
            
            if (response.success) {
                showSuccess('Forecasts generated successfully');
                // Reload forecast data
                setTimeout(() => {
                    this.loadForecastData();
                }, 1000);
            } else {
                throw new Error(response.error || 'Failed to generate forecasts');
            }
        } catch (error) {
            console.error('Error generating forecasts:', error);
            showError('Failed to generate forecasts. Using sample data.');
            this.showSampleForecastData();
        } finally {
            hideLoading();
        }
    }

    getCityCoordinates(city) {
        // Simple city coordinates mapping
        const coordinates = {
            'Delhi': { lat: 28.6139, lng: 77.2090 },
            'Mumbai': { lat: 19.0760, lng: 72.8777 },
            'Bangalore': { lat: 12.9716, lng: 77.5946 },
            'Chennai': { lat: 13.0827, lng: 80.2707 },
            'Kolkata': { lat: 22.5726, lng: 88.3639 },
            'Hyderabad': { lat: 17.3850, lng: 78.4867 },
            'Pune': { lat: 18.5204, lng: 73.8567 },
            'Ahmedabad': { lat: 23.0225, lng: 72.5714 }
        };
        
        return coordinates[city] || { lat: 28.6139, lng: 77.2090 };
    }

    displayForecastCards() {
        const container = document.getElementById('forecastCards');
        if (!container) return;

        // Take first 3 days for cards
        const cardData = this.forecastData.slice(0, 3);
        
        container.innerHTML = cardData.map(forecast => {
            const date = new Date(forecast.forecast_date);
            const dayName = date.toLocaleDateString('en-IN', { 
                weekday: 'short',
                timeZone: 'Asia/Kolkata'
            });
            const dateStr = date.toLocaleDateString('en-IN', { 
                month: 'short', 
                day: 'numeric',
                timeZone: 'Asia/Kolkata'
            });
            
            const aqi = forecast.predicted_aqi || 0;
            const category = forecast.predicted_category || getAQICategoryFromValue(aqi);
            const confidence = Math.round((forecast.confidence_score || 0.8) * 100);
            
            return `
                <div class="forecast-card fade-in">
                    <div class="forecast-date">${dayName}, ${dateStr}</div>
                    <div class="forecast-aqi" style="color: ${getAQIColor(aqi)};">${aqi}</div>
                    <div class="forecast-category ${formatAQICategory(category)}">${category}</div>
                    <div class="forecast-confidence">Confidence: ${confidence}%</div>
                </div>
            `;
        }).join('');
    }

    displayForecastChart() {
        if (this.forecastData.length > 0) {
            createForecastChart('forecastChart', this.forecastData);
        } else {
            showNoDataMessage('forecastChart', 'No forecast data available');
        }
    }

    showSampleForecastData() {
        // Generate sample forecast data for demonstration
        const today = new Date();
        const sampleData = [];
        
        for (let i = 1; i <= 7; i++) {
            const forecastDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
            const baseAQI = 100 + Math.random() * 100; // Random AQI between 100-200
            const aqi = Math.round(baseAQI + (Math.random() - 0.5) * 50);
            
            sampleData.push({
                forecast_date: forecastDate.toISOString(),
                predicted_aqi: Math.max(0, aqi),
                predicted_category: getAQICategoryFromValue(aqi),
                confidence_score: 0.7 + Math.random() * 0.2,
                city: this.currentCity || 'Delhi',
                state: this.currentState || 'Delhi'
            });
        }
        
        this.forecastData = sampleData;
        this.displayForecastCards();
        this.displayForecastChart();
        
        showSuccess('Showing sample forecast data');
    }

    showNoForecastData() {
        const container = document.getElementById('forecastCards');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cloud-sun"></i>
                    <h3>No Forecast Data</h3>
                    <p>Forecast data is not available for the selected location.</p>
                    <button class="btn btn-primary" onclick="forecast.generateForecasts()">
                        <i class="fas fa-sync-alt"></i>
                        Generate Forecasts
                    </button>
                </div>
            `;
        }
        
        showNoDataMessage('forecastChart', 'No forecast data available');
    }

    async refreshForecastData() {
        try {
            showLoading();
            await this.loadForecastData();
            showSuccess('Forecast data refreshed');
        } catch (error) {
            console.error('Error refreshing forecast data:', error);
            showError('Failed to refresh forecast data');
        } finally {
            hideLoading();
        }
    }

    // Get forecast for specific date
    getForecastForDate(date) {
        const targetDate = new Date(date).toDateString();
        return this.forecastData.find(forecast => {
            const forecastDate = new Date(forecast.forecast_date).toDateString();
            return forecastDate === targetDate;
        });
    }

    // Get forecast summary
    getForecastSummary() {
        if (this.forecastData.length === 0) return null;
        
        const avgAQI = this.forecastData.reduce((sum, forecast) => 
            sum + (forecast.predicted_aqi || 0), 0) / this.forecastData.length;
        
        const categories = this.forecastData.map(forecast => 
            forecast.predicted_category || getAQICategoryFromValue(forecast.predicted_aqi || 0));
        
        const mostCommonCategory = this.getMostCommonCategory(categories);
        
        return {
            averageAQI: Math.round(avgAQI),
            mostCommonCategory: mostCommonCategory,
            totalDays: this.forecastData.length,
            city: this.currentCity,
            state: this.currentState
        };
    }

    getMostCommonCategory(categories) {
        const counts = {};
        categories.forEach(category => {
            counts[category] = (counts[category] || 0) + 1;
        });
        
        return Object.keys(counts).reduce((a, b) => 
            counts[a] > counts[b] ? a : b);
    }

    // Export forecast data
    exportForecastData() {
        if (this.forecastData.length === 0) {
            showError('No forecast data to export');
            return;
        }

        const csvContent = this.convertToCSV(this.forecastData);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `aqi_forecast_${this.currentCity}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Forecast data exported successfully');
    }

    convertToCSV(data) {
        const headers = ['Date', 'City', 'State', 'Predicted AQI', 'Category', 'Confidence'];
        const rows = data.map(forecast => [
            formatDate(forecast.forecast_date),
            forecast.city || '',
            forecast.state || '',
            forecast.predicted_aqi || 0,
            forecast.predicted_category || '',
            Math.round((forecast.confidence_score || 0) * 100) + '%'
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

// Initialize forecast when DOM is loaded
let forecast = null;

document.addEventListener('DOMContentLoaded', () => {
    forecast = new Forecast();
});

// Export for global access
window.forecast = forecast;

