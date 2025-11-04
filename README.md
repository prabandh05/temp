# 🏆 Sports Management Platform

A full-stack, AI-powered sports management system that streamlines player development, team coordination, tournament management, and coaching workflows.

Supports role-based dashboards for Players, Coaches, Managers, and Admins — all powered by Django + React.

---

## ⚙️ Tech Stack

- **Backend**: Django 5 + DRF + PostgreSQL/SQLite
- **Frontend**: React 19 + Tailwind CSS + Axios
- **AI**: Google Gemini (optional for player insights)
- **Auth**: JWT
- **Language**: Python 3.8+ / Node.js 16+

---

## 🚀 Quick Setup Guide

### 1️⃣ Clone the Repository

```bash
git clone <repository-url>
cd social_sports_temp
```

Your structure should look like this:

```
social_sports_temp/
├── backend/
├── frontend/
├── requirements.txt
└── venv/ (will be created here)
```

### 2️⃣ Create and Activate Virtual Environment (ROOT level)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

✅ After activation, `(venv)` should appear in your terminal prompt.

### 3️⃣ Install Backend Dependencies

```bash
pip install -r requirements.txt
```

*(requirements.txt is in the root directory)*

### 4️⃣ Set Up Environment Variables

Create a `.env` file inside the `backend` folder:

```bash
cd backend
```

Then create the file:

```bash
# Windows
notepad .env

# Linux/Mac
nano .env
```

Paste this:

```env
SECRET_KEY=replace-this-with-a-strong-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
USE_SQLITE=True
# Or use PostgreSQL:
# DB_ENGINE=django.db.backends.postgresql
# DB_NAME=social_sports
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOW_CREDENTIALS=True

# AI (optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5️⃣ Apply Migrations and Load Demo Data

Run all backend commands from the `backend` folder (while the virtual environment is active):

```bash
cd backend
python manage.py migrate
python manage.py seed_demo --clear
```

This seeds demo users, teams, and tournaments.

### 6️⃣ Start Servers

**Backend (Terminal 1):**
```bash
cd backend
python manage.py runserver
```

Backend → `http://127.0.0.1:8000`

**Frontend (Terminal 2):**
```bash
cd frontend
npm install
npm start
```

Frontend → `http://localhost:3000`

---

## 🔑 Demo Logins

| Role | Username | Password |
|------|----------|----------|
| Admin | `demo_admin` | `demo123` |
| Manager (Cricket) | `demo_manager_cricket` | `demo123` |
| Coach (Cricket) | `demo_coach_cricket` | `demo123` |
| Player | `demo_player01` | `demo123` |

---

## 🧠 Key Features

✅ Role-based dashboards (Player, Coach, Manager, Admin)  
✅ Real-time match scoring (Cricket)  
✅ Team proposal & approval workflow  
✅ AI-powered performance insights  
✅ Coach session management with CSV upload  
✅ Automatic leaderboard and points table generation  
✅ Notification system for all key actions  

---

## 🧩 Directory Overview

```
social_sports_temp/
├── backend/               # Django backend (run commands here)
│   ├── core/              # Main app (models, views, serializers)
│   ├── manage.py
│   └── .env               # Environment variables
├── frontend/              # React frontend (npm start)
├── requirements.txt        # Python dependencies (root level)
└── venv/                  # Virtual environment (root level)
```

---

## 🧪 Quick Testing

1. Run backend (`python manage.py runserver`)
2. Run frontend (`npm start`)
3. Login as `demo_manager_cricket`
4. Approve/reject team proposals and assign coaches
5. Login as `demo_coach_cricket` and manage sessions
6. View player stats and notifications

---

## ⚠️ Common Issues

### 🔸 Backend not starting?

Ensure `(venv)` is active and run:

```bash
pip install -r requirements.txt
python manage.py migrate
```

### 🔸 Frontend not loading API?

Check that backend runs on port 8000 and CORS in `.env` includes `http://localhost:3000`.

### 🔸 Port conflicts?

Use:

```bash
python manage.py runserver 8001
PORT=3001 npm start
```

---

## 🎯 Done!

You're all set. Login with demo credentials and explore all dashboards.

---

## 💡 Optional Advanced Commands

```bash
# Re-seed data
python manage.py seed_demo --clear

# Create admin user
python manage.py createsuperuser

# Build frontend for production
cd frontend && npm run build
```

---

## 📞 Support

Check logs if something fails:

- **Backend**: Django terminal output
- **Frontend**: Browser console → Network tab

---

## 🔌 API Endpoints

All API endpoints are available at `http://localhost:8000/api/` when the backend server is running.

### Available Endpoints

- **Authentication**: `/api/auth/login/`, `/api/auth/signup/`
- **Sports**: `/api/sports/`
- **Teams**: `/api/teams/`
- **Players**: `/api/players/`
- **Coaching Sessions**: `/api/coaching-sessions/`
- **Tournaments**: `/api/tournaments/`
- **Tournament Matches**: `/api/tournament-matches/`
- **Team Proposals**: `/api/team-proposals/`
- **Team Assignments**: `/api/team-assignments/`
- **Notifications**: `/api/notifications/`
- **AI Features**: `/api/ai/predict-player-start/`, `/api/ai/player-insight/`

For detailed API documentation, check:
- `backend/core/urls.py` - URL routing configuration
- `backend/core/views.py` - API endpoint implementations
- Django REST Framework browsable API at `http://localhost:8000/api/` (when authenticated)

**Note**: Most endpoints require JWT authentication. Include the token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```
