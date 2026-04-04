# Emotion-Aware Smart Environment

Detects human emotions via webcam and automatically adjusts simulated room environment (lighting, fan, music, notifications). Learns user preferences over time.

---

## Local Run

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs at: http://localhost:5000

Optional backend environment variables:

- `HOST` default: `0.0.0.0`
- `PORT` default: `5000`
- `FLASK_DEBUG` default: `1`

### Frontend
```bash
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

Optional frontend environment variable:

- `REACT_APP_API_URL` default: `http://localhost:5000`
- `PORT` default for this project: `3001` to avoid clashes with other local React apps
- Copy `frontend/.env.example` to `frontend/.env` and update it if your backend runs elsewhere

---

## Production Build

### Frontend build
```bash
cd frontend
npm install
npm run build
```

The production files are generated in `frontend/build/`.

### Serve the frontend build
```bash
cd frontend
npx serve -s build
```

### Run the backend in production-style mode
```bash
cd backend
set FLASK_DEBUG=0
python app.py
```

---

## Create React App (first time)
```bash
npx create-react-app frontend
cd frontend
npm install react-webcam recharts axios
```

Then replace the `src/` folder with the provided source files.

---

## How It Works

1. Webcam captures your face every 5 seconds
2. DeepFace detects emotion (happy, sad, stressed, angry, neutral, surprised)
3. Decision engine checks your past feedback to pick the best environment settings
4. Simulated IoT panel updates: light color, fan speed, music genre, notification toggle
5. You give feedback (👍 👎 Skip) → system learns your preferences
6. Learning log shows what the system has memorized about you

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /detect-emotion | Send base64 image → get emotion + action |
| GET | /get-action?emotion=happy | Get action for any emotion |
| POST | /submit-feedback | Save thumbs_up / thumbs_down / skip |
| GET | /get-preferences | Return all learned preferences |
| POST | /override-device | Manual device override from UI |
| GET | /current-state | Get current simulated device state |
