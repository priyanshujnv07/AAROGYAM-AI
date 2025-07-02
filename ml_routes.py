from flask import Blueprint, request, jsonify
from datetime import datetime
import numpy as np
from src.ml_models.model_service import model_service
from src.data_ingestion.weather_ingestion import WeatherDataIngestion
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ml_bp = Blueprint('ml', __name__)

@ml_bp.route('/ml/model/info', methods=['GET'])
def get_model_info():
    """
    Get information about the current ML model
    """
    try:
        info = model_service.get_model_info()
        
        return jsonify({
            'success': True,
            'model_info': info,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_bp.route('/ml/model/train', methods=['POST'])
def train_model():
    """
    Train the ML model with database data or sample data
    Request body:
    - use_sample_data: Boolean, whether to use sample data for training (default: false)
    - min_data_points: Minimum number of data points required (default: 100)
    """
    try:
        data = request.get_json() or {}
        use_sample_data = data.get('use_sample_data', False)
        min_data_points = data.get('min_data_points', 100)
        
        if use_sample_data:
            logger.info("Training model with sample data")
            result = model_service.retrain_model_with_sample_data()
        else:
            logger.info("Training model with database data")
            result = model_service.train_model_with_database_data(min_data_points)
        
        if result['success']:
            return jsonify({
                'success': True,
                'training_result': result,
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Training failed'),
                'details': result,
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
    except Exception as e:
        logger.error(f"Error training model: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_bp.route('/ml/forecasts/generate', methods=['POST'])
def generate_forecasts():
    """
    Generate AQI forecasts for specified cities
    Request body:
    - cities: List of city objects with 'city', 'state', 'latitude', 'longitude'
    - forecast_days: Number of days to forecast (default: 3, max: 7)
    """
    try:
        data = request.get_json() or {}
        cities = data.get('cities', [])
        forecast_days = min(data.get('forecast_days', 3), 7)  # Max 7 days
        
        if not cities:
            # Use default major cities if none specified
            weather_ingestion = WeatherDataIngestion()
            major_cities = weather_ingestion.get_major_indian_cities()
            cities = major_cities[:10]  # Limit to first 10 cities
        
        logger.info(f"Generating forecasts for {len(cities)} cities")
        result = model_service.generate_forecasts_for_cities(cities, forecast_days)
        
        if result['success']:
            return jsonify({
                'success': True,
                'forecast_result': result,
                'cities_count': len(cities),
                'forecast_days': forecast_days,
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Forecast generation failed'),
                'details': result,
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
    except Exception as e:
        logger.error(f"Error generating forecasts: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_bp.route('/ml/forecasts/batch-generate', methods=['POST'])
def batch_generate_forecasts():
    """
    Generate forecasts for all major Indian cities
    Request body:
    - forecast_days: Number of days to forecast (default: 3, max: 7)
    """
    try:
        data = request.get_json() or {}
        forecast_days = min(data.get('forecast_days', 3), 7)
        
        # Get major Indian cities
        weather_ingestion = WeatherDataIngestion()
        major_cities = weather_ingestion.get_major_indian_cities()
        
        logger.info(f"Batch generating forecasts for {len(major_cities)} major cities")
        result = model_service.generate_forecasts_for_cities(major_cities, forecast_days)
        
        if result['success']:
            return jsonify({
                'success': True,
                'forecast_result': result,
                'cities_processed': len(major_cities),
                'forecast_days': forecast_days,
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Batch forecast generation failed'),
                'details': result,
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
    except Exception as e:
        logger.error(f"Error in batch forecast generation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_bp.route('/ml/model/retrain-schedule', methods=['POST'])
def schedule_model_retraining():
    """
    Schedule periodic model retraining (placeholder for future implementation)
    Request body:
    - schedule_type: 'daily', 'weekly', 'monthly'
    - enabled: Boolean to enable/disable scheduled retraining
    """
    try:
        data = request.get_json() or {}
        schedule_type = data.get('schedule_type', 'weekly')
        enabled = data.get('enabled', True)
        
        # This is a placeholder implementation
        # In a production system, you would integrate with a task scheduler like Celery
        
        return jsonify({
            'success': True,
            'message': f'Model retraining scheduled: {schedule_type}, enabled: {enabled}',
            'note': 'This is a placeholder implementation. Integrate with task scheduler for production.',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error scheduling model retraining: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_bp.route('/ml/model/feature-importance', methods=['GET'])
def get_feature_importance():
    """
    Get feature importance from the trained model (for tree-based models)
    """
    try:
        if not model_service.is_model_loaded:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please train the model first.'
            }), 400
        
        importance = model_service.model.get_feature_importance()
        
        if importance is None:
            return jsonify({
                'success': False,
                'error': 'Feature importance not available for this model type.'
            }), 400
        
        return jsonify({
            'success': True,
            'feature_importance': importance,
            'model_type': model_service.model.model_type,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting feature importance: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_bp.route('/ml/model/predict', methods=['POST'])
def predict_single():
    """
    Make a single AQI prediction
    Request body:
    - city: City name
    - state: State name
    - features: Optional manual feature array
    """
    try:
        data = request.get_json() or {}
        city = data.get('city')
        state = data.get('state')
        manual_features = data.get('features')
        
        if not model_service.is_model_loaded:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please train the model first.'
            }), 400
        
        if manual_features:
            # Use manually provided features
            features = np.array(manual_features).reshape(1, -1)
        elif city and state:
            # Get recent features for the city
            features = model_service._get_recent_features_for_city(city, state)
            if features is None:
                return jsonify({
                    'success': False,
                    'error': f'No recent data available for {city}, {state}'
                }), 400
            features = features.reshape(1, -1)
        else:
            return jsonify({
                'success': False,
                'error': 'Either city/state or manual features must be provided'
            }), 400
        
        # Make prediction
        prediction = model_service.model.predict(features)[0]
        aqi_category = model_service._get_aqi_category(int(prediction))
        
        return jsonify({
            'success': True,
            'prediction': {
                'aqi_value': int(prediction),
                'aqi_category': aqi_category,
                'city': city,
                'state': state
            },
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error making prediction: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

