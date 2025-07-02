import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from src.models.user import db
from src.models.aqi_data import AQIData, WeatherData, AQIForecast
from src.ml_models.aqi_forecasting import AQIForecastingModel
from src.data_ingestion.weather_ingestion import WeatherDataIngestion

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AQIModelService:
    """
    Service class for AQI forecasting model inference and management
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize the model service
        
        Args:
            model_path: Path to saved model files (without extension)
        """
        self.model = AQIForecastingModel(model_type='random_forest')
        self.model_path = model_path or os.path.join(os.path.dirname(__file__), 'saved_models', 'aqi_model')
        self.is_model_loaded = False
        self.weather_ingestion = WeatherDataIngestion()
        
        # Try to load existing model
        self._load_model_if_exists()
    
    def _load_model_if_exists(self):
        """Load model if it exists"""
        try:
            if os.path.exists(f"{self.model_path}_metadata.pkl"):
                self.model.load_model(self.model_path)
                self.is_model_loaded = True
                logger.info("Existing model loaded successfully")
            else:
                logger.info("No existing model found, will need to train new model")
        except Exception as e:
            logger.error(f"Error loading existing model: {e}")
            self.is_model_loaded = False
    
    def train_model_with_database_data(self, min_data_points: int = 100) -> Dict:
        """
        Train the model using data from the database
        
        Args:
            min_data_points: Minimum number of data points required for training
            
        Returns:
            Dictionary with training results
        """
        logger.info("Training model with database data")
        
        try:
            # Fetch AQI data from database
            aqi_query = db.session.query(AQIData).all()
            aqi_data = pd.DataFrame([record.to_dict() for record in aqi_query])
            
            # Fetch weather data from database
            weather_query = db.session.query(WeatherData).all()
            weather_data = pd.DataFrame([record.to_dict() for record in weather_query])
            
            if len(aqi_data) < min_data_points or len(weather_data) < min_data_points:
                logger.warning(f"Insufficient data for training. AQI: {len(aqi_data)}, Weather: {len(weather_data)}")
                return {
                    'success': False,
                    'error': f'Insufficient data for training. Need at least {min_data_points} records each.',
                    'aqi_records': len(aqi_data),
                    'weather_records': len(weather_data)
                }
            
            # Prepare features
            features_df = self.model.prepare_features(aqi_data, weather_data)
            
            if len(features_df) < min_data_points:
                logger.warning(f"Insufficient combined data after feature preparation: {len(features_df)}")
                return {
                    'success': False,
                    'error': f'Insufficient combined data after feature preparation: {len(features_df)}',
                    'combined_records': len(features_df)
                }
            
            # Prepare training data
            X, y = self.model.prepare_training_data(features_df, forecast_days=1)
            
            # Train model
            metrics = self.model.train_model(X, y)
            
            # Save model
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            self.model.save_model(self.model_path)
            self.is_model_loaded = True
            
            logger.info("Model training completed successfully")
            return {
                'success': True,
                'metrics': metrics,
                'training_records': len(X),
                'feature_count': X.shape[1] if len(X.shape) > 1 else 0
            }
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_forecasts_for_cities(self, cities: List[Dict], forecast_days: int = 3) -> Dict:
        """
        Generate AQI forecasts for specified cities
        
        Args:
            cities: List of city dictionaries with 'city' and 'state' keys
            forecast_days: Number of days to forecast
            
        Returns:
            Dictionary with forecast results
        """
        if not self.is_model_loaded:
            return {
                'success': False,
                'error': 'Model not loaded. Please train the model first.'
            }
        
        logger.info(f"Generating forecasts for {len(cities)} cities, {forecast_days} days ahead")
        
        forecasts_created = 0
        errors = []
        
        try:
            for city_info in cities:
                city = city_info['city']
                state = city_info['state']
                
                try:
                    # Get recent AQI and weather data for the city
                    recent_features = self._get_recent_features_for_city(city, state)
                    
                    if recent_features is None:
                        errors.append(f"No recent data available for {city}, {state}")
                        continue
                    
                    # Generate forecasts for each day
                    for day in range(1, forecast_days + 1):
                        forecast_date = datetime.utcnow() + timedelta(days=day)
                        
                        # Make prediction
                        prediction = self.model.predict(recent_features.reshape(1, -1))[0]
                        
                        # Determine AQI category
                        aqi_category = self._get_aqi_category(int(prediction))
                        
                        # Create forecast record
                        forecast = AQIForecast(
                            city=city,
                            state=state,
                            latitude=city_info.get('latitude'),
                            longitude=city_info.get('longitude'),
                            forecast_date=forecast_date,
                            predicted_aqi=int(prediction),
                            predicted_category=aqi_category,
                            confidence_score=0.8,  # Placeholder confidence score
                            model_version=self.model.model_version
                        )
                        
                        # Check if forecast already exists for this date
                        existing_forecast = db.session.query(AQIForecast).filter_by(
                            city=city,
                            state=state,
                            forecast_date=forecast_date.date()
                        ).first()
                        
                        if existing_forecast:
                            # Update existing forecast
                            existing_forecast.predicted_aqi = int(prediction)
                            existing_forecast.predicted_category = aqi_category
                            existing_forecast.confidence_score = 0.8
                            existing_forecast.model_version = self.model.model_version
                        else:
                            # Add new forecast
                            db.session.add(forecast)
                        
                        forecasts_created += 1
                
                except Exception as e:
                    errors.append(f"Error generating forecast for {city}, {state}: {str(e)}")
                    logger.error(f"Error generating forecast for {city}, {state}: {e}")
            
            # Commit all forecasts
            db.session.commit()
            
            logger.info(f"Generated {forecasts_created} forecasts")
            return {
                'success': True,
                'forecasts_created': forecasts_created,
                'cities_processed': len(cities),
                'errors': errors
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error in forecast generation: {e}")
            return {
                'success': False,
                'error': str(e),
                'forecasts_created': forecasts_created,
                'errors': errors
            }
    
    def _get_recent_features_for_city(self, city: str, state: str) -> Optional[np.ndarray]:
        """
        Get recent feature data for a specific city to use for prediction
        
        Args:
            city: City name
            state: State name
            
        Returns:
            Feature array or None if insufficient data
        """
        try:
            # Get recent AQI data (last 30 days)
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            aqi_query = db.session.query(AQIData).filter(
                AQIData.city.ilike(f'%{city}%'),
                AQIData.state.ilike(f'%{state}%'),
                AQIData.last_update >= cutoff_date
            ).all()
            
            weather_query = db.session.query(WeatherData).filter(
                WeatherData.city.ilike(f'%{city}%'),
                WeatherData.state.ilike(f'%{state}%'),
                WeatherData.recorded_at >= cutoff_date
            ).all()
            
            if not aqi_query or not weather_query:
                return None
            
            # Convert to DataFrames
            aqi_data = pd.DataFrame([record.to_dict() for record in aqi_query])
            weather_data = pd.DataFrame([record.to_dict() for record in weather_query])
            
            # Prepare features
            features_df = self.model.prepare_features(aqi_data, weather_data)
            
            if len(features_df) == 0:
                return None
            
            # Get the most recent feature row
            features_df = features_df.sort_values('date').tail(1)
            
            # Extract feature columns in the same order as training
            feature_values = []
            for col in self.model.feature_columns:
                if col in features_df.columns:
                    feature_values.append(features_df[col].iloc[0])
                else:
                    feature_values.append(0)  # Default value for missing features
            
            return np.array(feature_values)
            
        except Exception as e:
            logger.error(f"Error getting recent features for {city}, {state}: {e}")
            return None
    
    def _get_aqi_category(self, aqi_value: int) -> str:
        """Get AQI category based on AQI value"""
        if aqi_value <= 50:
            return 'Good'
        elif aqi_value <= 100:
            return 'Satisfactory'
        elif aqi_value <= 200:
            return 'Moderate'
        elif aqi_value <= 300:
            return 'Poor'
        elif aqi_value <= 400:
            return 'Very Poor'
        else:
            return 'Severe'
    
    def get_model_info(self) -> Dict:
        """Get information about the current model"""
        return {
            'is_loaded': self.is_model_loaded,
            'model_type': self.model.model_type if self.is_model_loaded else None,
            'model_version': self.model.model_version if self.is_model_loaded else None,
            'feature_count': len(self.model.feature_columns) if self.is_model_loaded else 0,
            'feature_columns': self.model.feature_columns if self.is_model_loaded else []
        }
    
    def retrain_model_with_sample_data(self) -> Dict:
        """
        Retrain model with sample data (for testing purposes)
        
        Returns:
            Dictionary with training results
        """
        logger.info("Retraining model with sample data")
        
        try:
            from src.ml_models.aqi_forecasting import create_sample_data
            
            # Create sample data
            aqi_data, weather_data = create_sample_data()
            
            # Prepare features
            features_df = self.model.prepare_features(aqi_data, weather_data)
            
            # Prepare training data
            X, y = self.model.prepare_training_data(features_df, forecast_days=1)
            
            # Train model
            metrics = self.model.train_model(X, y)
            
            # Save model
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            self.model.save_model(self.model_path)
            self.is_model_loaded = True
            
            logger.info("Model retraining with sample data completed successfully")
            return {
                'success': True,
                'metrics': metrics,
                'training_records': len(X),
                'feature_count': X.shape[1] if len(X.shape) > 1 else 0,
                'data_source': 'sample_data'
            }
            
        except Exception as e:
            logger.error(f"Error retraining model with sample data: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Global model service instance
model_service = AQIModelService()

if __name__ == "__main__":
    # Test the model service
    logger.info("Testing AQI Model Service")
    
    # Get model info
    info = model_service.get_model_info()
    print("Model Info:", info)
    
    # Retrain with sample data
    result = model_service.retrain_model_with_sample_data()
    print("Training Result:", result)
    
    # Test forecast generation
    test_cities = [
        {'city': 'Delhi', 'state': 'Delhi', 'latitude': 28.6139, 'longitude': 77.2090},
        {'city': 'Mumbai', 'state': 'Maharashtra', 'latitude': 19.0760, 'longitude': 72.8777}
    ]
    
    # Note: This would require database connection in real scenario
    # forecast_result = model_service.generate_forecasts_for_cities(test_cities, forecast_days=3)
    # print("Forecast Result:", forecast_result)

