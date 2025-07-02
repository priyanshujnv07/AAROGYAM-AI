# Air Quality Visualizer and Forecast App - Installation and Setup Guide

This guide provides step-by-step instructions for setting up the Air Quality Visualizer and Forecast App development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+**
- **Node.js 14+** (for frontend development tools)
- **Git**
- **pip** (Python package manager)
- **npm** (Node.js package manager)

## Backend Setup

### 1. Clone the Repository

```bash
git clone https://github.com/airqualityapp/air-quality-backend.git
cd air-quality-backend
```

### 2. Create and Activate Virtual Environment

#### On Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

#### On macOS/Linux:
```bash
python -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```
# Database Configuration
DB_TYPE=sqlite  # or postgresql for production
DB_PATH=./instance/app.db  # for SQLite
# DB_HOST=localhost  # for PostgreSQL
# DB_PORT=5432  # for PostgreSQL
# DB_NAME=airquality  # for PostgreSQL
# DB_USER=username  # for PostgreSQL
# DB_PASSWORD=password  # for PostgreSQL

# API Keys
CPCB_API_KEY=your_cpcb_api_key
WEATHER_API_KEY=your_weather_api_key

# Firebase Configuration (for notifications)
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/firebase-service-account.json

# Application Settings
DEBUG=True
SECRET_KEY=your_secret_key
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
```

### 5. Initialize the Database

```bash
python init_db.py
```

### 6. Start the Backend Server

```bash
python src/main.py
```

The backend server will start at `http://localhost:5000`.

## Frontend Setup

### 1. Clone the Repository

```bash
git clone https://github.com/airqualityapp/air-quality-frontend.git
cd air-quality-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Endpoint

Edit the `src/utils/api.js` file to point to your backend server:

```javascript
// For local development
const API_BASE_URL = 'http://localhost:5000/api';

// For production
// const API_BASE_URL = 'https://api.airqualityapp.org/v1';
```

### 4. Start the Development Server

```bash
npm start
```

The frontend development server will start at `http://localhost:3000`.

## Machine Learning Model Setup

### 1. Install Additional Dependencies

```bash
pip install scikit-learn pandas numpy matplotlib tensorflow
```

### 2. Download Sample Data

```bash
mkdir -p data/raw
python scripts/download_sample_data.py
```

### 3. Train the Initial Model

```bash
python src/ml_models/aqi_forecasting.py --train
```

This will train the initial model and save it to the `models` directory.

## API Keys and External Services

### CPCB API

1. Register for an API key at the [CPCB Data Portal](https://www.data.gov.in/resource/real-time-air-quality-index-various-locations)
2. Add the API key to your `.env` file

### Weather API

1. Register for an API key at [OpenWeatherMap](https://openweathermap.org/api) or another weather service
2. Add the API key to your `.env` file

### Firebase (for Notifications)

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Generate a service account key and download the JSON file
3. Add the path to the JSON file in your `.env` file

## Testing

### Backend Tests

```bash
pytest tests/
```

### Frontend Tests

```bash
npm test
```

## Deployment

### Backend Deployment

#### Using Gunicorn (for production)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 src.main:app
```

#### Using Docker

```bash
docker build -t air-quality-backend .
docker run -p 5000:5000 air-quality-backend
```

### Frontend Deployment

#### Build for Production

```bash
npm run build
```

This will create a `build` directory with optimized production files.

#### Deploy to a Static Web Server

Copy the contents of the `build` directory to your web server's root directory.

## Troubleshooting

### Common Issues

#### Backend API Connection Issues

- Ensure the backend server is running
- Check CORS settings in the backend `.env` file
- Verify the API endpoint in the frontend configuration

#### Database Initialization Errors

- Check database connection settings in the `.env` file
- Ensure you have proper permissions for the database directory
- Run `python init_db.py --reset` to reset the database

#### ML Model Training Errors

- Ensure you have sufficient sample data
- Check for missing dependencies
- Increase memory allocation if needed

### Getting Help

- Check the [GitHub Issues](https://github.com/airqualityapp/issues) for known problems
- Join our [Discord community](https://discord.gg/airqualityapp) for real-time help
- Contact support at support@airqualityapp.org

## Contributing

We welcome contributions to the Air Quality Visualizer and Forecast App! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

