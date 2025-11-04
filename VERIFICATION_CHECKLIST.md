# Verification Checklist ✅

Use this checklist to verify everything is working correctly after setup.

## Pre-Flight Checks

- [ ] Backend virtual environment activated
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] PostgreSQL database created and configured
- [ ] `.env` file configured with database credentials

## Backend Setup

- [ ] Migrations run successfully: `python manage.py migrate`
- [ ] No migration errors
- [ ] Seed command runs successfully: `python manage.py seed_demo --clear`
- [ ] Backend server starts: `python manage.py runserver`
- [ ] Server accessible at `http://localhost:8000`

## Frontend Setup

- [ ] Frontend server starts: `npm start`
- [ ] Frontend accessible at `http://localhost:3000`
- [ ] No console errors in browser

## Database Verification

### Users Created
- [ ] `demo_admin` user exists
- [ ] `demo_coach_cricket`, `demo_coach_football`, etc. exist
- [ ] `demo_manager_cricket`, `demo_manager_football`, etc. exist
- [ ] `demo_player01` through `demo_player20` exist

### Sports Created
- [ ] Cricket sport exists
- [ ] Football sport exists
- [ ] Basketball sport exists
- [ ] Running sport exists

### Teams Created
- [ ] Cricket teams: Team 1, Team 2, Team 3, Team 4
- [ ] Football teams: Team 1, Team 2
- [ ] Basketball teams: Team 1, Team 2
- [ ] Running team: Team 1

### Tournaments Created
- [ ] "Demo Cricket Championship" exists (Status: ONGOING)
- [ ] "Demo Football Championship" exists
- [ ] "Demo Basketball Championship" exists
- [ ] "Demo Running Championship" exists

### Cricket Tournament Verification
- [ ] Tournament has 4 teams
- [ ] Tournament has multiple matches
- [ ] At least one match is IN_PROGRESS
- [ ] Points table exists for all teams
- [ ] Match player stats exist for completed matches

## Authentication Testing

- [ ] Can login as `demo_admin` / `demo123`
- [ ] Can login as `demo_coach_cricket` / `demo123`
- [ ] Can login as `demo_manager_cricket` / `demo123`
- [ ] Can login as `demo_player01` / `demo123`
- [ ] JWT tokens are generated correctly

## Player Dashboard Testing

- [ ] Dashboard loads without errors
- [ ] Player stats are displayed
- [ ] Achievements are visible
- [ ] Attendance summary shows data
- [ ] Performance trends chart displays
- [ ] Notifications panel works
- [ ] Can accept/reject coach link requests
- [ ] Logout button works

## Coach Dashboard Testing

- [ ] Dashboard loads without errors
- [ ] Can view coaching sessions
- [ ] Can see active and inactive sessions
- [ ] Can download CSV template
- [ ] Can upload CSV attendance file
- [ ] Can end active sessions
- [ ] Student history displays correctly
- [ ] Team assignment requests visible
- [ ] Can accept/reject team assignments
- [ ] Logout button works

## Manager Dashboard Testing

- [ ] Dashboard loads without errors
- [ ] Can view tournaments
- [ ] Can create new tournament
- [ ] Can add teams to tournament
- [ ] Can start tournament
- [ ] Can view points table
- [ ] Can view leaderboard
- [ ] Can see match list
- [ ] Can start cricket match
- [ ] Can access live scoring interface
- [ ] Can add runs (0-6)
- [ ] Can add wickets
- [ ] Can switch innings
- [ ] Can complete match
- [ ] Can cancel match
- [ ] Can end tournament
- [ ] Promotion requests visible
- [ ] Can approve/reject promotions
- [ ] Team proposals visible
- [ ] Logout button works

## Admin Dashboard Testing

- [ ] Dashboard loads without errors
- [ ] Can view all users
- [ ] Can create new user
- [ ] Can delete user
- [ ] Can promote user
- [ ] Can demote user
- [ ] Manager sport assignments visible
- [ ] Can assign manager to sport
- [ ] Can remove manager from sport
- [ ] Promotion requests visible
- [ ] Can approve/reject promotions
- [ ] Sports list displays (read-only)
- [ ] Logout button works

