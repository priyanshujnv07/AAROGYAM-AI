## CPCB AQI Data

**Availability:** Real-time and historical AQI data for various locations across India.

**Access Methods:**
*   **Website:** https://airquality.cpcb.gov.in/AQI_India/ provides a web interface to view current AQI. Requires captcha verification.
*   **Data.gov.in API:** https://www.data.gov.in/resource/real-time-air-quality-index-various-locations offers an API for real-time AQI data. This API allows filtering by country, state, city, station, and pollutant ID. It supports XML, JSON, and CSV formats. An API key is required for access.

**Limitations:**
*   The real-time data from CPCB is displayed live without human intervention and may contain errors or abnormal values due to instrumental errors or specific episodes.
*   The API on data.gov.in requires an API key, which needs to be generated.
*   The API documentation on data.gov.in is somewhat limited, requiring further exploration to understand all parameters and response structures fully.



## IMD Meteorological Data

**Availability:** Various observations and forecast products, including real-time weather, temperature, and rainfall.

**Access Methods:**
*   **Website:** https://mausam.imd.gov.in/ provides weather forecasts and bulletins.
*   **APIs:** IMD has developed APIs for various observations and forecast products. A PDF document outlining these APIs is available at https://mausam.imd.gov.in/Forecast/marquee_data/API_doc.pdf. There are also community-developed APIs on GitHub (e.g., https://github.com/rtdtwo/india-weather-rest, https://github.com/abin-m/Weather-api-imd) that access IMD data, though their official support is not guaranteed.

**Limitations:**
*   Official IMD APIs might require specific access procedures or authentication.
*   Community-developed APIs might not be officially supported or maintained.
*   The PDF documentation needs to be thoroughly reviewed to understand the API endpoints and data formats.


