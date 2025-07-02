// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API utility class for handling all backend communication
class APIClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options,
        };

        try {
            showLoading();
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            hideLoading();
            
            if (!data.success) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            hideLoading();
            console.error('API request failed:', error);
            showError(error.message || 'Network error occurred');
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // AQI-specific API methods
    async getRealTimeAQI(params = {}) {
        return this.get('/aqi/realtime', params);
    }

    async getHistoricalAQI(params = {}) {
        return this.get('/aqi/historical', params);
    }

    async getAQIForecast(params = {}) {
        return this.get('/aqi/forecast', params);
    }

    async getHealthRecommendations(aqiValue, sensitiveGroup = false) {
        return this.get('/aqi/health-recommendations', {
            aqi: aqiValue,
            sensitive_group: sensitiveGroup
        });
    }

    async refreshAQIData(cities = []) {
        return this.post('/aqi/refresh-data', { cities });
    }

    // ML Model API methods
    async getModelInfo() {
        return this.get('/ml/model/info');
    }

    async trainModel(useSampleData = false) {
        return this.post('/ml/model/train', {
            use_sample_data: useSampleData
        });
    }

    async generateForecasts(cities = [], forecastDays = 3) {
        return this.post('/ml/forecasts/generate', {
            cities,
            forecast_days: forecastDays
        });
    }

    async batchGenerateForecasts(forecastDays = 3) {
        return this.post('/ml/forecasts/batch-generate', {
            forecast_days: forecastDays
        });
    }

    async getFeatureImportance() {
        return this.get('/ml/model/feature-importance');
    }

    async makePrediction(city, state, features = null) {
        return this.post('/ml/model/predict', {
            city,
            state,
            features
        });
    }
}

// Create global API client instance
const api = new APIClient();

// Utility functions for UI feedback
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

function showError(message) {
    const toast = document.getElementById('errorToast');
    const messageElement = document.getElementById('errorMessage');
    
    if (toast && messageElement) {
        messageElement.textContent = message;
        toast.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }
}

function showSuccess(message) {
    const toast = document.getElementById('successToast');
    const messageElement = document.getElementById('successMessage');
    
    if (toast && messageElement) {
        messageElement.textContent = message;
        toast.classList.add('show');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function hideToast() {
    const errorToast = document.getElementById('errorToast');
    const successToast = document.getElementById('successToast');
    
    if (errorToast) errorToast.classList.remove('show');
    if (successToast) successToast.classList.remove('show');
}

// Utility functions for data processing
function formatAQICategory(category) {
    const categoryMap = {
        'Good': 'aqi-good',
        'Satisfactory': 'aqi-satisfactory',
        'Moderate': 'aqi-moderate',
        'Poor': 'aqi-poor',
        'Very Poor': 'aqi-very-poor',
        'Severe': 'aqi-severe'
    };
    return categoryMap[category] || 'aqi-unknown';
}

function getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 200) return '#ff7e00';
    if (aqi <= 300) return '#ff0000';
    if (aqi <= 400) return '#8f3f97';
    return '#7e0023';
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function formatDate(date) {
    if (!date) return 'Unknown';
    
    try {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Local storage utilities
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
    }
}

// Cache management
class DataCache {
    constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear() {
        this.cache.clear();
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }
}

// Create global cache instance
const dataCache = new DataCache();

// Export for use in other modules
window.api = api;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showError = showError;
window.showSuccess = showSuccess;
window.hideToast = hideToast;
window.formatAQICategory = formatAQICategory;
window.getAQIColor = getAQIColor;
window.formatTimestamp = formatTimestamp;
window.formatDate = formatDate;
window.debounce = debounce;
window.throttle = throttle;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.removeFromLocalStorage = removeFromLocalStorage;
window.dataCache = dataCache;

