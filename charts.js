// Chart.js utility functions and configurations

// Global chart instances
let trendChart = null;
let forecastChart = null;
let historicalChart = null;

// Chart.js default configuration
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = '#e2e8f0';
Chart.defaults.backgroundColor = 'rgba(37, 99, 235, 0.1)';

// Common chart options
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        intersect: false,
        mode: 'index'
    },
    plugins: {
        legend: {
            display: true,
            position: 'top',
            labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                    size: 12,
                    weight: '500'
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#374151',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            padding: 12,
            titleFont: {
                size: 14,
                weight: '600'
            },
            bodyFont: {
                size: 13
            }
        }
    },
    scales: {
        x: {
            grid: {
                display: true,
                color: '#f1f5f9'
            },
            ticks: {
                font: {
                    size: 11
                }
            }
        },
        y: {
            grid: {
                display: true,
                color: '#f1f5f9'
            },
            ticks: {
                font: {
                    size: 11
                }
            }
        }
    }
};

// AQI color mapping function
function getAQIColorForValue(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 200) return '#ff7e00';
    if (aqi <= 300) return '#ff0000';
    if (aqi <= 400) return '#8f3f97';
    return '#7e0023';
}

// Generate gradient for AQI values
function createAQIGradient(ctx, chartArea, data) {
    if (!chartArea) return '#2563eb';
    
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    
    // Add color stops based on AQI ranges
    gradient.addColorStop(0, '#00e400');    // Good (0-50)
    gradient.addColorStop(0.2, '#ffff00');  // Satisfactory (51-100)
    gradient.addColorStop(0.4, '#ff7e00');  // Moderate (101-200)
    gradient.addColorStop(0.6, '#ff0000');  // Poor (201-300)
    gradient.addColorStop(0.8, '#8f3f97');  // Very Poor (301-400)
    gradient.addColorStop(1, '#7e0023');    // Severe (401+)
    
    return gradient;
}

// Create 24-hour trend chart
function createTrendChart(canvasId, data = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (trendChart) {
        trendChart.destroy();
    }

    // Prepare data
    const labels = data.map(item => {
        const date = new Date(item.last_update || item.timestamp);
        return date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        });
    });

    const aqiValues = data.map(item => item.aqi_value || 0);
    const colors = aqiValues.map(aqi => getAQIColorForValue(aqi));

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'AQI',
                data: aqiValues,
                borderColor: '#2563eb',
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return '#2563eb';
                    return createAQIGradient(ctx, chartArea, aqiValues);
                },
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: '24-Hour AQI Trend',
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: 20
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            const aqi = context.parsed.y;
                            const category = getAQICategoryFromValue(aqi);
                            return `AQI: ${aqi} (${category})`;
                        }
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    beginAtZero: true,
                    max: 500,
                    title: {
                        display: true,
                        text: 'AQI Value'
                    }
                }
            }
        }
    });

    return trendChart;
}

// Create forecast chart
function createForecastChart(canvasId, data = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (forecastChart) {
        forecastChart.destroy();
    }

    // Prepare data
    const labels = data.map(item => {
        const date = new Date(item.forecast_date || item.date);
        return date.toLocaleDateString('en-IN', { 
            month: 'short', 
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
    });

    const aqiValues = data.map(item => item.predicted_aqi || item.aqi_value || 0);
    const confidence = data.map(item => (item.confidence_score || 0.8) * 100);

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted AQI',
                data: aqiValues,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: aqiValues.map(aqi => getAQIColorForValue(aqi)),
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }, {
                label: 'Confidence %',
                data: confidence,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y1'
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'AQI Forecast',
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: 20
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                const aqi = context.parsed.y;
                                const category = getAQICategoryFromValue(aqi);
                                return `Predicted AQI: ${aqi} (${category})`;
                            } else {
                                return `Confidence: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    beginAtZero: true,
                    max: 500,
                    title: {
                        display: true,
                        text: 'AQI Value'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Confidence %'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });

    return forecastChart;
}

// Create historical chart
function createHistoricalChart(canvasId, data = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (historicalChart) {
        historicalChart.destroy();
    }

    // Group data by pollutant
    const pollutants = ['PM2.5', 'PM10', 'NO2', 'SO2'];
    const datasets = [];

    pollutants.forEach((pollutant, index) => {
        const pollutantData = data.filter(item => item.pollutant_id === pollutant);
        
        if (pollutantData.length > 0) {
            const colors = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'];
            
            datasets.push({
                label: pollutant,
                data: pollutantData.map(item => ({
                    x: new Date(item.last_update || item.date),
                    y: item.pollutant_avg || item.aqi_value || 0
                })),
                borderColor: colors[index],
                backgroundColor: colors[index] + '20',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5
            });
        }
    });

    // If no pollutant data, show AQI values
    if (datasets.length === 0 && data.length > 0) {
        datasets.push({
            label: 'AQI',
            data: data.map(item => ({
                x: new Date(item.last_update || item.date),
                y: item.aqi_value || 0
            })),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
        });
    }

    historicalChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Historical Air Quality Data',
                    font: {
                        size: 16,
                        weight: '600'
                    },
                    padding: 20
                },
                tooltip: {
                    ...commonOptions.plugins.tooltip,
                    callbacks: {
                        title: function(context) {
                            return new Date(context[0].parsed.x).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                timeZone: 'Asia/Kolkata'
                            });
                        },
                        label: function(context) {
                            const value = context.parsed.y;
                            const label = context.dataset.label;
                            
                            if (label === 'AQI') {
                                const category = getAQICategoryFromValue(value);
                                return `${label}: ${value} (${category})`;
                            } else {
                                return `${label}: ${value} μg/m³`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM dd'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    grid: {
                        display: true,
                        color: '#f1f5f9'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Concentration (μg/m³) / AQI'
                    },
                    grid: {
                        display: true,
                        color: '#f1f5f9'
                    }
                }
            }
        }
    });

    return historicalChart;
}

// Helper function to get AQI category from value
function getAQICategoryFromValue(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
}

// Update chart data
function updateChartData(chart, newData) {
    if (!chart || !newData) return;
    
    chart.data = newData;
    chart.update('active');
}

// Destroy all charts
function destroyAllCharts() {
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
    if (forecastChart) {
        forecastChart.destroy();
        forecastChart = null;
    }
    if (historicalChart) {
        historicalChart.destroy();
        historicalChart = null;
    }
}

// Show no data message
function showNoDataMessage(containerId, message = 'No data available') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="chart-no-data">
            <i class="fas fa-chart-line"></i>
            ${message}
        </div>
    `;
}

// Export functions for global use
window.createTrendChart = createTrendChart;
window.createForecastChart = createForecastChart;
window.createHistoricalChart = createHistoricalChart;
window.updateChartData = updateChartData;
window.destroyAllCharts = destroyAllCharts;
window.showNoDataMessage = showNoDataMessage;
window.getAQICategoryFromValue = getAQICategoryFromValue;

