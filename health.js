// Health component functionality

class Health {
    constructor() {
        this.currentAQI = 0;
        this.isSensitiveGroup = false;
        this.recommendations = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadHealthRecommendations();
    }

    setupEventListeners() {
        // Sensitive group checkbox
        const sensitiveGroupCheckbox = document.getElementById('sensitiveGroup');
        if (sensitiveGroupCheckbox) {
            sensitiveGroupCheckbox.addEventListener('change', (e) => {
                this.isSensitiveGroup = e.target.checked;
                this.saveUserPreferences();
                this.loadHealthRecommendations();
            });
        }

        // Update recommendations button
        const updateRecommendationsBtn = document.getElementById('updateRecommendationsBtn');
        if (updateRecommendationsBtn) {
            updateRecommendationsBtn.addEventListener('click', () => {
                this.loadHealthRecommendations();
            });
        }

        // Listen for AQI changes from dashboard
        document.addEventListener('aqiUpdated', (event) => {
            this.currentAQI = event.detail.aqi;
            this.loadHealthRecommendations();
        });

        // Load recommendations when health section becomes active
        const healthSection = document.getElementById('health');
        if (healthSection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (healthSection.classList.contains('active')) {
                            this.loadHealthRecommendations();
                        }
                    }
                });
            });
            observer.observe(healthSection, { attributes: true });
        }

        // Load user preferences
        this.loadUserPreferences();
    }

    loadUserPreferences() {
        const preferences = loadFromLocalStorage('healthPreferences', {});
        
        this.isSensitiveGroup = preferences.isSensitiveGroup || false;
        
        // Update UI
        const sensitiveGroupCheckbox = document.getElementById('sensitiveGroup');
        if (sensitiveGroupCheckbox) {
            sensitiveGroupCheckbox.checked = this.isSensitiveGroup;
        }
    }

    saveUserPreferences() {
        const preferences = {
            isSensitiveGroup: this.isSensitiveGroup
        };
        
        saveToLocalStorage('healthPreferences', preferences);
    }

    async loadHealthRecommendations() {
        try {
            // Get current AQI from dashboard if not set
            if (!this.currentAQI && window.dashboard) {
                const currentAQIElement = document.getElementById('currentAQI');
                if (currentAQIElement) {
                    this.currentAQI = parseInt(currentAQIElement.textContent) || 0;
                }
            }

            if (this.currentAQI === 0) {
                this.showDefaultRecommendations();
                return;
            }

            // Load recommendations from API
            const response = await api.getHealthRecommendations(this.currentAQI, this.isSensitiveGroup);
            
            if (response.success && response.recommendations) {
                this.recommendations = response.recommendations;
                this.displayRecommendations();
            } else {
                this.generateLocalRecommendations();
            }
        } catch (error) {
            console.error('Error loading health recommendations:', error);
            this.generateLocalRecommendations();
        }
    }

    generateLocalRecommendations() {
        const aqi = this.currentAQI;
        const sensitive = this.isSensitiveGroup;
        const category = getAQICategoryFromValue(aqi);
        
        this.recommendations = this.getRecommendationsByCategory(category, sensitive);
        this.displayRecommendations();
    }

    getRecommendationsByCategory(category, sensitive) {
        const baseRecommendations = {
            'Good': [
                {
                    title: 'Enjoy Outdoor Activities',
                    content: 'Air quality is excellent. Perfect time for outdoor activities, exercise, and sports.',
                    icon: 'fa-running',
                    type: 'success'
                },
                {
                    title: 'Open Windows',
                    content: 'You can safely open windows and doors to let fresh air circulate in your home.',
                    icon: 'fa-home',
                    type: 'success'
                }
            ],
            'Satisfactory': [
                {
                    title: 'Generally Safe',
                    content: 'Air quality is acceptable for most people. Outdoor activities are generally safe.',
                    icon: 'fa-check-circle',
                    type: 'success'
                },
                {
                    title: 'Monitor Sensitive Individuals',
                    content: sensitive ? 'Consider reducing prolonged outdoor activities if you experience symptoms.' : 'Sensitive individuals should monitor their health.',
                    icon: 'fa-heart',
                    type: 'info'
                }
            ],
            'Moderate': [
                {
                    title: 'Limit Outdoor Activities',
                    content: sensitive ? 'Avoid prolonged outdoor activities. Consider wearing a mask when outside.' : 'Sensitive individuals should limit prolonged outdoor activities.',
                    icon: 'fa-exclamation-triangle',
                    type: 'warning'
                },
                {
                    title: 'Use Air Purifiers',
                    content: 'Consider using air purifiers indoors, especially in bedrooms and living areas.',
                    icon: 'fa-wind',
                    type: 'info'
                },
                {
                    title: 'Stay Hydrated',
                    content: 'Drink plenty of water to help your body cope with air pollution.',
                    icon: 'fa-tint',
                    type: 'info'
                }
            ],
            'Poor': [
                {
                    title: 'Avoid Outdoor Exercise',
                    content: 'Avoid outdoor exercise and activities. Stay indoors as much as possible.',
                    icon: 'fa-ban',
                    type: 'urgent'
                },
                {
                    title: 'Wear N95 Masks',
                    content: 'Wear N95 or equivalent masks when you must go outside.',
                    icon: 'fa-head-side-mask',
                    type: 'urgent'
                },
                {
                    title: 'Keep Windows Closed',
                    content: 'Keep windows and doors closed. Use air conditioning with clean filters.',
                    icon: 'fa-window-close',
                    type: 'warning'
                },
                {
                    title: 'Monitor Health',
                    content: sensitive ? 'Monitor your health closely. Seek medical attention if you experience breathing difficulties.' : 'Sensitive individuals should monitor health closely.',
                    icon: 'fa-heartbeat',
                    type: 'urgent'
                }
            ],
            'Very Poor': [
                {
                    title: 'Stay Indoors',
                    content: 'Stay indoors and avoid all outdoor activities. This is especially important for sensitive groups.',
                    icon: 'fa-home',
                    type: 'urgent'
                },
                {
                    title: 'Use High-Quality Masks',
                    content: 'If you must go outside, wear N95 or P100 masks. Avoid cloth masks.',
                    icon: 'fa-head-side-mask',
                    type: 'urgent'
                },
                {
                    title: 'Run Air Purifiers',
                    content: 'Run air purifiers continuously. Consider creating a clean air room.',
                    icon: 'fa-wind',
                    type: 'urgent'
                },
                {
                    title: 'Seek Medical Advice',
                    content: sensitive ? 'Consider consulting a doctor, especially if you have respiratory conditions.' : 'Sensitive individuals should consider medical consultation.',
                    icon: 'fa-user-md',
                    type: 'urgent'
                }
            ],
            'Severe': [
                {
                    title: 'Emergency Precautions',
                    content: 'This is a health emergency. Stay indoors and avoid all outdoor exposure.',
                    icon: 'fa-exclamation-circle',
                    type: 'urgent'
                },
                {
                    title: 'Seal Your Home',
                    content: 'Seal gaps around doors and windows. Use tape if necessary to prevent outdoor air from entering.',
                    icon: 'fa-shield-alt',
                    type: 'urgent'
                },
                {
                    title: 'Medical Attention',
                    content: 'Seek immediate medical attention if you experience any breathing difficulties or chest pain.',
                    icon: 'fa-ambulance',
                    type: 'urgent'
                },
                {
                    title: 'Emergency Kit',
                    content: 'Keep emergency medications readily available. Have a plan for evacuation if necessary.',
                    icon: 'fa-first-aid',
                    type: 'urgent'
                }
            ]
        };

        return baseRecommendations[category] || baseRecommendations['Moderate'];
    }

    displayRecommendations() {
        const container = document.getElementById('healthRecommendations');
        if (!container) return;

        if (this.recommendations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h3>No Recommendations</h3>
                    <p>Unable to load health recommendations at this time.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recommendations.map(rec => `
            <div class="recommendation-card recommendation-${rec.type} fade-in">
                <div class="recommendation-title">
                    <i class="fas ${rec.icon}"></i>
                    ${rec.title}
                </div>
                <div class="recommendation-content">
                    ${rec.content}
                </div>
            </div>
        `).join('');

        // Add current AQI context
        this.addAQIContext(container);
    }

    addAQIContext(container) {
        const category = getAQICategoryFromValue(this.currentAQI);
        const contextCard = document.createElement('div');
        contextCard.className = 'recommendation-card recommendation-info';
        contextCard.innerHTML = `
            <div class="recommendation-title">
                <i class="fas fa-info-circle"></i>
                Current Air Quality
            </div>
            <div class="recommendation-content">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.5rem; font-weight: 700; color: ${getAQIColor(this.currentAQI)};">
                        ${this.currentAQI}
                    </span>
                    <span class="aqi-category ${formatAQICategory(category)}" style="margin: 0;">
                        ${category}
                    </span>
                </div>
                <p style="margin: 0; font-size: 0.875rem; color: var(--gray-600);">
                    ${this.getAQIDescription(category)}
                </p>
                ${this.isSensitiveGroup ? '<p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: var(--warning-color);"><i class="fas fa-exclamation-triangle"></i> Sensitive group settings enabled</p>' : ''}
            </div>
        `;
        
        container.insertBefore(contextCard, container.firstChild);
    }

    getAQIDescription(category) {
        const descriptions = {
            'Good': 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
            'Satisfactory': 'Air quality is acceptable; however, there may be a moderate health concern for a very small number of people.',
            'Moderate': 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
            'Poor': 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.',
            'Very Poor': 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
            'Severe': 'Health alert: everyone may experience more serious health effects.'
        };
        
        return descriptions[category] || 'Air quality information not available.';
    }

    showDefaultRecommendations() {
        const container = document.getElementById('healthRecommendations');
        if (!container) return;

        container.innerHTML = `
            <div class="recommendation-card recommendation-info">
                <div class="recommendation-title">
                    <i class="fas fa-info-circle"></i>
                    General Health Tips
                </div>
                <div class="recommendation-content">
                    <p>Select a city to get personalized health recommendations based on current air quality conditions.</p>
                </div>
            </div>
            <div class="recommendation-card recommendation-success">
                <div class="recommendation-title">
                    <i class="fas fa-leaf"></i>
                    Stay Healthy
                </div>
                <div class="recommendation-content">
                    <ul style="margin: 0; padding-left: 1.2rem;">
                        <li>Monitor air quality regularly</li>
                        <li>Stay hydrated throughout the day</li>
                        <li>Maintain good indoor air quality</li>
                        <li>Consider using air purifiers</li>
                        <li>Consult healthcare providers for respiratory concerns</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Get health risk level
    getHealthRiskLevel() {
        const category = getAQICategoryFromValue(this.currentAQI);
        const riskLevels = {
            'Good': 'Low',
            'Satisfactory': 'Low',
            'Moderate': 'Medium',
            'Poor': 'High',
            'Very Poor': 'Very High',
            'Severe': 'Hazardous'
        };
        
        return riskLevels[category] || 'Unknown';
    }

    // Get recommended activities
    getRecommendedActivities() {
        const category = getAQICategoryFromValue(this.currentAQI);
        const activities = {
            'Good': ['Outdoor sports', 'Jogging', 'Cycling', 'Walking', 'Gardening'],
            'Satisfactory': ['Light outdoor activities', 'Walking', 'Gardening'],
            'Moderate': ['Indoor activities', 'Light indoor exercise'],
            'Poor': ['Indoor activities only', 'Avoid outdoor exercise'],
            'Very Poor': ['Stay indoors', 'Minimal outdoor exposure'],
            'Severe': ['Emergency indoor shelter', 'No outdoor activities']
        };
        
        return activities[category] || ['Monitor air quality'];
    }

    // Export health report
    exportHealthReport() {
        const category = getAQICategoryFromValue(this.currentAQI);
        const riskLevel = this.getHealthRiskLevel();
        const activities = this.getRecommendedActivities();
        
        const report = {
            timestamp: new Date().toISOString(),
            aqi: this.currentAQI,
            category: category,
            riskLevel: riskLevel,
            sensitiveGroup: this.isSensitiveGroup,
            recommendations: this.recommendations.map(rec => ({
                title: rec.title,
                content: rec.content,
                type: rec.type
            })),
            recommendedActivities: activities
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `health_report_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Health report exported successfully');
    }
}

// Initialize health when DOM is loaded
let health = null;

document.addEventListener('DOMContentLoaded', () => {
    health = new Health();
});

// Export for global access
window.health = health;

