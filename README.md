# Sports Management Platform 🏆

A comprehensive sports management system with role-based access control for Players, Coaches, Managers, and Admins.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL database

### Backend Setup (5 minutes)

```bash
cd backend

# Activate virtual environment (if exists)
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure database in .env file (see SETUP.md)

# Run migrations
python manage.py migrate

# Seed comprehensive demo data
python manage.py seed_demo --clear

# Start server
python manage.py runserver
```

### Frontend Setup (2 minutes)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## 🔑 Demo Credentials

After seeding, use these credentials:

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `demo_admin` | `demo123` |
| **Coach (Cricket)** | `demo_coach_cricket` | `demo123` |
| **Manager (Cricket)** | `demo_manager_cricket` | `demo123` |
| **Player** | `demo_player01` - `demo_player20` | `demo123` |

## 📊 What's Included

### Demo Data
- ✅ 4 Sports (Cricket, Football, Basketball, Running)
- ✅ 4 Coaches (one per sport)
- ✅ 4 Managers (one per sport)
- ✅ 20 Players with full profiles
- ✅ 8 Teams (Cricket has 4 teams in tournament)
- ✅ 40 Coaching Sessions with attendance
- ✅ 4 Tournaments (Cricket tournament is ONGOING with live match ready)
- ✅ Complete match stats, points table, leaderboard

### Features Ready for Testing

#### 🎯 Player Dashboard
- View sport-specific stats and achievements
- Track attendance and performance trends
- Accept/reject coach link requests

#### 👨‍🏫 Coach Dashboard
- Manage coaching sessions
- Upload CSV attendance files
- View student history and stats
- End sessions and update player stats

#### 🏅 Manager Dashboard
- Create and manage tournaments
- Add teams to tournaments
- Live cricket match scoring
- View points table and leaderboard
- Approve/reject team proposals and promotions

#### 👑 Admin Dashboard
- User management (create, delete, promote/demote)
- Manager sport assignments
- Promotion request oversight
- Full system governance

#### 🏏 Cricket Tournament System
- Create tournaments with multiple teams
- Real-time match scoring (runs, wickets, overs)
- Points table and leaderboard
- Achievement generation
- Match completion and cancellation

## 🎮 Testing the Cricket Tournament

1. Login as `demo_manager_cricket` / `demo123`
2. Navigate to Manager Dashboard
3. Find "Demo Cricket Championship" (ONGOING status)
4. Click "View Details" to see points table
5. Click "Score" on the IN_PROGRESS match
6. Use live scoring interface to add runs, wickets
7. Complete match or switch innings
8. End tournament to generate awards

## 📁 Project Structure

```
backend/
├── core/
│   ├── models.py          # Database models
│   ├── views.py           # API endpoints
│   ├── serializers.py     # Data serialization
│   ├── urls.py            # URL routing
│   └── management/
│       └── commands/
│           └── seed_demo.py  # Demo data seeder
└── manage.py

frontend/
├── src/
│   ├── pages/
│   │   ├── PlayerDashboard.jsx
│   │   ├── CoachDashboard.jsx
│   │   ├── ManagerDashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── TournamentManagement.jsx
│   └── services/
│       ├── api.js
│       ├── coach.js
│       └── admin.js
└── package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login/` - Login
- `POST /api/auth/signup/` - Signup
- `POST /api/token/` - Get JWT token

### Tournaments
- `GET /api/tournaments/` - List tournaments
- `POST /api/tournaments/` - Create tournament
- `POST /api/tournaments/{id}/start_tournament/` - Start tournament
- `POST /api/tournaments/{id}/end_tournament/` - End tournament
- `GET /api/tournaments/{id}/points_table/` - Points table
- `GET /api/tournaments/{id}/leaderboard/` - Leaderboard

### Matches
- `POST /api/tournament-matches/{id}/start_match/` - Start match
- `POST /api/tournament-matches/{id}/add_score/` - Add runs
- `POST /api/tournament-matches/{id}/add_wicket/` - Add wicket
- `POST /api/tournament-matches/{id}/complete_match/` - Complete match

See full API documentation in `backend/core/urls.py`

## 🐛 Troubleshooting

### Database Connection
- Ensure PostgreSQL is running
- Check `.env` file has correct credentials
- Create database: `CREATE DATABASE social_sports;`

### Migration Issues
```bash
python manage.py migrate --run-syncdb
```

### Seed Command Issues
```bash
# Clear and reseed
python manage.py seed_demo --clear
```

### Frontend Errors
- Check backend is running on port 8000
- Verify CORS settings
- Check browser console for errors

## 📚 Documentation

- **Full Setup Guide:** See `SETUP.md`
- **API Documentation:** See `backend/core/urls.py`
- **Model Documentation:** See `backend/core/models.py`

## 🎨 Theme

The platform uses a dark theme with purple/black/green accents optimized for sports tournament aesthetics.

## ✨ Next Steps

1. ✅ Run migrations
2. ✅ Seed demo data
3. ✅ Start backend server
4. ✅ Start frontend server
5. ✅ Login and explore!

## 📝 Notes

- The cricket tournament is pre-configured with 4 teams
- One match is IN_PROGRESS and ready for live scoring
- All relationships are properly connected
- Sport statistics are automatically calculated
- Achievements are generated on tournament completion

---

**Ready to test!** 🚀 Login with demo credentials and explore all features.
