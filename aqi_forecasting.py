import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import logging
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import joblib
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AQIForecastingModel:
    """
    Machine Learning model for AQI forecasting using historical AQI and weather data
    """
    
    def __init__(self, model_type: str = 'random_forest'):
        """
        Initialize the AQI forecasting model
        
        Args:
            model_type: Type of model to use ('random_forest', 'linear', 'lstm')
        """
        self.model_type = model_type
        self.model = None
        self.scaler_features = StandardScaler()
        self.scaler_target = StandardScaler()
        self.label_encoders = {}
        self.feature_columns = []
        self.is_trained = False
        self.model_version = "1.0"
        
    def prepare_features(self, aqi_data: pd.DataFrame, weather_data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare features for training/prediction by combining AQI and weather data
        
        Args:
            aqi_data: DataFrame with AQI historical data
            weather_data: DataFrame with weather data
            
        Returns:
            Combined feature DataFrame
        """
        logger.info("Preparing features from AQI and weather data")
        
        # Convert datetime columns
        if 'last_update' in aqi_data.columns:
            aqi_data['last_update'] = pd.to_datetime(aqi_data['last_update'])
        if 'recorded_at' in weather_data.columns:
            weather_data['recorded_at'] = pd.to_datetime(weather_data['recorded_at'])
        
        # Group AQI data by city, date and calculate daily averages
        aqi_daily = aqi_data.groupby([
            'city', 'state', 
            aqi_data['last_update'].dt.date
        ]).agg({
            'pollutant_avg': 'mean',
            'aqi_value': 'mean',
            'latitude': 'first',
            'longitude': 'first'
        }).reset_index()
        
        aqi_daily.rename(columns={'last_update': 'date'}, inplace=True)
        
        # Group weather data by city, date and calculate daily averages
        weather_daily = weather_data.groupby([
            'city', 'state',
            weather_data['recorded_at'].dt.date
        ]).agg({
            'temperature': 'mean',
            'humidity': 'mean',
            'wind_speed': 'mean',
            'wind_direction': 'mean',
            'pressure': 'mean',
            'visibility': 'mean'
        }).reset_index()
        
        weather_daily.rename(columns={'recorded_at': 'date'}, inplace=True)
        
        # Merge AQI and weather data
        combined_data = pd.merge(
            aqi_daily, weather_daily,
            on=['city', 'state', 'date'],
            how='inner'
        )
        
        # Add temporal features
        combined_data['date'] = pd.to_datetime(combined_data['date'])
        combined_data['day_of_year'] = combined_data['date'].dt.dayofyear
        combined_data['month'] = combined_data['date'].dt.month
        combined_data['day_of_week'] = combined_data['date'].dt.dayofweek
        combined_data['season'] = combined_data['month'].apply(self._get_season)
        
        # Add lag features (previous days' AQI)
        combined_data = combined_data.sort_values(['city', 'state', 'date'])
        for lag in [1, 2, 3, 7]:  # 1, 2, 3, and 7 days ago
            combined_data[f'aqi_lag_{lag}'] = combined_data.groupby(['city', 'state'])['aqi_value'].shift(lag)
        
        # Add rolling averages
        for window in [3, 7, 14]:  # 3, 7, and 14-day rolling averages
            combined_data[f'aqi_rolling_{window}'] = combined_data.groupby(['city', 'state'])['aqi_value'].transform(lambda x: x.rolling(window=window).mean())
            combined_data[f'temp_rolling_{window}'] = combined_data.groupby(['city', 'state'])['temperature'].transform(lambda x: x.rolling(window=window).mean())
        
        # Drop rows with NaN values (due to lag and rolling features)
        combined_data = combined_data.dropna()
        
        logger.info(f"Prepared {len(combined_data)} feature records")
        return combined_data
    
    def _get_season(self, month: int) -> str:
        """Get season based on month"""
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'autumn'
    
    def prepare_training_data(self, features_df: pd.DataFrame, forecast_days: int = 1) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data with target variable (future AQI)
        
        Args:
            features_df: DataFrame with features
            forecast_days: Number of days ahead to forecast
            
        Returns:
            Tuple of (X, y) arrays for training
        """
        logger.info(f"Preparing training data for {forecast_days}-day forecast")
        
        # Sort by city and date
        features_df = features_df.sort_values(['city', 'state', 'date'])
        
        # Create target variable (future AQI)
        features_df['target_aqi'] = features_df.groupby(['city', 'state'])['aqi_value'].shift(-forecast_days)
        
        # Drop rows where target is NaN
        training_data = features_df.dropna(subset=['target_aqi'])
        
        # Select feature columns
        feature_cols = [
            'latitude', 'longitude', 'day_of_year', 'month', 'day_of_week',
            'temperature', 'humidity', 'wind_speed', 'pressure', 'visibility',
            'aqi_lag_1', 'aqi_lag_2', 'aqi_lag_3', 'aqi_lag_7',
            'aqi_rolling_3', 'aqi_rolling_7', 'aqi_rolling_14',
            'temp_rolling_3', 'temp_rolling_7', 'temp_rolling_14'
        ]
        
        # Encode categorical features
        categorical_cols = ['season']
        for col in categorical_cols:
            if col in training_data.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    training_data[f'{col}_encoded'] = self.label_encoders[col].fit_transform(training_data[col])
                else:
                    training_data[f'{col}_encoded'] = self.label_encoders[col].transform(training_data[col])
                feature_cols.append(f'{col}_encoded')
        
        # Filter available columns
        available_cols = [col for col in feature_cols if col in training_data.columns]
        self.feature_columns = available_cols
        
        X = training_data[available_cols].values
        y = training_data['target_aqi'].values
        
        logger.info(f"Training data shape: X={X.shape}, y={y.shape}")
        return X, y
    
    def train_model(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2) -> Dict:
        """
        Train the forecasting model
        
        Args:
            X: Feature array
            y: Target array
            test_size: Proportion of data for testing
            
        Returns:
            Dictionary with training metrics
        """
        logger.info(f"Training {self.model_type} model")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, shuffle=True
        )
        
        # Scale features
        X_train_scaled = self.scaler_features.fit_transform(X_train)
        X_test_scaled = self.scaler_features.transform(X_test)
        
        # Scale target for neural networks
        if self.model_type == 'lstm':
            y_train_scaled = self.scaler_target.fit_transform(y_train.reshape(-1, 1)).flatten()
            y_test_scaled = self.scaler_target.transform(y_test.reshape(-1, 1)).flatten()
        else:
            y_train_scaled = y_train
            y_test_scaled = y_test
        
        # Train model based on type
        if self.model_type == 'random_forest':
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            self.model.fit(X_train_scaled, y_train_scaled)
            
        elif self.model_type == 'linear':
            self.model = LinearRegression()
            self.model.fit(X_train_scaled, y_train_scaled)
            
        elif self.model_type == 'lstm':
            # Reshape for LSTM (samples, timesteps, features)
            X_train_lstm = X_train_scaled.reshape((X_train_scaled.shape[0], 1, X_train_scaled.shape[1]))
            X_test_lstm = X_test_scaled.reshape((X_test_scaled.shape[0], 1, X_test_scaled.shape[1]))
            
            self.model = keras.Sequential([
                layers.LSTM(50, return_sequences=True, input_shape=(1, X_train_scaled.shape[1])),
                layers.Dropout(0.2),
                layers.LSTM(50, return_sequences=False),
                layers.Dropout(0.2),
                layers.Dense(25),
                layers.Dense(1)
            ])
            
            self.model.compile(optimizer='adam', loss='mse', metrics=['mae'])
            
            history = self.model.fit(
                X_train_lstm, y_train_scaled,
                batch_size=32,
                epochs=50,
                validation_data=(X_test_lstm, y_test_scaled),
                verbose=0
            )
        
        # Make predictions
        if self.model_type == 'lstm':
            X_test_pred = X_test_scaled.reshape((X_test_scaled.shape[0], 1, X_test_scaled.shape[1]))
            y_pred_scaled = self.model.predict(X_test_pred, verbose=0).flatten()
            y_pred = self.scaler_target.inverse_transform(y_pred_scaled.reshape(-1, 1)).flatten()
        else:
            y_pred = self.model.predict(X_test_scaled)
        
        # Calculate metrics
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_test, y_pred)
        
        metrics = {
            'mae': mae,
            'mse': mse,
            'rmse': rmse,
            'r2': r2,
            'train_samples': len(X_train),
            'test_samples': len(X_test)
        }
        
        self.is_trained = True
        logger.info(f"Model training completed. MAE: {mae:.2f}, RMSE: {rmse:.2f}, R²: {r2:.3f}")
        
        return metrics
    
    def predict(self, features: np.ndarray) -> np.ndarray:
        """
        Make AQI predictions
        
        Args:
            features: Feature array for prediction
            
        Returns:
            Predicted AQI values
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Scale features
        features_scaled = self.scaler_features.transform(features)
        
        # Make predictions based on model type
        if self.model_type == 'lstm':
            features_lstm = features_scaled.reshape((features_scaled.shape[0], 1, features_scaled.shape[1]))
            predictions_scaled = self.model.predict(features_lstm, verbose=0).flatten()
            predictions = self.scaler_target.inverse_transform(predictions_scaled.reshape(-1, 1)).flatten()
        else:
            predictions = self.model.predict(features_scaled)
        
        # Ensure predictions are non-negative
        predictions = np.maximum(predictions, 0)
        
        return predictions
    
    def save_model(self, model_path: str):
        """Save the trained model to disk"""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        model_dir = os.path.dirname(model_path)
        if model_dir and not os.path.exists(model_dir):
            os.makedirs(model_dir)
        
        # Save model and scalers
        if self.model_type == 'lstm':
            self.model.save(f"{model_path}_lstm.keras")
        else:
            joblib.dump(self.model, f"{model_path}_model.pkl")
        
        joblib.dump(self.scaler_features, f"{model_path}_scaler_features.pkl")
        joblib.dump(self.scaler_target, f"{model_path}_scaler_target.pkl")
        joblib.dump(self.label_encoders, f"{model_path}_label_encoders.pkl")
        joblib.dump({
            'model_type': self.model_type,
            'feature_columns': self.feature_columns,
            'model_version': self.model_version,
            'is_trained': self.is_trained
        }, f"{model_path}_metadata.pkl")
        
        logger.info(f"Model saved to {model_path}")
    
    def load_model(self, model_path: str):
        """Load a trained model from disk"""
        # Load metadata
        metadata = joblib.load(f"{model_path}_metadata.pkl")
        self.model_type = metadata['model_type']
        self.feature_columns = metadata['feature_columns']
        self.model_version = metadata['model_version']
        self.is_trained = metadata['is_trained']
        
        # Load model
        if self.model_type == 'lstm':
            self.model = keras.models.load_model(f"{model_path}_lstm.keras")
        else:
            self.model = joblib.load(f"{model_path}_model.pkl")
        
        # Load scalers and encoders
        self.scaler_features = joblib.load(f"{model_path}_scaler_features.pkl")
        self.scaler_target = joblib.load(f"{model_path}_scaler_target.pkl")
        self.label_encoders = joblib.load(f"{model_path}_label_encoders.pkl")
        
        logger.info(f"Model loaded from {model_path}")
    
    def get_feature_importance(self) -> Optional[Dict]:
        """Get feature importance for tree-based models"""
        if self.model_type == 'random_forest' and self.is_trained:
            importance = self.model.feature_importances_
            feature_importance = dict(zip(self.feature_columns, importance))
            return dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))
        return None

def create_sample_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Create sample AQI and weather data for testing
    
    Returns:
        Tuple of (aqi_data, weather_data) DataFrames
    """
    logger.info("Creating sample data for testing")
    
    # Sample cities
    cities = [
        {'city': 'Delhi', 'state': 'Delhi', 'lat': 28.6139, 'lon': 77.2090},
        {'city': 'Mumbai', 'state': 'Maharashtra', 'lat': 19.0760, 'lon': 72.8777},
        {'city': 'Bangalore', 'state': 'Karnataka', 'lat': 12.9716, 'lon': 77.5946}
    ]
    
    # Generate 90 days of data
    start_date = datetime.now() - timedelta(days=90)
    dates = [start_date + timedelta(days=i) for i in range(90)]
    
    aqi_data = []
    weather_data = []
    
    for city in cities:
        for date in dates:
            # Generate realistic AQI data with seasonal patterns
            base_aqi = 80 + 30 * np.sin(2 * np.pi * date.timetuple().tm_yday / 365)  # Seasonal variation
            noise = np.random.normal(0, 15)
            aqi_value = max(10, base_aqi + noise)
            
            aqi_data.append({
                'city': city['city'],
                'state': city['state'],
                'station': f"{city['city']} Station",
                'latitude': city['lat'],
                'longitude': city['lon'],
                'pollutant_id': 'PM2.5',
                'pollutant_avg': aqi_value * 0.6,  # Rough conversion
                'aqi_value': int(aqi_value),
                'last_update': date
            })
            
            # Generate realistic weather data
            base_temp = 25 + 10 * np.sin(2 * np.pi * date.timetuple().tm_yday / 365)  # Seasonal temperature
            temp_noise = np.random.normal(0, 3)
            temperature = base_temp + temp_noise
            
            weather_data.append({
                'city': city['city'],
                'state': city['state'],
                'latitude': city['lat'],
                'longitude': city['lon'],
                'temperature': temperature,
                'humidity': max(20, min(90, 60 + np.random.normal(0, 15))),
                'wind_speed': max(0, np.random.normal(10, 5)),
                'wind_direction': np.random.uniform(0, 360),
                'pressure': np.random.normal(1013, 10),
                'visibility': max(1, np.random.normal(8, 2)),
                'recorded_at': date
            })
    
    aqi_df = pd.DataFrame(aqi_data)
    weather_df = pd.DataFrame(weather_data)
    
    logger.info(f"Created sample data: {len(aqi_df)} AQI records, {len(weather_df)} weather records")
    return aqi_df, weather_df

if __name__ == "__main__":
    # Example usage and testing
    logger.info("Testing AQI Forecasting Model")
    
    # Create sample data
    aqi_data, weather_data = create_sample_data()
    
    # Initialize and train model
    model = AQIForecastingModel(model_type='random_forest')
    
    # Prepare features
    features_df = model.prepare_features(aqi_data, weather_data)
    
    # Prepare training data
    X, y = model.prepare_training_data(features_df, forecast_days=1)
    
    # Train model
    metrics = model.train_model(X, y)
    
    print("Training Metrics:")
    for metric, value in metrics.items():
        print(f"  {metric}: {value}")
    
    # Test prediction
    test_features = X[:5]  # Use first 5 samples for testing
    predictions = model.predict(test_features)
    
    print(f"\nSample Predictions: {predictions}")
    print(f"Actual Values: {y[:5]}")
    
    # Feature importance
    importance = model.get_feature_importance()
    if importance:
        print("\nTop 10 Feature Importances:")
        for feature, imp in list(importance.items())[:10]:
            print(f"  {feature}: {imp:.4f}")

