// Leaflet map utility functions

let aqiMap = null;
let mapMarkers = [];

// Initialize AQI map
function initializeAQIMap(containerId = 'aqiMap') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Map container not found:', containerId);
        return null;
    }

    // Destroy existing map
    if (aqiMap) {
        aqiMap.remove();
        aqiMap = null;
    }

    // Create map centered on India
    aqiMap = L.map(containerId, {
        center: [20.5937, 78.9629], // Center of India
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 3
    }).addTo(aqiMap);

    // Add custom controls
    addMapControls();

    return aqiMap;
}

// Add custom map controls
function addMapControls() {
    if (!aqiMap) return;

    // Add legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div class="legend-title">AQI Levels</div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #00e400;"></span>
                <span class="legend-text">Good (0-50)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #ffff00;"></span>
                <span class="legend-text">Satisfactory (51-100)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #ff7e00;"></span>
                <span class="legend-text">Moderate (101-200)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #ff0000;"></span>
                <span class="legend-text">Poor (201-300)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #8f3f97;"></span>
                <span class="legend-text">Very Poor (301-400)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color" style="background-color: #7e0023;"></span>
                <span class="legend-text">Severe (401+)</span>
            </div>
        `;
        
        // Add CSS for legend
        const style = document.createElement('style');
        style.textContent = `
            .map-legend {
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-size: 12px;
                line-height: 1.4;
                max-width: 150px;
            }
            .legend-title {
                font-weight: 600;
                margin-bottom: 8px;
                color: #374151;
            }
            .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 4px;
            }
            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 2px;
                margin-right: 6px;
                border: 1px solid rgba(0,0,0,0.1);
            }
            .legend-text {
                color: #6b7280;
                font-size: 11px;
            }
        `;
        document.head.appendChild(style);
        
        return div;
    };
    legend.addTo(aqiMap);
}

// Add AQI markers to map
function addAQIMarkers(aqiData) {
    if (!aqiMap || !Array.isArray(aqiData)) return;

    // Clear existing markers
    clearMapMarkers();

    aqiData.forEach(station => {
        if (!station.latitude || !station.longitude) return;

        const aqi = station.aqi_value || 0;
        const color = getAQIColorForMarker(aqi);
        const category = getAQICategoryFromValue(aqi);

        // Create custom marker
        const marker = L.circleMarker([station.latitude, station.longitude], {
            radius: 8,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        // Create popup content
        const popupContent = `
            <div class="map-popup">
                <div class="popup-header">
                    <h4>${station.city || 'Unknown'}, ${station.state || 'Unknown'}</h4>
                    <span class="popup-station">${station.station_name || 'Station'}</span>
                </div>
                <div class="popup-aqi">
                    <span class="aqi-value" style="color: ${color};">${aqi}</span>
                    <span class="aqi-category">${category}</span>
                </div>
                <div class="popup-details">
                    ${station.pm25 ? `<div>PM2.5: ${station.pm25} μg/m³</div>` : ''}
                    ${station.pm10 ? `<div>PM10: ${station.pm10} μg/m³</div>` : ''}
                    ${station.no2 ? `<div>NO₂: ${station.no2} μg/m³</div>` : ''}
                    ${station.so2 ? `<div>SO₂: ${station.so2} μg/m³</div>` : ''}
                </div>
                <div class="popup-time">
                    Updated: ${formatTimestamp(station.last_update)}
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
        });

        // Add click event
        marker.on('click', function() {
            // Update dashboard with selected station data
            updateDashboardWithStation(station);
        });

        marker.addTo(aqiMap);
        mapMarkers.push(marker);
    });

    // Add popup CSS
    addPopupStyles();
}

// Add popup styles
function addPopupStyles() {
    if (document.getElementById('map-popup-styles')) return;

    const style = document.createElement('style');
    style.id = 'map-popup-styles';
    style.textContent = `
        .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .map-popup {
            font-family: 'Inter', sans-serif;
            min-width: 200px;
        }
        .popup-header h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
        }
        .popup-station {
            font-size: 12px;
            color: #6b7280;
        }
        .popup-aqi {
            margin: 12px 0;
            text-align: center;
        }
        .aqi-value {
            font-size: 24px;
            font-weight: 700;
            display: block;
        }
        .aqi-category {
            font-size: 12px;
            font-weight: 500;
            color: #6b7280;
        }
        .popup-details {
            margin: 12px 0;
            font-size: 12px;
            color: #4b5563;
        }
        .popup-details div {
            margin-bottom: 2px;
        }
        .popup-time {
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
        }
    `;
    document.head.appendChild(style);
}

