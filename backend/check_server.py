#!/usr/bin/env python
"""
Check if server is running and test registration
"""
import requests
import json

url = "http://127.0.0.1:8000/api/auth/signup/"

test_data = {
    "username": "test_user_999",
    "email": "test999@example.com",
    "password": "password123",
    "role": "player",
    "sport_name": "Cricket"
}

print("🔍 Checking server status...")
try:
    response = requests.post(url, json=test_data, timeout=5)
    print(f"✅ Server is running!")
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Text: {response.text}")
    
    if response.status_code == 201:
        print(f"✅ Registration successful: {response.json()}")
    else:
        print(f"❌ Registration failed")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Raw response: {response.text}")
            
except requests.exceptions.ConnectionError:
    print("❌ Server is NOT running on port 8000")
except Exception as e:
    print(f"❌ Error: {e}")

