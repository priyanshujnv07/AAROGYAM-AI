## System Architecture Design

### Overview
The Air Quality Visualizer and Forecast App will follow a microservices-oriented architecture, separating concerns into distinct components for scalability, maintainability, and flexibility. The core components will include a data ingestion layer, a backend API, a machine learning forecasting service, a database, and a frontend application.

### Components and Technologies

1.  **Data Ingestion Layer:**
    *   **Purpose:** To collect real-time and historical AQI data from CPCB and meteorological data from IMD.
    *   **Technologies:** Python scripts with `requests` library for API calls, potentially `Apache Kafka` for message queuing if data volume is high.
    *   **Data Sources:** CPCB API (via data.gov.in), IMD APIs.

2.  **Backend API (Node.js + Express):**
    *   **Purpose:** To serve data to the frontend, handle user requests, and orchestrate data processing and forecasting.
    *   **Technologies:** Node.js with Express.js framework.
    *   **Key Endpoints:**
        *   `/api/aqi/realtime`: Provides current AQI for a given location.
        *   `/api/aqi/historical`: Provides historical AQI trends for a given location and time range.
        *   `/api/forecast`: Provides air quality forecasts for the next 24-72 hours.
        *   `/api/health_recommendations`: Provides health recommendations based on AQI levels.

3.  **Database (Supabase DB):**
    *   **Purpose:** To store raw AQI data, processed AQI data, historical trends, meteorological data, and user-specific settings/alerts.
    *   **Technologies:** PostgreSQL, managed by Supabase for ease of use and real-time capabilities.

4.  **Machine Learning Forecasting Service:**
    *   **Purpose:** To train and serve the air quality forecasting model.
    *   **Technologies:** Python with `TensorFlow Lite` (for on-device inference if applicable) or `Hugging Face predictive models API` (for cloud-based inference). `Scikit-learn` and `Pandas` for data preprocessing and model training.
    *   **Input:** Historical AQI data, meteorological data (temperature, humidity, wind speed, etc.).
    *   **Output:** Predicted AQI values for future time steps.

5.  **Frontend Application (Flutter/React):**
    *   **Purpose:** User interface for visualizing AQI data, historical trends, forecasts, and health recommendations.
    *   **Technologies:** Flutter (for cross-platform mobile and web) or React (for web). Flutter is preferred given the problem statement's suggestion.
    *   **Key Features:**
        *   Interactive AQI map with color-coded zones.
        *   Graphs for historical AQI trends.
        *   Line charts or animated maps for forecast data.
        *   Health advisory dashboard.

6.  **Mapping and Geospatial Services (Google Maps API):**
    *   **Purpose:** To display AQI data on a map, allow location selection, and potentially visualize pollution sources.
    *   **Technologies:** Google Maps API (or Bhuvan Maps if more India-specific features are required and accessible).

7.  **Notification Service (Firebase Notifications):**
    *   **Purpose:** To send push notifications for pollution spikes and personalized health alerts.
    *   **Technologies:** Firebase Cloud Messaging (FCM).

8.  **Analytics (Firebase Analytics, Google Analytics):**
    *   **Purpose:** To track user engagement, app performance, and gather insights for improvements.
    *   **Technologies:** Firebase Analytics (for mobile), Google Analytics (for web).

### Data Flow

1.  **Real-time AQI Updates:**
    *   Data Ingestion Layer fetches real-time AQI from CPCB API.
    *   Data is stored in Supabase DB.
    *   Backend API retrieves data from Supabase DB and serves to Frontend.
    *   Frontend displays real-time AQI on the map.

2.  **Historical AQI Trends:**
    *   Data Ingestion Layer periodically fetches historical AQI data from CPCB API and stores in Supabase DB.
    *   Frontend requests historical data from Backend API.
    *   Backend API retrieves and aggregates historical data from Supabase DB and sends to Frontend.
    *   Frontend visualizes historical trends in graphs.

3.  **Forecasting:**
    *   Data Ingestion Layer fetches meteorological data from IMD APIs and stores in Supabase DB.
    *   Machine Learning Forecasting Service retrieves historical AQI and meteorological data from Supabase DB.
    *   ML model trains and predicts future AQI.
    *   Predicted AQI is stored back in Supabase DB.
    *   Frontend requests forecast data from Backend API.
    *   Backend API retrieves forecast data from Supabase DB and sends to Frontend.
    *   Frontend displays forecast as line charts or animated maps.

4.  **Health Recommendations and Alerts:**
    *   Backend API processes real-time and forecasted AQI data.
    *   Based on predefined WHO/Indian standards, health recommendations are generated.
    *   Recommendations are sent to Frontend for display.
    *   If AQI thresholds are crossed, Backend API triggers Firebase Notifications to send push alerts to users.

5.  **Pollution Source Mapping (Optional):**
    *   Requires additional data sources (e.g., traffic density, industrial zones).
    *   Data Ingestion Layer collects this data.
    *   Data stored in Supabase DB.
    *   Frontend displays heatmaps using Google Maps API.


