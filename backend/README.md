# Social Sports Platform - Backend

Django REST Framework backend for the Social Sports Management Platform.

## Tech Stack
- **Framework**: Django 5.2.7 + Django REST Framework
- **Database**: PostgreSQL (SQLite for development fallback)
- **Authentication**: JWT (djangorestframework-simplejwt)
- **CORS**: django-cors-headers

## Setup

### Prerequisites
- Python 3.8+
- PostgreSQL 12+ (optional, can use SQLite for development)
- pip/virtualenv

### Installation

1. **Clone the repository and navigate to backend**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `backend/` directory:
   ```env
   # Django Settings
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1

   # Database (PostgreSQL)
   DB_ENGINE=django.db.backends.postgresql
   DB_NAME=temp_social
   DB_USER=postgres
   DB_PASSWORD=your-postgres-password
   DB_HOST=localhost
   DB_PORT=5432

   # Or use SQLite for development
   # USE_SQLITE=True

   # CORS Settings
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   CORS_ALLOW_ALL_ORIGINS=False  # Set to True only in development
   CORS_ALLOW_CREDENTIALS=True

   # AI/Gemini (Optional)
   GEMINI_API_KEY=your-gemini-api-key
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

7. **Seed demo data (optional)**
   ```bash
   python manage.py seed_demo
   ```

8. **Run development server**
   ```bash
   python manage.py runserver
   ```

The API will be available at `http://localhost:8000/api/`

## Environment Variables

### Required for Production
- `SECRET_KEY`: Django secret key (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `DEBUG`: Set to `False` in production
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: PostgreSQL credentials

### Optional
- `USE_SQLITE`: Set to `True` to use SQLite instead of PostgreSQL
- `CORS_ALLOW_ALL_ORIGINS`: Set to `True` only in development (not recommended for production)
- `GEMINI_API_KEY`: API key for Gemini AI features

## Management Commands

### Seed Demo Data
Creates sample data for testing:
```bash
python manage.py seed_demo
```

To clear and reseed:
```bash
python manage.py seed_demo --clear
```

### Seed Player Stats
Generates random sports profiles and stats:
```bash
python manage.py seed_player_stats
```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - Login (get JWT token)
- `POST /api/auth/refresh/` - Refresh JWT token

### Core Resources
- `/api/sports/` - Sports CRUD
- `/api/teams/` - Team management
- `/api/coaching-sessions/` - Coaching sessions
- `/api/tournaments/` - Tournament management
- `/api/notifications/` - User notifications

### Role-Based Access
- **Player**: View own profile, stats, achievements
- **Coach**: Manage students, sessions, team proposals
- **Manager**: Manage teams, tournaments, promotions
- **Admin**: Full access + overrides

## Project Structure

```
backend/
├── core/                    # Main application
│   ├── models.py           # Database models
│   ├── serializers.py      # DRF serializers
│   ├── views.py            # API endpoints (ViewSets)
│   ├── urls.py             # URL routing
│   ├── permissions.py      # Custom permissions
│   ├── promotion_services.py  # Business logic services
│   ├── signals.py          # Django signals
│   └── management/         # Management commands
│       └── commands/
│           ├── seed_demo.py
│           └── seed_player_stats.py
├── yultimate_project/      # Django project settings
│   ├── settings.py         # Configuration
│   ├── urls.py             # Root URL conf
│   └── wsgi.py             # WSGI config
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables (create this)
```

## Security Notes

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Set `DEBUG=False` in production**
3. **Use strong `SECRET_KEY` in production**
4. **Configure `CORS_ALLOWED_ORIGINS` properly** - Don't allow all origins in production
5. **Use PostgreSQL in production** - SQLite is only for development
6. **Set proper `ALLOWED_HOSTS`** for your domain

## Development Tips

- Use `python manage.py shell` for interactive Django shell
- Use `python manage.py makemigrations` after model changes
- Use `python manage.py migrate` to apply migrations
- Check Django admin at `/admin/` (after creating superuser)

## Production Deployment

1. Set `DEBUG=False`
2. Configure proper `ALLOWED_HOSTS`
3. Use PostgreSQL database
4. Set up proper CORS origins
5. Use environment variables for all sensitive data
6. Configure static files serving (use WhiteNoise or nginx)
7. Set up proper logging

## Troubleshooting

- **Database connection errors**: Check PostgreSQL is running and credentials are correct
- **CORS errors**: Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL
- **Migration errors**: Run `python manage.py makemigrations` then `migrate`
- **Import errors**: Ensure virtual environment is activated and dependencies installed
