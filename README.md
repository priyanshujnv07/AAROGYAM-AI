# 🧠 AAROGYAM AI – Hyperlocal Air Quality Forecast & Health Advisory App

AAROGYAM AI is an intelligent, AI/ML-powered platform designed to forecast hyperlocal air quality and provide personalised health recommendations, especially for underserved rural and semi-urban regions across India.

---

## 🔍 Problem Statement (Bharatiya Antariksh Hackathon 2025 – Problem 
7)

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

AAROGYAM-AI/
├── client/ # React frontend
│ └── components/ # UI components
├── server/ # Node.js backend API
│ └── index.js
├── ml_model/ # Flask-based ML forecast engine
│ └── app.py
├── model.pkl # Pre-trained ML model (PM2.5 forecast)
├── README.md


---

## 🔁 Data Sources

- **Real-Time AQI**: [OpenAQ](https://docs.openaq.org/)
- **Weather Data**: [OpenWeatherMap](https://openweathermap.org/api)
- **Historical PM2.5**: CPCB datasets (for model training)
- **Satellite**: [Sentinel-5P TROPOMI](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S5P_NRTI_L3_NO2)

---

## 🔧 Setup & Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/priyanshujnv07/AAROGYAM-AI.git
cd AAROGYAM-AI
2. Start ML Model Server
bash
Copy
Edit
cd ml_model
pip install -r requirements.txt
python app.py
3. Start Node.js Backend
bash
Copy
Edit
cd server
npm install
node index.js
4. Start React Frontend
bash
Copy
Edit
cd client
npm install
npm start
🤖 Machine Learning Model
Input Features: Temperature, Humidity, Wind Speed, Past AQI

Model: XGBoost Regressor trained on real-world Indian air quality data

Output: PM2.5 concentration prediction for 3 days

Evaluation Metrics: MAE, RMSE, R²

📈 Demo Preview
To be added later

👥 Team VYANAM
Name	Role	Institution
Priyanshu Sharma	AI/ML Lead, Backend Dev	IIPS Mumbai
Bipul Kumar	Frontend Dev, UI/UX	IIPS Mumbai
Ranveer Raj	Forecast Integration, Data Handling	IIPS Mumbai
Madhav Verma	Health Mapping, Research Coordinator,	IIPS (MA Population Studies)

🛠️ Future Enhancements
🔔 Push notification system for AQI alerts (Firebase)

🌐 Multi-language support (Hindi, regional languages)

🔬 Integration of Sentinel-5P-based emission sources

🧩 Modular API for third-party devs and smart city use

🏥 Emergency alert dashboard for schools and hospitals

📃 License
MIT License – feel free to fork, remix, and improve this open-source tool.

🙏 Acknowledgements
👨‍🚀 Indian Space Research Organisation (ISRO)

🧠 Hack2Skill Platform

🌫️ Central Pollution Control Board (CPCB)

🌍 OpenAQ, OpenWeather, Sentinel-5P ESA Team


---

### 🫶 About This Project

**AAROGYAM AI** is more than just a hackathon entry — it’s a mission-driven innovation built to democratize air quality information for every Indian, especially those in rural and semi-urban areas who are often left out of the data narrative. By combining remote sensing, machine learning, and citizen-focused design, we aim to make breathing safer and smarter for everyone.
