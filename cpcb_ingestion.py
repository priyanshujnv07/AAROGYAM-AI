import requests
import json
from datetime import datetime
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CPCBDataIngestion:
    """
    Data ingestion class for CPCB AQI data from data.gov.in API
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
        self.headers = {
            'User-Agent': 'AirQualityApp/1.0'
        }
    
    def fetch_realtime_aqi(self, 
                          state: Optional[str] = None, 
                          city: Optional[str] = None, 
                          limit: int = 100) -> List[Dict]:
        """
        Fetch real-time AQI data from CPCB API
        
        Args:
            state: Filter by state name
            city: Filter by city name
            limit: Maximum number of records to fetch
            
        Returns:
            List of AQI data records
        """
        params = {
            'api-key': self.api_key,
            'format': 'json',
            'limit': limit
        }
        
        if state:
            params['filters[state]'] = state
        if city:
            params['filters[city]'] = city
            
        try:
            response = requests.get(self.base_url, params=params, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'records' in data:
                logger.info(f"Successfully fetched {len(data['records'])} AQI records")
                return data['records']
            else:
                logger.warning("No 'records' field found in API response")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching CPCB data: {e}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {e}")
            return []
    
    def fetch_aqi_by_pollutant(self, pollutant: str, limit: int = 100) -> List[Dict]:
        """
        Fetch AQI data filtered by specific pollutant
        
        Args:
            pollutant: Pollutant type (PM10, PM2.5, NO2, SO2, CO, OZONE, NH3)
            limit: Maximum number of records to fetch
            
        Returns:
            List of AQI data records for the specified pollutant
        """
        params = {
            'api-key': self.api_key,
            'format': 'json',
            'limit': limit,
            'filters[pollutant_id]': pollutant
        }
        
        try:
            response = requests.get(self.base_url, params=params, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'records' in data:
                logger.info(f"Successfully fetched {len(data['records'])} records for {pollutant}")
                return data['records']
            else:
                logger.warning(f"No 'records' field found for pollutant {pollutant}")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {pollutant} data: {e}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response for {pollutant}: {e}")
            return []
    
    def process_aqi_record(self, record: Dict) -> Dict:
        """
        Process and clean a single AQI record
        
        Args:
            record: Raw AQI record from API
            
        Returns:
            Processed AQI record
        """
        processed = {
            'country': record.get('country', 'India'),
            'state': record.get('state', ''),
            'city': record.get('city', ''),
            'station': record.get('station', ''),
            'latitude': self._safe_float(record.get('latitude')),
            'longitude': self._safe_float(record.get('longitude')),
            'pollutant_id': record.get('pollutant_id', ''),
            'pollutant_min': self._safe_float(record.get('pollutant_min')),
            'pollutant_max': self._safe_float(record.get('pollutant_max')),
            'pollutant_avg': self._safe_float(record.get('pollutant_avg')),
            'last_update': self._parse_datetime(record.get('last_update')),
        }
        
        # Calculate AQI category based on pollutant average
        processed['aqi_value'] = self._calculate_aqi(
            processed['pollutant_id'], 
            processed['pollutant_avg']
        )
        processed['aqi_category'] = self._get_aqi_category(processed['aqi_value'])
        
        return processed
    
    def _safe_float(self, value) -> Optional[float]:
        """Safely convert value to float"""
        if value is None or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _parse_datetime(self, date_str: str) -> Optional[datetime]:
        """Parse datetime string to datetime object"""
        if not date_str:
            return None
        
        # Try different datetime formats
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%d',
            '%d-%m-%Y %H:%M:%S',
            '%d/%m/%Y %H:%M:%S'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        logger.warning(f"Could not parse datetime: {date_str}")
        return None
    
    def _calculate_aqi(self, pollutant: str, concentration: Optional[float]) -> Optional[int]:
        """
        Calculate AQI based on pollutant concentration
        Using Indian National AQI standards
        """
        if concentration is None:
            return None
        
        # AQI breakpoints for different pollutants (Indian standards)
        breakpoints = {
            'PM2.5': [(0, 30, 0, 50), (30, 60, 51, 100), (60, 90, 101, 200), 
                     (90, 120, 201, 300), (120, 250, 301, 400), (250, float('inf'), 401, 500)],
            'PM10': [(0, 50, 0, 50), (50, 100, 51, 100), (100, 250, 101, 200), 
                    (250, 350, 201, 300), (350, 430, 301, 400), (430, float('inf'), 401, 500)],
            'NO2': [(0, 40, 0, 50), (40, 80, 51, 100), (80, 180, 101, 200), 
                   (180, 280, 201, 300), (280, 400, 301, 400), (400, float('inf'), 401, 500)],
            'SO2': [(0, 40, 0, 50), (40, 80, 51, 100), (80, 380, 101, 200), 
                   (380, 800, 201, 300), (800, 1600, 301, 400), (1600, float('inf'), 401, 500)],
            'CO': [(0, 1, 0, 50), (1, 2, 51, 100), (2, 10, 101, 200), 
                  (10, 17, 201, 300), (17, 34, 301, 400), (34, float('inf'), 401, 500)],
            'OZONE': [(0, 50, 0, 50), (50, 100, 51, 100), (100, 168, 101, 200), 
                     (168, 208, 201, 300), (208, 748, 301, 400), (748, float('inf'), 401, 500)],
            'NH3': [(0, 200, 0, 50), (200, 400, 51, 100), (400, 800, 101, 200), 
                   (800, 1200, 201, 300), (1200, 1800, 301, 400), (1800, float('inf'), 401, 500)]
        }
        
        if pollutant not in breakpoints:
            return None
        
        for c_low, c_high, aqi_low, aqi_high in breakpoints[pollutant]:
            if c_low <= concentration <= c_high:
                # Linear interpolation formula
                aqi = ((aqi_high - aqi_low) / (c_high - c_low)) * (concentration - c_low) + aqi_low
                return int(round(aqi))
        
        return None
    
    def _get_aqi_category(self, aqi_value: Optional[int]) -> str:
        """Get AQI category based on AQI value"""
        if aqi_value is None:
            return 'Unknown'
        
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

