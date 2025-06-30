# 🧠 AAROGYAM AI – Hyperlocal Air Quality Forecast & Health Advisory App

AAROGYAM AI is an intelligent, AI/ML-powered platform designed to forecast hyperlocal air quality and provide personalised health recommendations, especially for underserved rural and semi-urban regions across India.

---

## 🔍 Problem Statement (Bharatiya Antariksh Hackathon 2025 – Problem -7
Develop an algorithm and mobile/web application to visualise real-time AQI, forecast 72-hour air quality using meteorological and satellite data, and provide localised health advisories for rural and small-town populations.

---

## 🎯 Features

- 🌍 Real-time AQI map using OpenAQ + satellite feeds
- 📈 3-day PM2.5 forecasting using ML models (LSTM/XGBoost)
- 🧘 Health advisory module based on WHO & CPCB standards
- 🗺️ Interactive AQI heatmap with pin-based location input
- 🔔 Push notifications for air quality spikes
- 💡 Educational content for pollution prevention

---

## 🛠️ Tech Stack

| Layer             | Tools & Libraries Used                                     |
|------------------|------------------------------------------------------------|
| **Frontend**     | React.js, Tailwind CSS, Chart.js, Leaflet.js               |
| **Backend**      | Node.js, Express.js, Axios, CORS                           |
| **ML Forecast**  | Python, Flask, Pandas, Scikit-learn, XGBoost               |
| **APIs/Data**    | OpenAQ API, OpenWeatherMap API, Sentinel-5P (TROPOMI)      |
| **Deployment**   | Replit, Render, Netlify, GitHub                            |
| **Monitoring**   | Firebase Analytics (planned)                               |

---

## 📂 Project Structure

| Path                    | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| `/client/`              | React frontend for AQI visualisation and user interaction    |
| ├── `/src/components/`  | Reusable UI components (cards, charts, maps, etc.)           |
| ├── `App.js`            | Main application component                                   |
| └── `index.js`          | React entry point                                            |
| `/server/`              | Node.js + Express backend API                                |
| └── `index.js`          | Handles routes, connects frontend and ML API                 |
| `/ml_model/`            | Flask server hosting the trained ML model                   |
| ├── `app.py`            | API endpoint for PM2.5 prediction                           |
| └── `model.pkl`         | Pre-trained XGBoost regression model                        |
| `/public/`              | Static assets for frontend                                   |
| `/data/` (optional)     | Scripts or data files for preprocessing and testing          |
| `README.md`             | Project documentation                                        |
| `.gitignore`            | Specifies untracked files for Git                           |
| `package.json`          | NPM metadata and dependencies for backend/frontend           |
| `requirements.txt`      | Python dependencies for ML model                             |


---

## 🔁 Data Sources

- **Real-Time AQI**: [OpenAQ](https://docs.openaq.org/)
- **Weather Data**: [OpenWeatherMap](https://openweathermap.org/api)
- **Historical PM2.5**: CPCB datasets (for model training)
- **Satellite**: [Sentinel-5P TROPOMI](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_NRTI_L3_NO2)

---

## 🔧 Setup & Run Locally

### 1. Clone the Repository
bash
git clone https://github.com/priyanshujnv07/AAROGYAM-AI.git
cd AAROGYAM-AI

---

### 2. Start the ML Model Server
cd ml_model
pip install -r requirements.txt
python app.py

---

### 3. Start the Backend Server
cd server
npm install
ode index.js

---

### 4. Start the Frontend
cd client
npm install
npm start

---

## 🤖 Machine Learning Model
Input Features: Temperature, Humidity, Wind Speed, Historical AQI

Model: XGBoost Regressor trained on real-world Indian air quality data

Output: PM2.5 concentration prediction for the next 3 days

Evaluation Metrics: MAE, RMSE, R²

---

## 📈 Demo Preview
🔜 To be added soon…

---

## 👥 Team VYANAM

| Name              | Role & Expertise                                                                 | Institution                      |
|-------------------|-----------------------------------------------------------------------------------|----------------------------------|
| **Priyanshu Sharma**  | 💡 AI/ML Lead & Backend Developer — Designed the prediction model, Flask-ML pipeline, API logic, and coordinated overall project architecture | IIPS Mumbai (MSc Survey Research and Data Analytics)|
| **Bipul Kumar**       | 🎨 Frontend Developer & UI/UX Designer — Developed the React interface, integrated AQI maps, graphs, and ensured responsive user experience | IIPS Mumbai (MSc Survey Research and Data Analytics)|
| **Ranveer Raj**       | 📊 Forecast Integration & Data Handler — Curated datasets, connected meteorological APIs, supported ML model validation and backend logic | IIPS Mumbai (MSc Survey Research and Data Analytics)|
| **Madhav Verma**      | 🧘‍♂️ Health Advisor & Research Coordinator — Created health mapping system, linked AQI to health advisories, contributed to data interpretation & impact focus | IIPS (MA Population Studies)     |


---

## 🛠️ Future Enhancements
🔔 Push notification system for AQI alerts (Firebase)

🌐 Multi-language support (Hindi & regional languages)

🔬 Integration of Sentinel-5P-based emission sources

🧩 Modular API for third-party developers and smart cities

🏥 Emergency alert dashboard for schools and hospitals

---

## 📃 License
MIT License – feel free to fork, remix, build upon, and improve this open-source tool.

---

## 🙏 Acknowledgements
👨‍🚀 Indian Space Research Organisation (ISRO)

🧠 Hack2Skill Platform

🌫️ Central Pollution Control Board (CPCB)

🌍 OpenAQ, OpenWeather, and Sentinel-5P ESA Team

---

## 🫶 About This Project
AAROGYAM AI is more than just a hackathon entry — it's a mission-driven innovation built to democratise air quality information for every Indian, especially those in rural and semi-urban areas who are often left out of mainstream data narratives.
By combining remote sensing, machine learning, and human-centred design, we aim to make breathing safer and smarter for everyone.

"Breathing clean air is not a privilege. It's a basic right." – Team VYANAM