## Cricket Tournament Testing

### Tournament Creation
- [ ] Can create cricket tournament
- [ ] Can set overs per match (5, 10, 20, 30, 50)
- [ ] Can add 4 teams to tournament

### Match Management
- [ ] Can create matches between teams
- [ ] Can start match (sets toss winner, batting first)
- [ ] Can set batsmen
- [ ] Can set bowler
- [ ] Can add runs (0-6)
- [ ] Can add wickets (with next batsman prompt)
- [ ] Can switch innings
- [ ] Can complete match
- [ ] Can cancel match

### Points Table
- [ ] Points table displays all teams
- [ ] Matches played counts correctly
- [ ] Wins/losses calculated correctly
- [ ] Points calculated correctly (2 per win)
- [ ] Net run rate displays

### Leaderboard
- [ ] Top scorer displays
- [ ] Most wickets displays
- [ ] Most Man of the Match displays

### Tournament Completion
- [ ] Can end tournament
- [ ] Achievements generated for:
  - [ ] Winning team
  - [ ] Top scorer
  - [ ] Highest wicket taker
  - [ ] Man of the Match awards

## API Endpoint Testing

### Tournament Endpoints
- [ ] `GET /api/tournaments/` - Returns tournament list
- [ ] `POST /api/tournaments/` - Creates tournament
- [ ] `POST /api/tournaments/{id}/start_tournament/` - Starts tournament
- [ ] `POST /api/tournaments/{id}/end_tournament/` - Ends tournament
- [ ] `GET /api/tournaments/{id}/points_table/` - Returns points table
- [ ] `GET /api/tournaments/{id}/leaderboard/` - Returns leaderboard

### Match Endpoints
- [ ] `POST /api/tournament-matches/{id}/start_match/` - Starts match
- [ ] `POST /api/tournament-matches/{id}/set_batsmen/` - Sets batsmen
- [ ] `POST /api/tournament-matches/{id}/set_bowler/` - Sets bowler
- [ ] `POST /api/tournament-matches/{id}/add_score/` - Adds runs
- [ ] `POST /api/tournament-matches/{id}/add_wicket/` - Adds wicket
- [ ] `POST /api/tournament-matches/{id}/switch_innings/` - Switches innings
- [ ] `POST /api/tournament-matches/{id}/complete_match/` - Completes match
- [ ] `POST /api/tournament-matches/{id}/cancel_match/` - Cancels match
- [ ] `GET /api/tournament-matches/{id}/get_match_state/` - Gets match state
- [ ] `GET /api/tournament-matches/{id}/get_player_stats/` - Gets player stats

## Data Integrity

- [ ] Player stats update after session completion
- [ ] Career scores recalculated correctly
- [ ] Match stats update after match completion
- [ ] Points table updates after match completion
- [ ] Achievements created correctly
- [ ] All relationships intact (players→teams, teams→tournaments, etc.)

## UI/UX

- [ ] Dark theme applied correctly
- [ ] Purple/black/green accents visible
- [ ] All text readable
- [ ] Buttons responsive
- [ ] Modals work correctly
- [ ] Forms validate correctly
- [ ] Error messages display properly
- [ ] Success messages display properly

## Performance

- [ ] Pages load quickly
- [ ] API calls complete within reasonable time
- [ ] No memory leaks
- [ ] Database queries optimized

## Security

- [ ] JWT authentication works
- [ ] Protected routes require authentication
- [ ] Role-based access control enforced
- [ ] CORS configured correctly

---

## Quick Test Flow

1. **Login as Manager (Cricket)**
   - Username: `demo_manager_cricket`
   - Password: `demo123`

2. **View Tournament**
   - Go to Manager Dashboard
   - Find "Demo Cricket Championship"
   - Should show ONGOING status

3. **View Details**
   - Click "View Details"
   - Check points table and leaderboard

4. **Score Match**
   - Click "Score" on IN_PROGRESS match
   - Add runs, wickets
   - Complete match

5. **End Tournament**
   - Click "End Tournament"
   - Verify achievements created

---

**If all checks pass, the system is ready for production testing!** 🎉

