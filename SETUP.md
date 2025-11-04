# Sports Management Platform - Setup Guide

## Quick Start

This guide will help you set up and run the Sports Management Platform with comprehensive demo data.

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- PostgreSQL database
- pip and npm package managers

## Backend Setup

### 1.Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
``` 

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Navigate to Backend Directory
```bash
cd backend
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

**Important**: Navigate to the `backend` directory and ensure your virtual environment is activated before running migrations.

```bash
cd backend
# Activate virtual environment if not already activated
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Create migrations (if they don't exist)
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

**Note**: If you get an error like `Dependency on app with no migrations: core`, it means migration files don't exist yet. Run `python manage.py makemigrations` first to create them, then run `migrate`.

### 6. Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### 7. Seed Demo Data

The `seed_demo` command is a crucial step that populates your database with comprehensive demo data for testing and development. This allows you to immediately start exploring the platform without manually creating users, teams, and tournaments.

#### What the Seed Command Does

The `seed_demo` command creates a complete set of demo data including:

1. **Sports** (4 sports):
   - Cricket (Team Sport)
   - Football (Team Sport)
   - Basketball (Team Sport)
   - Running (Individual Sport)

2. **Coaches** (4 coaches):
   - One coach per sport
   - Usernames: `demo_coach_cricket`, `demo_coach_football`, `demo_coach_basketball`, `demo_coach_running`
   - All passwords: `demo123`

3. **Players** (55 total players):
   - **30 Cricket Players**: `demo_cricket_player_01` through `demo_cricket_player_30`
     - These players are **NOT linked to coaches initially** (to demonstrate the coach invitation flow)
     - Sport profiles created but inactive
   - **10 Football Players**: `demo_football_player_01` through `demo_football_player_10`
     - **Auto-linked** to the Football coach as students
   - **10 Basketball Players**: `demo_basketball_player_01` through `demo_basketball_player_10`
     - **Auto-linked** to the Basketball coach as students
   - **5 Running Players**: `demo_running_player_01` through `demo_running_player_05`
     - **Auto-linked** to the Running coach as students
   - All player passwords: `demo123`

4. **Sport-Specific Statistics**:
   - Cricket stats (runs, wickets, matches_played, strike_rate, average)
   - Football stats (goals, assists, tackles, matches_played)
   - Basketball stats (points, rebounds, assists, matches_played)
   - Running stats (total_distance_km, best_time_seconds, events_participated)
   - All stats start at zero (ready for testing)

#### Running the Seed Command

**Option 1: Clear and Seed (Recommended for first-time setup)**
```bash
cd backend
python manage.py seed_demo --clear
```

The `--clear` flag will:
- Delete all existing demo users (usernames starting with "demo_")
- Delete all associated demo player profiles
- Delete all associated demo coach profiles
- Then create fresh demo data

**Option 2: Add Without Clearing (For adding more demo data)**
```bash
cd backend
python manage.py seed_demo
```

This will add demo data without deleting existing demo users. Useful if you want to preserve existing demo data and add more.

#### What Happens After Seeding

After running the seed command, you'll see output like:

```
✓ Sport: Cricket
✓ Sport: Football
✓ Sport: Basketball
✓ Sport: Running
✓ Coach: demo_coach_cricket (ID: C2500001)
✓ Coach: demo_coach_football (ID: C2500002)
...
✓ Cricket Player 1: demo_cricket_player_01
✓ Cricket Player 2: demo_cricket_player_02
...
✓ Football Player 1: demo_football_player_01 (Linked to coach)
...

============================================================
CLEAN DEMO DATA SEEDED SUCCESSFULLY!
============================================================
Sports: Cricket, Football, Basketball, Running
Coaches: 4 (one per sport)
Cricket Players: 30 (NOT linked to coaches - ready for invitation flow)
Football Players: 10 (Linked to coach as students)
Basketball Players: 10 (Linked to coach as students)
Running Players: 5 (Linked to coach as students)
...
```

#### Important Notes About Demo Data

- **Cricket Players**: Intentionally NOT linked to coaches to demonstrate the coach invitation workflow
- **Other Sports Players**: Automatically linked to their respective coaches as students
- **No Teams, Tournaments, or Sessions**: The base seed command creates users and profiles only. Teams, tournaments, and coaching sessions need to be created through the application interface or additional seed commands
- **Stats Start at Zero**: All sport statistics are initialized at zero, ready for testing and data entry
- **No Achievements**: Achievement badges are not created by default - they're generated when players complete tournaments or reach milestones

#### Testing the Demo Data

After seeding, you can:

1. **Login as a Coach**:
   - See linked students (Football, Basketball, Running coaches)
   - See unlinked Cricket players (Cricket coach can invite them)
   - Create coaching sessions
   - Propose teams

2. **Login as a Cricket Player**:
   - See your profile (inactive, not linked to coach)
   - Accept coach invitations if sent
   - View sport statistics

3. **Login as Other Sport Players**:
   - See active profiles linked to coaches
   - View coach information
   - See sport-specific statistics

#### Troubleshooting Seed Command

**If you get foreign key errors:**
```bash
# Ensure migrations are applied first
python manage.py migrate
python manage.py seed_demo --clear
```

**If demo users already exist:**
```bash
# Use --clear flag to remove existing demo data
python manage.py seed_demo --clear
```

**If you want to reset everything:**
```bash
# Clear all demo data and start fresh
python manage.py seed_demo --clear
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

