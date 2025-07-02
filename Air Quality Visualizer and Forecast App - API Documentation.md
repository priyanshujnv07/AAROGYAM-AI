# Air Quality Visualizer and Forecast App - API Documentation

## Overview

This document provides detailed information about the API endpoints available in the Air Quality Visualizer and Forecast App. These endpoints allow developers to access real-time air quality data, historical trends, forecasts, and health recommendations.

## Base URL

```
https://api.airqualityapp.org/v1
```

For local development:

```
http://localhost:5000/api
```

## Authentication

Currently, the API does not require authentication. This may change in future versions.

## Rate Limiting

- 100 requests per hour per IP address
- 1000 requests per day per IP address

## Response Format

All API responses are returned in JSON format with the following structure:

```json
{
  "status": "success",
  "data": {
    // Response data specific to each endpoint
  }
}
```

In case of an error:

```json
{
  "status": "error",
  "error": {
    "code": 400,
    "message": "Invalid parameters"
  }
}
```

## API Endpoints

### Air Quality Data

#### GET /aqi/realtime

Get real-time AQI data for a specific city.

**Parameters:**
- `city` (string, required): City name
- `limit` (integer, optional): Number of records to return (default: 1)

**Example Request:**
```
GET /api/aqi/realtime?city=Delhi&limit=5
```

**Example Response:**
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

#### GET /aqi/historical

Get historical AQI data for a specific city and date range.

**Parameters:**
- `city` (string, required): City name
- `start` (string, required): Start date (YYYY-MM-DD)
- `end` (string, required): End date (YYYY-MM-DD)

**Example Request:**
```
GET /api/aqi/historical?city=Delhi&start=2025-06-01&end=2025-06-30
```

**Example Response:**
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
      {
        "date": "2025-06-02",
        "aqi": 152,
        "pollutants": {
          "pm25": 72.1,
          "pm10": 138.4,
          "no2": 44.7,
          "so2": 11.2
        }
      }
      // More daily records...
    ]
  }
}
```

#### GET /aqi/health-recommendations

Get health recommendations based on AQI level.

**Parameters:**
- `aqi` (integer, required): Current AQI value
- `sensitive` (boolean, optional): Whether the user belongs to a sensitive group

**Example Request:**
```
GET /api/aqi/health-recommendations?aqi=156&sensitive=true
```

**Example Response:**
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

#### GET /aqi/stations

Get a list of all monitoring stations in a specific city or region.

**Parameters:**
- `city` (string, optional): City name
- `lat` (float, optional): Latitude for location-based search
- `lng` (float, optional): Longitude for location-based search
- `radius` (integer, optional): Search radius in kilometers (default: 10)

**Example Request:**
```
GET /api/aqi/stations?city=Delhi
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "city": "Delhi",
    "stations": [
      {
        "id": "DEL001",
        "name": "Anand Vihar",
        "lat": 28.6468,
        "lng": 77.3022,
        "type": "ground",
        "parameters": ["pm25", "pm10", "no2", "so2", "o3", "co"]
      },
      {
        "id": "DEL002",
        "name": "ITO",
        "lat": 28.6289,
        "lng": 77.2410,
        "type": "ground",
        "parameters": ["pm25", "pm10", "no2", "so2"]
      }
      // More stations...
    ]
  }
}
```

### Machine Learning and Forecasting

#### GET /ml/model/info

Get information about the current ML model.

**Parameters:**
- None

**Example Request:**
```
GET /api/ml/model/info
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "model_version": "2.3.1",
    "last_trained": "2025-06-15T08:30:00Z",
    "algorithm": "Ensemble (Random Forest + ARIMA)",
    "features": ["historical_aqi", "temperature", "humidity", "wind_speed", "day_of_week"],
    "performance": {
      "mae": 11.34,
      "rmse": 14.32,
      "r2": 0.87
    },
    "forecast_horizon": "72 hours"
  }
}
```

#### POST /ml/forecast

Generate AQI forecast for a specific city.

**Parameters:**
- `city` (string, required): City name
- `days` (integer, optional): Number of days to forecast (default: 3)

**Example Request:**
```
POST /api/ml/forecast?city=Delhi&days=3
```

**Example Response:**
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
      {
        "timestamp": "2025-07-02T01:00:00Z",
        "aqi": 152
      }
      // More hourly records...
    ]
  }
}
```

#### POST /ml/train

Trigger model retraining with new data.

**Parameters:**
- `admin_key` (string, required): Administrator API key for authentication

**Example Request:**
```
POST /api/ml/train
Content-Type: application/json

{
  "admin_key": "your-admin-key-here"
}
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "job_id": "train_20250701_123456",
    "status": "started",
    "estimated_completion": "2025-07-01T14:30:00Z"
  }
}
```

### User Management

#### POST /users/register

Register a new user account.

**Parameters:**
- `email` (string, required): User's email address
- `password` (string, required): User's password
- `name` (string, required): User's name
- `location` (string, optional): User's default location

**Example Request:**
```
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "location": "Delhi"
}
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "user_id": "usr_12345",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-07-01T12:00:00Z"
  }
}
```

#### POST /users/preferences

Update user preferences.

**Parameters:**
- `user_id` (string, required): User ID
- `auth_token` (string, required): Authentication token
- `preferences` (object, required): User preferences

**Example Request:**
```
POST /api/users/preferences
Content-Type: application/json

{
  "user_id": "usr_12345",
  "auth_token": "your-auth-token-here",
  "preferences": {
    "default_location": "Mumbai",
    "notification_threshold": 150,
    "sensitive_group": true,
    "health_conditions": ["asthma"]
  }
}
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "user_id": "usr_12345",
    "preferences_updated": true,
    "updated_at": "2025-07-01T14:30:00Z"
  }
}
```

### Notifications

#### POST /notifications/register

Register a device for push notifications.

**Parameters:**
- `user_id` (string, required): User ID
- `device_token` (string, required): Device token for push notifications
- `device_type` (string, required): Device type (ios, android, web)

**Example Request:**
```
POST /api/notifications/register
Content-Type: application/json

{
  "user_id": "usr_12345",
  "device_token": "fcm-token-example-123456",
  "device_type": "android"
}
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "registration_id": "reg_67890",
    "status": "active"
  }
}
```

#### POST /notifications/settings

Update notification settings.

**Parameters:**
- `user_id` (string, required): User ID
- `auth_token` (string, required): Authentication token
- `settings` (object, required): Notification settings

**Example Request:**
```
POST /api/notifications/settings
Content-Type: application/json

{
  "user_id": "usr_12345",
  "auth_token": "your-auth-token-here",
  "settings": {
    "aqi_threshold": 150,
    "frequency": "immediate",
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "07:00"
    },
    "locations": [
      {
        "name": "Home",
        "lat": 28.6139,
        "lng": 77.2090
      },
      {
        "name": "Work",
        "lat": 28.5456,
        "lng": 77.1907
      }
    ]
  }
}
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "user_id": "usr_12345",
    "settings_updated": true,
    "updated_at": "2025-07-01T15:45:00Z"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Versioning

The API uses URL versioning (v1, v2, etc.). The current version is v1.

## Support

For API support, please contact api-support@airqualityapp.org or visit our developer portal at https://developers.airqualityapp.org.

