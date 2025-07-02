from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, desc
from typing import Dict, List, Optional
from src.models.user import db
from src.models.aqi_data import AQIData, WeatherData, AQIForecast
from src.data_ingestion.cpcb_ingestion import CPCBDataIngestion
from src.data_ingestion.weather_ingestion import WeatherDataIngestion
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

aqi_bp = Blueprint('aqi', __name__)

# Initialize data ingestion classes
# Note: In production, these API keys should be stored in environment variables
CPCB_API_KEY = os.getenv('CPCB_API_KEY', '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b')
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')  # Add your OpenWeatherMap API key

cpcb_ingestion = CPCBDataIngestion(CPCB_API_KEY)
weather_ingestion = WeatherDataIngestion(OPENWEATHER_API_KEY)

@aqi_bp.route('/aqi/realtime', methods=['GET'])
def get_realtime_aqi():
    """
    Get real-time AQI data for a specific location or all locations
    Query parameters:
    - state: Filter by state name
    - city: Filter by city name
    - pollutant: Filter by pollutant type
    - limit: Maximum number of records (default: 50)
    """
    try:
        state = request.args.get('state')
        city = request.args.get('city')
        pollutant = request.args.get('pollutant')
        limit = int(request.args.get('limit', 50))
        
        # Build query
        query = AQIData.query
        
        if state:
            query = query.filter(AQIData.state.ilike(f'%{state}%'))
        if city:
            query = query.filter(AQIData.city.ilike(f'%{city}%'))
        if pollutant:
            query = query.filter(AQIData.pollutant_id == pollutant)
        
        # Get most recent data for each station
        recent_data = query.order_by(desc(AQIData.last_update)).limit(limit).all()
        
        # If no data in database, try to fetch from API
        if not recent_data and city:
            logger.info(f"No data found in database for {city}, fetching from API")
            fresh_data = cpcb_ingestion.fetch_realtime_aqi(state=state, city=city, limit=limit)
            
            # Store fresh data in database
            for record in fresh_data:
                processed_record = cpcb_ingestion.process_aqi_record(record)
                aqi_data = AQIData(**processed_record)
                db.session.add(aqi_data)
            
            try:
                db.session.commit()
                # Re-query the database
                recent_data = query.order_by(desc(AQIData.last_update)).limit(limit).all()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error saving AQI data: {e}")
        
        result = [data.to_dict() for data in recent_data]
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in get_realtime_aqi: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@aqi_bp.route('/aqi/historical', methods=['GET'])
def get_historical_aqi():
    """
    Get historical AQI data for a specific location
    Query parameters:
    - state: State name (required)
    - city: City name (required)
    - start_date: Start date (YYYY-MM-DD format)
    - end_date: End date (YYYY-MM-DD format)
    - pollutant: Filter by pollutant type
    - limit: Maximum number of records (default: 100)
    """
    try:
        state = request.args.get('state')
        city = request.args.get('city')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        pollutant = request.args.get('pollutant')
        limit = int(request.args.get('limit', 100))
        
        if not city:
            return jsonify({
                'success': False,
                'error': 'City parameter is required'
            }), 400
        
        # Parse dates
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)  # Default to last 30 days
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid start_date format. Use YYYY-MM-DD'
                }), 400
        
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid end_date format. Use YYYY-MM-DD'
                }), 400
        
        # Build query
        query = AQIData.query.filter(
            AQIData.city.ilike(f'%{city}%'),
            AQIData.last_update >= start_date,
            AQIData.last_update <= end_date
        )
        
        if state:
            query = query.filter(AQIData.state.ilike(f'%{state}%'))
        if pollutant:
            query = query.filter(AQIData.pollutant_id == pollutant)
        
        historical_data = query.order_by(desc(AQIData.last_update)).limit(limit).all()
        
        result = [data.to_dict() for data in historical_data]
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result),
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in get_historical_aqi: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@aqi_bp.route('/aqi/forecast', methods=['GET'])
def get_aqi_forecast():
    """
    Get AQI forecast for a specific location
    Query parameters:
    - state: State name
    - city: City name (required)
    - days: Number of days to forecast (default: 3, max: 7)
    """
    try:
        state = request.args.get('state')
        city = request.args.get('city')
        days = int(request.args.get('days', 3))
        
        if not city:
            return jsonify({
                'success': False,
                'error': 'City parameter is required'
            }), 400
        
        if days > 7:
            days = 7
        
        # Get forecast data from database
        end_date = datetime.utcnow() + timedelta(days=days)
        
        query = AQIForecast.query.filter(
            AQIForecast.city.ilike(f'%{city}%'),
            AQIForecast.forecast_date >= datetime.utcnow(),
            AQIForecast.forecast_date <= end_date
        )
        
        if state:
            query = query.filter(AQIForecast.state.ilike(f'%{state}%'))
        
        forecast_data = query.order_by(AQIForecast.forecast_date).all()
        
        result = [data.to_dict() for data in forecast_data]
        
        # If no forecast data available, return a placeholder message
        if not result:
            return jsonify({
                'success': True,
                'data': [],
                'message': 'No forecast data available. ML model needs to be trained and run.',
                'count': 0,
                'timestamp': datetime.utcnow().isoformat()
            })
        
        return jsonify({
            'success': True,
            'data': result,
            'count': len(result),
            'forecast_days': days,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in get_aqi_forecast: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@aqi_bp.route('/aqi/health-recommendations', methods=['GET'])
def get_health_recommendations():
    """
    Get health recommendations based on AQI level
    Query parameters:
    - aqi: AQI value (required)
    - sensitive_group: Whether user belongs to sensitive group (default: false)
    """
    try:
        aqi_value = request.args.get('aqi')
        sensitive_group = request.args.get('sensitive_group', 'false').lower() == 'true'
        
        if not aqi_value:
            return jsonify({
                'success': False,
                'error': 'AQI parameter is required'
            }), 400
        
        try:
            aqi_value = int(aqi_value)
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'AQI must be a valid integer'
            }), 400
        
        recommendations = get_health_recommendations_for_aqi(aqi_value, sensitive_group)
        
        return jsonify({
            'success': True,
            'aqi_value': aqi_value,
            'aqi_category': get_aqi_category(aqi_value),
            'sensitive_group': sensitive_group,
            'recommendations': recommendations,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in get_health_recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@aqi_bp.route('/aqi/refresh-data', methods=['POST'])
def refresh_aqi_data():
    """
    Manually refresh AQI data from external APIs
    Request body:
    - cities: List of cities to refresh (optional, defaults to major cities)
    - states: List of states to refresh (optional)
    """
    try:
        data = request.get_json() or {}
        cities = data.get('cities', [])
        states = data.get('states', [])
        
        # If no specific cities provided, use major Indian cities
        if not cities:
            major_cities = weather_ingestion.get_major_indian_cities()
            cities = [city['city'] for city in major_cities[:10]]  # Limit to first 10
        
        refreshed_count = 0
        errors = []
        
        for city in cities:
            try:
                # Fetch fresh AQI data
                fresh_aqi_data = cpcb_ingestion.fetch_realtime_aqi(city=city, limit=50)
                
                for record in fresh_aqi_data:
                    processed_record = cpcb_ingestion.process_aqi_record(record)
                    aqi_data = AQIData(**processed_record)
                    db.session.add(aqi_data)
                    refreshed_count += 1
                
            except Exception as e:
                errors.append(f"Error refreshing data for {city}: {str(e)}")
                logger.error(f"Error refreshing data for {city}: {e}")
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': f'Error saving refreshed data: {str(e)}'
            }), 500
        
        return jsonify({
            'success': True,
            'refreshed_records': refreshed_count,
            'cities_processed': cities,
            'errors': errors,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in refresh_aqi_data: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def get_aqi_category(aqi_value: int) -> str:
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

def get_health_recommendations_for_aqi(aqi_value: int, sensitive_group: bool = False) -> Dict:
    """
    Get health recommendations based on AQI value and user sensitivity
    
    Args:
        aqi_value: Current AQI value
        sensitive_group: Whether user belongs to sensitive group
        
    Returns:
        Dictionary containing health recommendations
    """
    category = get_aqi_category(aqi_value)
    
    recommendations = {
        'general_advice': '',
        'outdoor_activities': '',
        'mask_recommendation': '',
        'indoor_advice': '',
        'health_effects': '',
        'color_code': ''
    }
    
    if category == 'Good':
        recommendations.update({
            'general_advice': 'Air quality is satisfactory for most people.',
            'outdoor_activities': 'Ideal for outdoor activities.',
            'mask_recommendation': 'No mask required.',
            'indoor_advice': 'Normal ventilation is fine.',
            'health_effects': 'Minimal impact on health.',
            'color_code': '#00E400'  # Green
        })
    elif category == 'Satisfactory':
        recommendations.update({
            'general_advice': 'Air quality is acceptable for most people.',
            'outdoor_activities': 'Suitable for outdoor activities.',
            'mask_recommendation': 'No mask required for healthy individuals.',
            'indoor_advice': 'Normal ventilation is acceptable.',
            'health_effects': 'Minor breathing discomfort for sensitive people.',
            'color_code': '#FFFF00'  # Yellow
        })
    elif category == 'Moderate':
        recommendations.update({
            'general_advice': 'Sensitive individuals should consider limiting outdoor activities.',
            'outdoor_activities': 'Reduce prolonged outdoor exertion.' if sensitive_group else 'Acceptable for most people.',
            'mask_recommendation': 'Consider wearing a mask if sensitive.' if sensitive_group else 'Mask optional.',
            'indoor_advice': 'Use air purifiers if available.',
            'health_effects': 'Breathing discomfort for sensitive people.',
            'color_code': '#FF7E00'  # Orange
        })
    elif category == 'Poor':
        recommendations.update({
            'general_advice': 'Everyone should reduce outdoor activities.',
            'outdoor_activities': 'Avoid prolonged outdoor activities.',
            'mask_recommendation': 'Wear N95 or equivalent mask outdoors.',
            'indoor_advice': 'Keep windows closed, use air purifiers.',
            'health_effects': 'Breathing discomfort, throat irritation.',
            'color_code': '#FF0000'  # Red
        })
    elif category == 'Very Poor':
        recommendations.update({
            'general_advice': 'Avoid outdoor activities, especially for sensitive groups.',
            'outdoor_activities': 'Avoid all outdoor activities.',
            'mask_recommendation': 'Always wear N95 or higher grade mask outdoors.',
            'indoor_advice': 'Seal windows, use high-efficiency air purifiers.',
            'health_effects': 'Respiratory illness, heart disease aggravation.',
            'color_code': '#8F3F97'  # Purple
        })
    else:  # Severe
        recommendations.update({
            'general_advice': 'Health emergency - avoid all outdoor exposure.',
            'outdoor_activities': 'Completely avoid outdoor activities.',
            'mask_recommendation': 'N95 masks mandatory, consider staying indoors.',
            'indoor_advice': 'Seal all openings, use multiple air purifiers.',
            'health_effects': 'Serious health effects for everyone.',
            'color_code': '#7E0023'  # Maroon
        })
    
    return recommendations

