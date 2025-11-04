# Sports Management Platform - Setup Guide

## Quick Start

This guide will help you set up and run the Sports Management Platform with comprehensive demo data.

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- PostgreSQL database
- pip and npm package managers

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Database Configuration

Create a `.env` file in the `backend` directory with the following content:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_NAME=social_sports
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### 5. Run Migrations
```bash
python manage.py migrate
```

### 6. Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### 7. Seed Demo Data
```bash
# Clear existing demo data and seed fresh data
python manage.py seed_demo --clear

# Or just add demo data without clearing
python manage.py seed_demo
```

### 8. Start Backend Server
```bash
python manage.py runserver
```

The backend will run on `http://localhost:8000`

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure API URL

Make sure the frontend is configured to connect to `http://localhost:8000/api/` (or update `frontend/src/services/api.js` if needed)

### 4. Start Frontend Development Server
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Demo Credentials

After running the seed command, you can use these credentials to login:

### Admin
- **Username:** `demo_admin`
- **Password:** `demo123`

### Coaches (one per sport)
- **Username:** `demo_coach_cricket` / `demo_coach_football` / `demo_coach_basketball` / `demo_coach_running`
- **Password:** `demo123`

### Managers (one per sport)
- **Username:** `demo_manager_cricket` / `demo_manager_football` / `demo_manager_basketball` / `demo_manager_running`
- **Password:** `demo123`

### Players
- **Username:** `demo_player01` through `demo_player20`
- **Password:** `demo123`

## What's Included in Demo Data

The seed command creates:

1. **4 Sports:** Cricket, Football, Basketball, Running
2. **4 Coaches:** One per sport
3. **4 Managers:** One per sport
4. **20 Players:** With full profiles and stats
5. **8 Teams:** 2 per team sport (Cricket has 4 teams in tournament)
6. **40 Coaching Sessions:** 10 per sport with attendance records
7. **4 Tournaments:** One per sport
   - **Cricket Tournament:** 
     - Status: ONGOING
     - 4 teams
     - Multiple matches (some completed, one IN_PROGRESS ready for scoring)
     - Points table, leaderboard, match stats
   - **Other Sports:** UPCOMING tournaments with teams
8. **Comprehensive Stats:**
   - Sport-specific statistics (Cricket, Football, Basketball, Running)
   - Player career scores
   - Match player stats
   - Tournament points table
   - Live cricket match state (ready for scoring)

## Testing the Cricket Tournament System

1. **Login as Manager:** Use `demo_manager_cricket` / `demo123`
2. **View Tournament:** Go to Manager Dashboard → Tournaments section
3. **Cricket Tournament:** Should show "Demo Cricket Championship" with ONGOING status
4. **View Details:** Click "View Details" to see points table and leaderboard
5. **Score Match:** Click "Score" on the IN_PROGRESS match to access live scoring interface
6. **Complete Match:** Use the scoring interface to add runs, wickets, and complete the match
7. **End Tournament:** Click "End Tournament" to finalize and generate awards

## Key Features Ready for Testing

✅ **Player Dashboard:** View stats, achievements, attendance, performance trends
✅ **Coach Dashboard:** Manage sessions, upload CSV attendance, view students, end sessions
✅ **Manager Dashboard:** Create tournaments, manage teams, approve promotions, score matches
✅ **Admin Dashboard:** User management, manager assignments, promotion oversight
✅ **Cricket Tournament:** Full tournament lifecycle with live scoring
✅ **Points Table:** Automatic calculation based on match results
✅ **Leaderboard:** Top scorer, most wickets, most Man of the Match
✅ **Match Scoring:** Real-time cricket scoring with batsmen, bowler, runs, wickets
✅ **Achievements:** Auto-generated for tournament winners and top performers

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `.env` file has correct database credentials
- Verify database exists: `CREATE DATABASE social_sports;`

### Migration Issues
- If you get migration errors, try: `python manage.py migrate --run-syncdb`
- Or reset migrations: Delete migration files (except `__init__.py`) and run `python manage.py makemigrations`

### Frontend API Errors
- Verify backend is running on port 8000
- Check CORS settings in `backend/settings.py`
- Verify API URL in `frontend/src/services/api.js`

### Seed Command Issues
- If you get foreign key errors, try running with `--clear` flag first
- Make sure all migrations are applied before seeding

## Next Steps

1. Run migrations: `python manage.py migrate`
2. Seed data: `python manage.py seed_demo --clear`
3. Start backend: `python manage.py runserver`
4. Start frontend: `npm start` (in frontend directory)
5. Login and explore!

## Support

For issues or questions, check:
- Django logs in the terminal running `manage.py runserver`
- Browser console for frontend errors
- Network tab for API request/response details

