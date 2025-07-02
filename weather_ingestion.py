import requests
import json
from datetime import datetime
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WeatherDataIngestion:
    """
    Data ingestion class for weather data from various sources
    """
    
    def __init__(self, openweather_api_key: Optional[str] = None):
        self.openweather_api_key = openweather_api_key
        self.openweather_base_url = "https://api.openweathermap.org/data/2.5"
        self.headers = {
            'User-Agent': 'AirQualityApp/1.0'
        }
    
    def fetch_current_weather_openweather(self, city: str, state: str = None) -> Optional[Dict]:
        """
        Fetch current weather data from OpenWeatherMap API
        
        Args:
            city: City name
            state: State name (optional)
            
        Returns:
            Weather data record or None if failed
        """
        if not self.openweather_api_key:
            logger.error("OpenWeatherMap API key not provided")
            return None
        
        # Construct query string
        query = city
        if state:
            query += f",{state},IN"  # IN for India
        else:
            query += ",IN"
        
        params = {
            'q': query,
            'appid': self.openweather_api_key,
            'units': 'metric'  # Celsius
        }
        
        try:
            response = requests.get(
                f"{self.openweather_base_url}/weather", 
                params=params, 
                headers=self.headers, 
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            
            processed_data = self._process_openweather_record(data, city, state)
            logger.info(f"Successfully fetched weather data for {city}")
            return processed_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching weather data for {city}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing weather JSON response for {city}: {e}")
            return None
    
    def fetch_weather_forecast_openweather(self, city: str, state: str = None, days: int = 5) -> List[Dict]:
        """
        Fetch weather forecast data from OpenWeatherMap API
        
        Args:
            city: City name
            state: State name (optional)
            days: Number of days to forecast (max 5 for free tier)
            
        Returns:
            List of weather forecast records
        """
        if not self.openweather_api_key:
            logger.error("OpenWeatherMap API key not provided")
            return []
        
        # Construct query string
        query = city
        if state:
            query += f",{state},IN"
        else:
            query += ",IN"
        
        params = {
            'q': query,
            'appid': self.openweather_api_key,
            'units': 'metric',
            'cnt': days * 8  # 8 forecasts per day (3-hour intervals)
        }
        
        try:
            response = requests.get(
                f"{self.openweather_base_url}/forecast", 
                params=params, 
                headers=self.headers, 
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            
            forecasts = []
            if 'list' in data:
                for forecast_item in data['list']:
                    processed_forecast = self._process_openweather_forecast_record(
                        forecast_item, city, state, data.get('city', {})
                    )
                    forecasts.append(processed_forecast)
            
            logger.info(f"Successfully fetched {len(forecasts)} weather forecasts for {city}")
            return forecasts
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching weather forecast for {city}: {e}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing weather forecast JSON for {city}: {e}")
            return []
    
    def fetch_weather_from_indian_api(self, city: str) -> Optional[Dict]:
        """
        Fetch weather data from Indian Weather API (indianapi.in)
        This is a placeholder implementation - actual API key and endpoint would be needed
        
        Args:
            city: City name
            
        Returns:
            Weather data record or None if failed
        """
        # This is a placeholder implementation
        # In a real scenario, you would need to register for an API key at indianapi.in
        logger.info(f"Indian Weather API integration for {city} - placeholder implementation")
        return None
    
    def _process_openweather_record(self, data: Dict, city: str, state: str = None) -> Dict:
        """
        Process OpenWeatherMap current weather record
        
        Args:
            data: Raw weather data from OpenWeatherMap
            city: City name
            state: State name
            
        Returns:
            Processed weather record
        """
        coord = data.get('coord', {})
        main = data.get('main', {})
        wind = data.get('wind', {})
        
        return {
            'city': city,
            'state': state or 'Unknown',
            'latitude': coord.get('lat'),
            'longitude': coord.get('lon'),
            'temperature': main.get('temp'),
            'humidity': main.get('humidity'),
            'pressure': main.get('pressure'),
            'wind_speed': wind.get('speed'),
            'wind_direction': wind.get('deg'),
            'visibility': data.get('visibility', 0) / 1000 if data.get('visibility') else None,  # Convert to km
            'recorded_at': datetime.utcnow()
        }
    
    def _process_openweather_forecast_record(self, forecast_item: Dict, city: str, state: str, city_data: Dict) -> Dict:
        """
        Process OpenWeatherMap forecast record
        
        Args:
            forecast_item: Single forecast item from API
            city: City name
            state: State name
            city_data: City information from API response
            
        Returns:
            Processed weather forecast record
        """
        coord = city_data.get('coord', {})
        main = forecast_item.get('main', {})
        wind = forecast_item.get('wind', {})
        
        return {
            'city': city,
            'state': state or 'Unknown',
            'latitude': coord.get('lat'),
            'longitude': coord.get('lon'),
            'temperature': main.get('temp'),
            'humidity': main.get('humidity'),
            'pressure': main.get('pressure'),
            'wind_speed': wind.get('speed'),
            'wind_direction': wind.get('deg'),
            'visibility': forecast_item.get('visibility', 0) / 1000 if forecast_item.get('visibility') else None,
            'recorded_at': datetime.fromtimestamp(forecast_item.get('dt', 0)) if forecast_item.get('dt') else datetime.utcnow()
        }
    
    def get_major_indian_cities(self) -> List[Dict]:
        """
        Get list of major Indian cities for data collection
        
        Returns:
            List of city dictionaries with name and state
        """
        return [
            {'city': 'Delhi', 'state': 'Delhi'},
            {'city': 'Mumbai', 'state': 'Maharashtra'},
            {'city': 'Bangalore', 'state': 'Karnataka'},
            {'city': 'Hyderabad', 'state': 'Telangana'},
            {'city': 'Chennai', 'state': 'Tamil Nadu'},
            {'city': 'Kolkata', 'state': 'West Bengal'},
            {'city': 'Pune', 'state': 'Maharashtra'},
            {'city': 'Ahmedabad', 'state': 'Gujarat'},
            {'city': 'Jaipur', 'state': 'Rajasthan'},
            {'city': 'Lucknow', 'state': 'Uttar Pradesh'},
            {'city': 'Kanpur', 'state': 'Uttar Pradesh'},
            {'city': 'Nagpur', 'state': 'Maharashtra'},
            {'city': 'Indore', 'state': 'Madhya Pradesh'},
            {'city': 'Bhopal', 'state': 'Madhya Pradesh'},
            {'city': 'Visakhapatnam', 'state': 'Andhra Pradesh'},
            {'city': 'Patna', 'state': 'Bihar'},
            {'city': 'Vadodara', 'state': 'Gujarat'},
            {'city': 'Ghaziabad', 'state': 'Uttar Pradesh'},
            {'city': 'Ludhiana', 'state': 'Punjab'},
            {'city': 'Agra', 'state': 'Uttar Pradesh'},
            {'city': 'Nashik', 'state': 'Maharashtra'},
            {'city': 'Faridabad', 'state': 'Haryana'},
            {'city': 'Meerut', 'state': 'Uttar Pradesh'},
            {'city': 'Rajkot', 'state': 'Gujarat'},
            {'city': 'Kalyan-Dombivali', 'state': 'Maharashtra'},
            {'city': 'Vasai-Virar', 'state': 'Maharashtra'},
            {'city': 'Varanasi', 'state': 'Uttar Pradesh'},
            {'city': 'Srinagar', 'state': 'Jammu and Kashmir'},
            {'city': 'Aurangabad', 'state': 'Maharashtra'},
            {'city': 'Dhanbad', 'state': 'Jharkhand'},
            {'city': 'Amritsar', 'state': 'Punjab'},
            {'city': 'Navi Mumbai', 'state': 'Maharashtra'},
            {'city': 'Allahabad', 'state': 'Uttar Pradesh'},
            {'city': 'Ranchi', 'state': 'Jharkhand'},
            {'city': 'Howrah', 'state': 'West Bengal'},
            {'city': 'Coimbatore', 'state': 'Tamil Nadu'},
            {'city': 'Jabalpur', 'state': 'Madhya Pradesh'},
            {'city': 'Gwalior', 'state': 'Madhya Pradesh'},
            {'city': 'Vijayawada', 'state': 'Andhra Pradesh'},
            {'city': 'Jodhpur', 'state': 'Rajasthan'},
            {'city': 'Madurai', 'state': 'Tamil Nadu'},
            {'city': 'Raipur', 'state': 'Chhattisgarh'},
            {'city': 'Kota', 'state': 'Rajasthan'},
            {'city': 'Guwahati', 'state': 'Assam'},
            {'city': 'Chandigarh', 'state': 'Chandigarh'},
            {'city': 'Thiruvananthapuram', 'state': 'Kerala'},
            {'city': 'Solapur', 'state': 'Maharashtra'},
            {'city': 'Hubballi-Dharwad', 'state': 'Karnataka'},
            {'city': 'Tiruchirappalli', 'state': 'Tamil Nadu'},
            {'city': 'Bareilly', 'state': 'Uttar Pradesh'}
        ]

