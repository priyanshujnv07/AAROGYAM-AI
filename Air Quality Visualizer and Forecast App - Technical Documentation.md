# Air Quality Visualizer and Forecast App - Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Backend Components](#backend-components)
4. [Frontend Components](#frontend-components)
5. [Data Sources](#data-sources)
6. [Machine Learning Model](#machine-learning-model)
7. [API Documentation](#api-documentation)
8. [Deployment Guide](#deployment-guide)
9. [Development Setup](#development-setup)
10. [Future Enhancements](#future-enhancements)

## System Architecture

The Air Quality Visualizer and Forecast App follows a client-server architecture with separate frontend and backend components. The system is designed to be scalable, maintainable, and extensible.

### High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Data Sources   │────▶│    Backend      │────▶│    Frontend     │
│  (APIs, Sensors)│     │  (Flask, ML)    │     │  (HTML/JS/CSS)  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │    Database     │     │     Users       │
                        │   (SQLite/SQL)  │     │                 │
                        │                 │     │                 │
                        └─────────────────┘     └─────────────────┘
```

### Data Flow

1. External data sources (CPCB, IMD, satellite data) provide raw air quality and meteorological data
2. Backend services fetch, process, and store this data in the database
3. Machine learning models generate forecasts based on historical and meteorological data
4. API endpoints serve processed data to the frontend
5. Frontend components render visualizations and user interfaces
6. User interactions trigger API calls to fetch or update data

## Technology Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite (development), PostgreSQL (production)
- **Machine Learning**: scikit-learn, TensorFlow
- **Data Processing**: Pandas, NumPy
- **API**: RESTful JSON API

### Frontend
- **Core**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js
- **Visualization**: Chart.js
- **UI Components**: Custom components
- **Responsive Design**: CSS Grid and Flexbox

### DevOps
- **Version Control**: Git
- **Deployment**: Static hosting for frontend, Flask deployment for backend
- **CI/CD**: Manual deployment process

## Backend Components

### Core Modules

#### Main Application (`main.py`)
Entry point for the Flask application that initializes all components and starts the server.

```python
# Key components
from flask import Flask, jsonify
from flask_cors import CORS
from routes.aqi_routes import aqi_bp
from routes.ml_routes import ml_bp

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register blueprints
app.register_blueprint(aqi_bp, url_prefix='/api/aqi')
app.register_blueprint(ml_bp, url_prefix='/api/ml')

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

#### Data Models (`models/`)
Database models for storing air quality data, user preferences, and forecast results.

- `aqi_data.py`: Model for air quality measurements
- `user.py`: Model for user preferences and settings

#### Data Ingestion (`data_ingestion/`)
Services for fetching data from external sources.

- `cpcb_ingestion.py`: Fetches data from CPCB API
- `weather_ingestion.py`: Fetches meteorological data

#### API Routes (`routes/`)
API endpoints for frontend communication.

- `aqi_routes.py`: Endpoints for air quality data
- `ml_routes.py`: Endpoints for machine learning forecasts

#### Machine Learning (`ml_models/`)
Models and services for air quality forecasting.

- `aqi_forecasting.py`: ML model implementation
- `model_service.py`: Service for model training and inference

### Key API Endpoints

#### Air Quality Data
- `GET /api/aqi/realtime?city={city}&limit={limit}`: Get real-time AQI data
- `GET /api/aqi/historical?city={city}&start={start_date}&end={end_date}`: Get historical AQI data
- `GET /api/aqi/health-recommendations?aqi={aqi}&sensitive={sensitive}`: Get health recommendations

#### Machine Learning
- `GET /api/ml/model/info`: Get information about the current ML model
- `POST /api/ml/forecast?city={city}&days={days}`: Generate AQI forecast
- `POST /api/ml/train`: Trigger model retraining

## Frontend Components

### Core Structure

```
public/
├── index.html           # Main HTML file
├── favicon.ico          # Site favicon
└── manifest.json        # PWA manifest

src/
├── components/          # UI components
│   ├── dashboard.js     # Dashboard component
│   ├── forecast.js      # Forecast component
│   ├── historical.js    # Historical data component
│   └── health.js        # Health recommendations component
├── styles/              # CSS styles
│   ├── main.css         # Main styles
│   ├── components.css   # Component-specific styles
│   └── responsive.css   # Responsive design styles
└── utils/               # Utility functions
    ├── api.js           # API communication
    ├── charts.js        # Chart.js integration
    ├── maps.js          # Leaflet maps integration
    └── app.js           # Main application logic
```

### Key Components

#### Dashboard Component
Displays real-time air quality data and interactive map.

```javascript
// Key functionality
function initializeDashboard() {
    // Initialize map
    const map = initializeMap('map-container');
    
    // Load current city data
    loadCityData(getCurrentCity())
        .then(data => {
            updateAQIDisplay(data);
            updatePollutantLevels(data);
            updateMap(map, data);
        })
        .catch(error => {
            showError('Failed to load data');
            console.error(error);
        });
}
```

#### Forecast Component
Shows predictive air quality information.

```javascript
// Key functionality
function generateForecast(city) {
    showLoading();
    
    fetchForecast(city, 3)
        .then(data => {
            renderForecastCards(data.daily);
            renderForecastChart(data.hourly);
            hideLoading();
        })
        .catch(error => {
            showError('Failed to generate forecast');
            hideLoading();
            console.error(error);
        });
}
```

#### Maps Integration
Leaflet.js integration for interactive maps.

```javascript
// Key functionality
function initializeMap(containerId) {
    const map = L.map(containerId).setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    return map;
}

function updateMap(map, aqiData) {
    // Clear existing markers
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    // Add new markers
    aqiData.stations.forEach(station => {
        const color = getAQIColor(station.aqi);
        const marker = L.circleMarker([station.lat, station.lng], {
            radius: 10,
            fillColor: color,
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${station.name}</strong><br>
            AQI: ${station.aqi}<br>
            Status: ${getAQIStatus(station.aqi)}
        `);
    });
}
```

## Data Sources

### Central Pollution Control Board (CPCB)
- **API Endpoint**: https://www.data.gov.in/resource/real-time-air-quality-index-various-locations
- **Data Format**: JSON
- **Update Frequency**: Hourly
- **Parameters**: PM2.5, PM10, NO₂, SO₂, O₃, CO

### Indian Meteorological Department (IMD)
- **API Endpoint**: Weather forecast API
- **Data Format**: JSON
- **Update Frequency**: 3-hourly
- **Parameters**: Temperature, humidity, wind speed, precipitation

### Satellite Data
- **Source**: ISRO Bhuvan platform
- **Data Format**: GeoTIFF/JSON
- **Update Frequency**: Daily
- **Parameters**: Aerosol optical depth, derived PM2.5

## Machine Learning Model

### Model Architecture

The forecasting system uses a hybrid approach combining:
1. **Time Series Analysis**: ARIMA models for trend and seasonality
2. **Machine Learning**: Random Forest for feature-based prediction
3. **Ensemble Method**: Weighted average of multiple models

### Features Used

- Historical AQI values (past 7 days)
- Day of week
- Weather parameters (temperature, humidity, wind speed, precipitation)
- Holiday/festival indicators
- Previous year's data for the same period

### Training Process

```python
def train_model(historical_data, weather_data):
    # Prepare features
    X, y = prepare_features(historical_data, weather_data)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train models
    models = {
        'rf': RandomForestRegressor(n_estimators=100, random_state=42),
        'gbm': GradientBoostingRegressor(random_state=42),
        'linear': LinearRegression()
    }
    
    for name, model in models.items():
        model.fit(X_train, y_train)
        
    # Evaluate models
    results = {}
    for name, model in models.items():
        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        results[name] = {'mae': mae, 'rmse': rmse, 'model': model}
    
    # Select best model
    best_model = min(results.items(), key=lambda x: x[1]['mae'])
    
    return best_model[1]['model']
```

### Prediction Process

```python
def generate_forecast(model, city, days=3):
    # Get latest data
    latest_aqi = get_latest_aqi(city)
    weather_forecast = get_weather_forecast(city, days)
    
    # Prepare features for prediction
    features = prepare_prediction_features(latest_aqi, weather_forecast)
    
    # Generate predictions
    predictions = []
    for day_features in features:
        aqi_prediction = model.predict([day_features])[0]
        confidence = calculate_confidence(model, day_features)
        predictions.append({
            'date': day_features['date'],
            'aqi': aqi_prediction,
            'confidence': confidence
        })
    
    return predictions
```

## API Documentation

### Authentication
Currently, the API does not require authentication. This may change in future versions.

### Rate Limiting
- 100 requests per hour per IP address
- 1000 requests per day per IP address

### Endpoints

#### GET /api/aqi/realtime
Get real-time AQI data for a specific city.

**Parameters:**
- `city` (string, required): City name
- `limit` (integer, optional): Number of records to return (default: 1)

**Response:**
```json
{
  "status": "success",
  "data": {
    "city": "Delhi",
    "timestamp": "2025-07-01T12:00:00Z",
    "aqi": 156,
    "category": "Unhealthy",
    "pollutants": {
      "pm25": 75.2,
      "pm10": 142.8,
      "no2": 45.6,
      "so2": 12.3
    },
    "stations": [
      {
        "name": "Anand Vihar",
        "lat": 28.6468,
        "lng": 77.3022,
        "aqi": 182
      },
      {
        "name": "ITO",
        "lat": 28.6289,
        "lng": 77.2410,
        "aqi": 145
      }
    ]
  }
}
```

#### GET /api/aqi/historical
Get historical AQI data for a specific city and date range.

**Parameters:**
- `city` (string, required): City name
- `start` (string, required): Start date (YYYY-MM-DD)
- `end` (string, required): End date (YYYY-MM-DD)

**Response:**
```json
{
  "status": "success",
  "data": {
    "city": "Delhi",
    "period": {
      "start": "2025-06-01",
      "end": "2025-06-30"
    },
    "daily": [
      {
        "date": "2025-06-01",
        "aqi": 145,
        "pollutants": {
          "pm25": 68.5,
          "pm10": 132.1,
          "no2": 42.3,
          "so2": 10.8
        }
      },
      // More daily records...
    ]
  }
}
```

#### GET /api/aqi/health-recommendations
Get health recommendations based on AQI level.

**Parameters:**
- `aqi` (integer, required): Current AQI value
- `sensitive` (boolean, optional): Whether the user belongs to a sensitive group

**Response:**
```json
{
  "status": "success",
  "data": {
    "aqi": 156,
    "category": "Unhealthy",
    "general_population": [
      "Reduce prolonged or heavy exertion",
      "Take more breaks during outdoor activities",
      "Consider moving activities indoors or rescheduling"
    ],
    "sensitive_groups": [
      "Avoid prolonged or heavy exertion",
      "Consider moving activities indoors",
      "Use air purifiers indoors",
      "Wear N95 masks when outdoors"
    ]
  }
}
```

#### POST /api/ml/forecast
Generate AQI forecast for a specific city.

**Parameters:**
- `city` (string, required): City name
- `days` (integer, optional): Number of days to forecast (default: 3)

**Response:**
```json
{
  "status": "success",
  "data": {
    "city": "Delhi",
    "generated_at": "2025-07-01T12:00:00Z",
    "daily": [
      {
        "date": "2025-07-02",
        "aqi": 162,
        "category": "Unhealthy",
        "confidence": 0.85
      },
      {
        "date": "2025-07-03",
        "aqi": 158,
        "category": "Unhealthy",
        "confidence": 0.78
      },
      {
        "date": "2025-07-04",
        "aqi": 145,
        "category": "Unhealthy for Sensitive Groups",
        "confidence": 0.72
      }
    ],
    "hourly": [
      {
        "timestamp": "2025-07-02T00:00:00Z",
        "aqi": 148
      },
      // More hourly records...
    ]
  }
}
```

## Deployment Guide

### Prerequisites
- Python 3.8+
- Node.js 14+ (for development tools)
- Git
- Web server (Nginx/Apache)

### Backend Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/air-quality-app.git
   cd air-quality-backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Initialize the database:
   ```bash
   python init_db.py
   ```

6. Start the server:
   ```bash
   python src/main.py
   ```

7. For production deployment, use Gunicorn:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 src.main:app
   ```

### Frontend Deployment

1. Navigate to the frontend directory:
   ```bash
   cd air-quality-frontend
   ```

2. Configure API endpoint:
   ```bash
   # Edit src/utils/api.js to point to your backend
   ```

3. Deploy to a static web server:
   ```bash
   # Copy the public directory to your web server's root
   cp -r public/* /var/www/html/
   ```

4. Configure your web server (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /var/www/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## Development Setup

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/air-quality-app.git
   cd air-quality-backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Initialize the database:
   ```bash
   python init_db.py
   ```

6. Start the development server:
   ```bash
   python src/main.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd air-quality-frontend
   ```

2. Configure API endpoint for development:
   ```bash
   # Edit src/utils/api.js to point to your local backend
   ```

3. Open the application in a browser:
   ```bash
   # Simply open public/index.html in your browser
   ```

## Future Enhancements

### Short-term Improvements
1. **User Accounts**: Add user registration and authentication
2. **Mobile App**: Develop native mobile applications for Android and iOS
3. **Offline Support**: Implement Progressive Web App features for offline usage
4. **More Cities**: Expand coverage to more cities and rural areas

### Medium-term Roadmap
1. **Advanced ML Models**: Implement deep learning models for more accurate forecasting
2. **Pollution Source Identification**: Add features to identify and display pollution sources
3. **Community Reporting**: Allow users to report local pollution events
4. **Integration with Smart Home**: Connect with air purifiers and other smart home devices

### Long-term Vision
1. **Global Coverage**: Expand the application to cover international locations
2. **Sensor Network**: Develop low-cost sensors for community deployment
3. **Policy Impact**: Provide data and insights to policymakers
4. **Research Platform**: Create an open platform for air quality research

---

## Contributing

We welcome contributions to the Air Quality Visualizer and Forecast App! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

