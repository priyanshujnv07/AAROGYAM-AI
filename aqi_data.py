from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class AQIData(db.Model):
    __tablename__ = 'aqi_data'
    
    id = db.Column(db.Integer, primary_key=True)
    country = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    station = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    pollutant_id = db.Column(db.String(20), nullable=False)  # PM10, PM2.5, NO2, SO2, CO, OZONE, NH3
    pollutant_min = db.Column(db.Float, nullable=True)
    pollutant_max = db.Column(db.Float, nullable=True)
    pollutant_avg = db.Column(db.Float, nullable=True)
    aqi_value = db.Column(db.Integer, nullable=True)
    aqi_category = db.Column(db.String(50), nullable=True)  # Good, Satisfactory, Moderate, Poor, Very Poor, Severe
    last_update = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<AQIData {self.city}-{self.station}-{self.pollutant_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'country': self.country,
            'state': self.state,
            'city': self.city,
            'station': self.station,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'pollutant_id': self.pollutant_id,
            'pollutant_min': self.pollutant_min,
            'pollutant_max': self.pollutant_max,
            'pollutant_avg': self.pollutant_avg,
            'aqi_value': self.aqi_value,
            'aqi_category': self.aqi_category,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class WeatherData(db.Model):
    __tablename__ = 'weather_data'
    
    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    temperature = db.Column(db.Float, nullable=True)  # in Celsius
    humidity = db.Column(db.Float, nullable=True)  # in percentage
    wind_speed = db.Column(db.Float, nullable=True)  # in km/h
    wind_direction = db.Column(db.Float, nullable=True)  # in degrees
    pressure = db.Column(db.Float, nullable=True)  # in hPa
    visibility = db.Column(db.Float, nullable=True)  # in km
    recorded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<WeatherData {self.city}-{self.state}>'

    def to_dict(self):
        return {
            'id': self.id,
            'city': self.city,
            'state': self.state,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'wind_speed': self.wind_speed,
            'wind_direction': self.wind_direction,
            'pressure': self.pressure,
            'visibility': self.visibility,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AQIForecast(db.Model):
    __tablename__ = 'aqi_forecast'
    
    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    forecast_date = db.Column(db.DateTime, nullable=False)
    predicted_aqi = db.Column(db.Integer, nullable=False)
    predicted_category = db.Column(db.String(50), nullable=False)
    confidence_score = db.Column(db.Float, nullable=True)
    model_version = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<AQIForecast {self.city}-{self.forecast_date}>'

    def to_dict(self):
        return {
            'id': self.id,
            'city': self.city,
            'state': self.state,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'forecast_date': self.forecast_date.isoformat() if self.forecast_date else None,
            'predicted_aqi': self.predicted_aqi,
            'predicted_category': self.predicted_category,
            'confidence_score': self.confidence_score,
            'model_version': self.model_version,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

