# 🚀 Quick Start Guide - Social Sports Platform

## 📋 Prerequisites

- ✅ PostgreSQL installed and running
- ✅ Python 3.x installed
- ✅ Node.js installed (for frontend)
- ✅ Virtual environment activated

---

## 🏃 Running the Backend

### 1. **Activate Virtual Environment**
```bash
# Windows
C:\Users\praba\OneDrive\Desktop\Tech4Social\social_sports_temp\backend\venv\Scripts\activate

# Or from project root
.\backend\venv\Scripts\activate
```

### 2. **Start Django Server**
```bash
cd backend
python manage.py runserver 8000
```

**Server will be available at:** `http://127.0.0.1:8000/`

---

## 🧪 Testing the System

### **Test All Sports Registration**
```bash
cd backend
python test_all_sports.py
```

**Expected Output:**
```
✅ PASS - cricket_player_XXXX
✅ PASS - football_player_XXXX
✅ PASS - basketball_player_XXXX
✅ PASS - running_player_XXXX
✅ PASS - coach_XXXX
✅ PASS - manager_XXXX
```

### **Verify Database**
```bash
cd backend
python verify_database.py
```

### **Final Verification**
```bash
cd backend
python final_verification.py
```

---

## 🔧 Useful Commands

### **Clear Python Cache**
```bash
cd backend
python clear_cache.py
```

### **Initialize Sports**
```bash
cd backend
python init_sports.py
```

### **Check Migrations**
```bash
cd backend
python manage.py showmigrations
```

### **Create New Migration**
```bash
cd backend
python manage.py makemigrations
```

### **Apply Migrations**
```bash
cd backend
python manage.py migrate
```

---

## 📡 API Endpoints

### **Authentication**

#### **Register User**
```http
POST /api/auth/signup/
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "player",
  "sport_name": "Cricket"
}
```

**Roles:** `player`, `coach`, `manager`, `admin`  
**Sports:** `Cricket`, `Football`, `Basketball`, `Running`

#### **Login**
```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}
```

---

## 🗄️ Database Info

- **Database Name:** `temp_social`
- **User:** `postgres`
- **Password:** `password`
- **Host:** `localhost`
- **Port:** `5432`

### **Connect to Database**
```bash
psql -U postgres -d temp_social
```

### **Useful SQL Queries**

**Check all users:**
```sql
SELECT id, username, email, role FROM core_user ORDER BY id DESC LIMIT 10;
```

**Check all players:**
```sql
SELECT p.player_id, u.username, s.name as sport
FROM core_player p
JOIN core_user u ON p.user_id = u.id
LEFT JOIN core_playersportprofile psp ON psp.player_id = p.id
LEFT JOIN core_sport s ON psp.sport_id = s.id
ORDER BY p.id DESC;
```

**Check all coaches:**
```sql
SELECT c.id, u.username, c.experience
FROM core_coach c
JOIN core_user u ON c.user_id = u.id;
```

**Check sports:**
```sql
SELECT * FROM core_sport;
```

---

## 🐛 Troubleshooting

### **Issue: Server won't start**
**Solution:**
```bash
cd backend
python clear_cache.py
python manage.py runserver 8000
```

### **Issue: Migration errors**
**Solution:**
```bash
# Check migration status
python manage.py showmigrations

# If needed, reset migrations (CAUTION: This will delete data)
python manage.py migrate core zero
python manage.py migrate
```

### **Issue: IntegrityError**
**Solution:** This should be fixed now. If you still see it:
1. Check that signals are loaded in `core/apps.py`
2. Verify `UserRegistrationSerializer` is not manually creating Player/Coach
3. Clear cache: `python clear_cache.py`

### **Issue: Sport not found**
**Solution:**
```bash
# Re-initialize sports
python init_sports.py
```

---

## 📁 Important Files

### **Backend Core Files**
- `backend/core/models.py` - All data models
- `backend/core/serializers.py` - API serializers (FIXED)
- `backend/core/signals.py` - Auto-creation signals (FIXED)
- `backend/core/views.py` - API endpoints
- `backend/yultimate_project/settings.py` - Django settings

### **Test & Utility Scripts**
- `backend/test_all_sports.py` - Test all sports registration
- `backend/verify_database.py` - Verify database state
- `backend/final_verification.py` - Final comprehensive test
- `backend/init_sports.py` - Initialize 4 sports
- `backend/clear_cache.py` - Clear Python cache

### **Documentation**
- `COMPLETE_FIX_REPORT.md` - Detailed fix report
- `backend/FIXES_SUMMARY.md` - Summary of fixes
- `QUICK_START_GUIDE.md` - This file

---

## 🎯 Common Tasks

### **Create a New Player**
```bash
curl -X POST http://127.0.0.1:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_player",
    "email": "test@example.com",
    "password": "password123",
    "role": "player",
    "sport_name": "Football"
  }'
```

### **Create a New Coach**
```bash
curl -X POST http://127.0.0.1:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_coach",
    "email": "coach@example.com",
    "password": "password123",
    "role": "coach"
  }'
```

---

## 🔐 Environment Variables

Create a `.env` file in the backend directory:

```env
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_NAME=temp_social
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

---

## 📊 System Status

**Current Status:** ✅ FULLY FUNCTIONAL

- ✅ Database: Connected and working
- ✅ Migrations: All applied
- ✅ Sports: 4 sports initialized
- ✅ Registration: All roles working
- ✅ Signals: Player/Coach auto-creation working
- ✅ Sport Assignment: All 4 sports working correctly

---

## 🆘 Need Help?

1. **Check the logs:** Server terminal shows detailed error messages
2. **Run verification:** `python final_verification.py`
3. **Check database:** `python verify_database.py`
4. **Clear cache:** `python clear_cache.py`
5. **Review documentation:** `COMPLETE_FIX_REPORT.md`

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Start server | `python manage.py runserver 8000` |
| Test registration | `python test_all_sports.py` |
| Verify database | `python verify_database.py` |
| Clear cache | `python clear_cache.py` |
| Initialize sports | `python init_sports.py` |
| Run migrations | `python manage.py migrate` |

---

**Last Updated:** November 3, 2025  
**Status:** ✅ All systems operational

