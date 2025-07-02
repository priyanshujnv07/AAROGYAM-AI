// Historical component functionality

class Historical {
    constructor() {
        this.currentCity = null;
        this.currentState = null;
        this.historicalData = [];
        this.dateRange = {
            start: null,
            end: null
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDateRange();
        this.loadHistoricalData();
    }

    setupEventListeners() {
        // Date range inputs
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const loadHistoricalBtn = document.getElementById('loadHistoricalBtn');

        if (startDateInput) {
            startDateInput.addEventListener('change', (e) => {
                this.dateRange.start = e.target.value;
            });
        }

        if (endDateInput) {
            endDateInput.addEventListener('change', (e) => {
                this.dateRange.end = e.target.value;
            });
        }

        if (loadHistoricalBtn) {
            loadHistoricalBtn.addEventListener('click', () => {
                this.loadHistoricalData();
            });
        }

        // Listen for city changes from dashboard
        document.addEventListener('cityChanged', (event) => {
            const { city, state } = event.detail;
            this.currentCity = city;
            this.currentState = state;
            this.loadHistoricalData();
        });

        // Load data when historical section becomes active
        const historicalSection = document.getElementById('historical');
        if (historicalSection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (historicalSection.classList.contains('active')) {
                            this.loadHistoricalData();
                        }
                    }
                });
            });
            observer.observe(historicalSection, { attributes: true });
        }
    }

    setDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        this.dateRange.start = startDate.toISOString().split('T')[0];
        this.dateRange.end = endDate.toISOString().split('T')[0];

        // Set input values
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        if (startDateInput) startDateInput.value = this.dateRange.start;
        if (endDateInput) endDateInput.value = this.dateRange.end;
    }

    async loadHistoricalData() {
        try {
            // Get current city from dashboard if not set
            if (!this.currentCity && window.dashboard) {
                const currentLocation = window.dashboard.getCurrentCity();
                this.currentCity = currentLocation.city;
                this.currentState = currentLocation.state;
            }

            if (!this.currentCity || !this.dateRange.start || !this.dateRange.end) {
                this.showNoHistoricalData();
                return;
            }

            showLoading();

            // Validate date range
            if (new Date(this.dateRange.start) > new Date(this.dateRange.end)) {
                showError('Start date must be before end date');
                return;
            }

            // Load historical data from API
            const response = await api.getHistoricalAQI({
                city: this.currentCity,
                state: this.currentState,
                start_date: this.dateRange.start,
                end_date: this.dateRange.end,
                limit: 1000
            });

            if (response.success && response.data && response.data.length > 0) {
                this.historicalData = response.data;
                this.displayHistoricalChart();
                this.displayHistoricalStats();
                showSuccess(`Loaded ${response.data.length} historical records`);
            } else {
                this.showSampleHistoricalData();
            }
        } catch (error) {
            console.error('Error loading historical data:', error);
            this.showSampleHistoricalData();
        } finally {
            hideLoading();
        }
    }

    displayHistoricalChart() {
        if (this.historicalData.length > 0) {
            createHistoricalChart('historicalChart', this.historicalData);
        } else {
            showNoDataMessage('historicalChart', 'No historical data available for the selected period');
        }
    }

    displayHistoricalStats() {
        const stats = this.calculateStats();
        this.updateStatsDisplay(stats);
    }

    calculateStats() {
        if (this.historicalData.length === 0) return null;

        const aqiValues = this.historicalData
            .map(record => record.aqi_value || 0)
            .filter(value => value > 0);

        if (aqiValues.length === 0) return null;

        const sum = aqiValues.reduce((a, b) => a + b, 0);
        const average = sum / aqiValues.length;
        const min = Math.min(...aqiValues);
        const max = Math.max(...aqiValues);

        // Calculate category distribution
        const categories = aqiValues.map(aqi => getAQICategoryFromValue(aqi));
        const categoryCount = {};
        categories.forEach(category => {
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        // Calculate trend (simple linear regression)
        const trend = this.calculateTrend(aqiValues);

        return {
            average: Math.round(average),
            min: min,
            max: max,
            totalRecords: aqiValues.length,
            categoryDistribution: categoryCount,
            trend: trend,
            period: {
                start: this.dateRange.start,
                end: this.dateRange.end
            }
        };
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;

        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = values;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        return slope; // Positive = improving, Negative = worsening
    }

    updateStatsDisplay(stats) {
        if (!stats) return;

        // Create or update stats container
        let statsContainer = document.querySelector('.historical-stats');
        if (!statsContainer) {
            statsContainer = document.createElement('div');
            statsContainer.className = 'historical-stats';
            
            const chartContainer = document.querySelector('.historical-chart-container');
            if (chartContainer) {
                chartContainer.parentNode.insertBefore(statsContainer, chartContainer);
            }
        }

        const trendIcon = stats.trend > 0 ? 'fa-arrow-up' : stats.trend < 0 ? 'fa-arrow-down' : 'fa-minus';
        const trendColor = stats.trend > 0 ? 'var(--error-color)' : stats.trend < 0 ? 'var(--success-color)' : 'var(--gray-500)';
        const trendText = stats.trend > 0 ? 'Worsening' : stats.trend < 0 ? 'Improving' : 'Stable';

        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Average AQI</div>
                    <div class="stat-value" style="color: ${getAQIColor(stats.average)};">${stats.average}</div>
                    <div class="stat-category">${getAQICategoryFromValue(stats.average)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Min AQI</div>
                    <div class="stat-value" style="color: ${getAQIColor(stats.min)};">${stats.min}</div>
                    <div class="stat-category">${getAQICategoryFromValue(stats.min)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Max AQI</div>
                    <div class="stat-value" style="color: ${getAQIColor(stats.max)};">${stats.max}</div>
                    <div class="stat-category">${getAQICategoryFromValue(stats.max)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Trend</div>
                    <div class="stat-value" style="color: ${trendColor};">
                        <i class="fas ${trendIcon}"></i> ${trendText}
                    </div>
                    <div class="stat-category">${stats.totalRecords} records</div>
                </div>
            </div>
            <div class="category-distribution">
                <h4>Air Quality Distribution</h4>
                <div class="distribution-bars">
                    ${Object.entries(stats.categoryDistribution).map(([category, count]) => {
                        const percentage = Math.round((count / stats.totalRecords) * 100);
                        return `
                            <div class="distribution-item">
                                <div class="distribution-label">${category}</div>
                                <div class="distribution-bar">
                                    <div class="distribution-fill ${formatAQICategory(category)}" 
                                         style="width: ${percentage}%;"></div>
                                </div>
                                <div class="distribution-percentage">${percentage}%</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // Add CSS for stats if not already added
        this.addStatsStyles();
    }

    addStatsStyles() {
        if (document.getElementById('historical-stats-styles')) return;

        const style = document.createElement('style');
        style.id = 'historical-stats-styles';
        style.textContent = `
            .historical-stats {
                background: var(--white);
                border-radius: var(--radius-lg);
                padding: var(--spacing-5);
                margin-bottom: var(--spacing-6);
                box-shadow: var(--shadow-md);
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: var(--spacing-4);
                margin-bottom: var(--spacing-6);
            }
            .stat-card {
                text-align: center;
                padding: var(--spacing-3);
                border: 1px solid var(--gray-200);
                border-radius: var(--radius-md);
            }
            .stat-label {
                font-size: var(--font-size-sm);
                color: var(--gray-600);
                margin-bottom: var(--spacing-1);
            }
            .stat-value {
                font-size: var(--font-size-xl);
                font-weight: 700;
                margin-bottom: var(--spacing-1);
            }
            .stat-category {
                font-size: var(--font-size-xs);
                color: var(--gray-500);
            }
            .category-distribution h4 {
                font-size: var(--font-size-lg);
                font-weight: 600;
                color: var(--gray-700);
                margin-bottom: var(--spacing-4);
            }
            .distribution-item {
                display: grid;
                grid-template-columns: 100px 1fr 50px;
                align-items: center;
                gap: var(--spacing-3);
                margin-bottom: var(--spacing-2);
            }
            .distribution-label {
                font-size: var(--font-size-sm);
                font-weight: 500;
                color: var(--gray-700);
            }
            .distribution-bar {
                height: 20px;
                background: var(--gray-200);
                border-radius: var(--radius-sm);
                overflow: hidden;
            }
            .distribution-fill {
                height: 100%;
                border-radius: var(--radius-sm);
                transition: width var(--transition-normal);
            }
            .distribution-percentage {
                font-size: var(--font-size-sm);
                font-weight: 500;
                color: var(--gray-600);
                text-align: right;
            }
        `;
        document.head.appendChild(style);
    }

    showSampleHistoricalData() {
        // Generate sample historical data for demonstration
        const startDate = new Date(this.dateRange.start);
        const endDate = new Date(this.dateRange.end);
        const sampleData = [];
        
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        for (let i = 0; i <= daysDiff; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const baseAQI = 120 + Math.sin(i * 0.1) * 30; // Sinusoidal pattern
            const aqi = Math.round(baseAQI + (Math.random() - 0.5) * 40);
            
            sampleData.push({
                date: date.toISOString(),
                last_update: date.toISOString(),
                aqi_value: Math.max(0, aqi),
                city: this.currentCity || 'Delhi',
                state: this.currentState || 'Delhi',
                pm25: Math.round(aqi * 0.6),
                pm10: Math.round(aqi * 0.8),
                no2: Math.round(aqi * 0.4),
                so2: Math.round(aqi * 0.3)
            });
        }
        
        this.historicalData = sampleData;
        this.displayHistoricalChart();
        this.displayHistoricalStats();
        
        showSuccess('Showing sample historical data');
    }

    showNoHistoricalData() {
        const chartContainer = document.querySelector('.historical-chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-area"></i>
                    <h3>No Historical Data</h3>
                    <p>No historical data available for the selected period and location.</p>
                    <button class="btn btn-primary" onclick="historical.loadHistoricalData()">
                        <i class="fas fa-sync-alt"></i>
                        Retry Loading
                    </button>
                </div>
            `;
        }
    }

    // Export historical data
    exportHistoricalData() {
        if (this.historicalData.length === 0) {
            showError('No historical data to export');
            return;
        }

        const csvContent = this.convertToCSV(this.historicalData);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `aqi_historical_${this.currentCity}_${this.dateRange.start}_${this.dateRange.end}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Historical data exported successfully');
    }

    convertToCSV(data) {
        const headers = ['Date', 'City', 'State', 'AQI', 'PM2.5', 'PM10', 'NO2', 'SO2'];
        const rows = data.map(record => [
            formatDate(record.date || record.last_update),
            record.city || '',
            record.state || '',
            record.aqi_value || 0,
            record.pm25 || '',
            record.pm10 || '',
            record.no2 || '',
            record.so2 || ''
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // Get data for specific date range
    getDataForRange(startDate, endDate) {
        return this.historicalData.filter(record => {
            const recordDate = new Date(record.date || record.last_update);
            return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
        });
    }
}

// Initialize historical when DOM is loaded
let historical = null;

document.addEventListener('DOMContentLoaded', () => {
    historical = new Historical();
});

// Export for global access
window.historical = historical;