// Get AQI color for markers
function getAQIColorForMarker(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 200) return '#ff7e00';
    if (aqi <= 300) return '#ff0000';
    if (aqi <= 400) return '#8f3f97';
    return '#7e0023';
}

// Clear all markers from map
function clearMapMarkers() {
    mapMarkers.forEach(marker => {
        if (aqiMap && aqiMap.hasLayer(marker)) {
            aqiMap.removeLayer(marker);
        }
    });
    mapMarkers = [];
}

// Center map on specific location
function centerMapOnLocation(lat, lng, zoom = 10) {
    if (!aqiMap) return;
    
    aqiMap.setView([lat, lng], zoom, {
        animate: true,
        duration: 1
    });
}

// Add user location marker
function addUserLocationMarker(lat, lng) {
    if (!aqiMap) return;

    // Remove existing user location marker
    if (window.userLocationMarker) {
        aqiMap.removeLayer(window.userLocationMarker);
    }

    // Create user location marker
    window.userLocationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: '<i class="fas fa-map-marker-alt"></i>',
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        })
    });

    window.userLocationMarker.bindPopup('Your Location');
    window.userLocationMarker.addTo(aqiMap);

    // Add user location marker styles
    addUserLocationStyles();
}

// Add user location marker styles
function addUserLocationStyles() {
    if (document.getElementById('user-location-styles')) return;

    const style = document.createElement('style');
    style.id = 'user-location-styles';
    style.textContent = `
        .user-location-marker {
            background: transparent;
            border: none;
        }
        .user-location-marker i {
            color: #2563eb;
            font-size: 20px;
            text-shadow: 0 0 3px rgba(0,0,0,0.3);
        }
    `;
    document.head.appendChild(style);
}

// Get user's current location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                resolve({ lat, lng });
            },
            error => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    });
}

// Update dashboard with selected station data
function updateDashboardWithStation(station) {
    // This function will be called when a marker is clicked
    // It should update the main dashboard with the selected station's data
    
    // Update current AQI display
    const currentAQI = document.getElementById('currentAQI');
    const currentCategory = document.getElementById('currentCategory');
    const currentLocation = document.getElementById('currentLocation');
    const lastUpdate = document.getElementById('lastUpdate');

    if (currentAQI) currentAQI.textContent = station.aqi_value || '--';
    if (currentCategory) {
        const category = getAQICategoryFromValue(station.aqi_value || 0);
        currentCategory.textContent = category;
        currentCategory.className = `aqi-category ${formatAQICategory(category)}`;
    }
    if (currentLocation) {
        currentLocation.textContent = `${station.city || 'Unknown'}, ${station.state || 'Unknown'}`;
    }
    if (lastUpdate) {
        lastUpdate.textContent = `Last updated: ${formatTimestamp(station.last_update)}`;
    }

    // Update pollutant values
    const pm25Value = document.getElementById('pm25Value');
    const pm10Value = document.getElementById('pm10Value');
    const no2Value = document.getElementById('no2Value');
    const so2Value = document.getElementById('so2Value');

    if (pm25Value) pm25Value.textContent = station.pm25 || '--';
    if (pm10Value) pm10Value.textContent = station.pm10 || '--';
    if (no2Value) no2Value.textContent = station.no2 || '--';
    if (so2Value) so2Value.textContent = station.so2 || '--';

    // Show success message
    showSuccess(`Selected ${station.city}, ${station.state}`);
}

// Resize map when container size changes
function resizeMap() {
    if (aqiMap) {
        setTimeout(() => {
            aqiMap.invalidateSize();
        }, 100);
    }
}

// Export functions for global use
window.initializeAQIMap = initializeAQIMap;
window.addAQIMarkers = addAQIMarkers;
window.clearMapMarkers = clearMapMarkers;
window.centerMapOnLocation = centerMapOnLocation;
window.addUserLocationMarker = addUserLocationMarker;
window.getUserLocation = getUserLocation;
window.updateDashboardWithStation = updateDashboardWithStation;
window.resizeMap = resizeMap;