After running the `seed_demo --clear` command, you can use these credentials to login:

### Coaches (One per sport)
- **Username:** `demo_coach_cricket` / `demo_coach_football` / `demo_coach_basketball` / `demo_coach_running`
- **Password:** `demo123`

### Players

**Cricket Players** (30 players - NOT linked to coaches initially):
- **Username:** `demo_cricket_player_01` through `demo_cricket_player_30`
- **Password:** `demo123`
- **Note**: These players are not linked to coaches to demonstrate the invitation flow

**Football Players** (10 players - Auto-linked to Football coach):
- **Username:** `demo_football_player_01` through `demo_football_player_10`
- **Password:** `demo123`

**Basketball Players** (10 players - Auto-linked to Basketball coach):
- **Username:** `demo_basketball_player_01` through `demo_basketball_player_10`
- **Password:** `demo123`

**Running Players** (5 players - Auto-linked to Running coach):
- **Username:** `demo_running_player_01` through `demo_running_player_05`
- **Password:** `demo123`

### Admin & Managers

**Note**: The base `seed_demo` command does NOT create admin or manager accounts. You'll need to:
- Create admin users via: `python manage.py createsuperuser`
- Create manager accounts through the application interface or Django admin

## Complete Demo Data Overview

The `seed_demo` command creates a foundational dataset for testing. Here's what you get:

### Base Seed Data (Created by `seed_demo` command)

1. **4 Sports:**
   - Cricket (Team Sport)
   - Football (Team Sport)
   - Basketball (Team Sport)
   - Running (Individual Sport)

2. **4 Coaches:**
   - One coach per sport with auto-generated coach IDs
   - Each coach has their own dashboard access

3. **55 Players:**
   - 30 Cricket players (not linked to coaches - ready for invitation flow)
   - 10 Football players (auto-linked to Football coach)
   - 10 Basketball players (auto-linked to Basketball coach)
   - 5 Running players (auto-linked to Running coach)

4. **Sport-Specific Statistics:**
   - All players have sport profiles with initialized stats
   - Cricket: runs, wickets, matches_played, strike_rate, average
   - Football: goals, assists, tackles, matches_played
   - Basketball: points, rebounds, assists, matches_played
   - Running: total_distance_km, best_time_seconds, events_participated

### Additional Data (To Be Created Through Application)

The base seed command creates users and profiles. You'll need to create the following through the application interface:

- **Managers**: Create manager accounts and assign them to sports
- **Teams**: Managers or coaches can create teams
- **Coaching Sessions**: Coaches can create sessions and upload attendance
- **Tournaments**: Managers can create tournaments and add teams
- **Tournament Matches**: Create matches within tournaments
- **Achievements**: Auto-generated when players complete tournaments

**Note**: For a complete setup with teams, tournaments, and matches already created, you may need to run additional seed commands or use the Django admin interface to create managers and tournaments.

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

**Error: "Dependency on app with no migrations: core"**
- This means migration files don't exist yet. Run:
  ```bash
  cd backend
  python manage.py makemigrations
  python manage.py migrate
  ```

**Other migration errors:**
- If you get migration errors, try: `python manage.py migrate --run-syncdb`
- Or reset migrations: Delete migration files (except `__init__.py`) in `backend/core/migrations/` and run:
  ```bash
  python manage.py makemigrations
  python manage.py migrate
  ```

**Always ensure:**
- You're in the `backend/` directory
- Virtual environment is activated
- Migrations are created before applying them

### Frontend API Errors
- Verify backend is running on port 8000
- Check CORS settings in `backend/settings.py`
- Verify API URL in `frontend/src/services/api.js`

### Seed Command Issues
- If you get foreign key errors, try running with `--clear` flag first
- Make sure all migrations are applied before seeding

## Next Steps

1. **Create migrations** (if they don't exist): `python manage.py makemigrations`
2. **Run migrations**: `python manage.py migrate`
3. **Seed data**: `python manage.py seed_demo --clear`
4. **Start backend**: `python manage.py runserver` (in backend directory with venv activated)
5. **Start frontend**: `npm start` (in frontend directory, new terminal)
6. **Login and explore!** Use demo credentials from the Demo Credentials section above

## Support

For issues or questions, check:
- Django logs in the terminal running `manage.py runserver`
- Browser console for frontend errors
- Network tab for API request/response details

