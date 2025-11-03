// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginService } from "../services/auth";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const result = await loginService(username, password);
      const role = result.role;

      alert("✅ Login successful!");
      setError("");

      // Redirect based on role
      if (role === "admin") {
        navigate("/admin-dashboard");
      } else if (role === "player") {
        navigate("/player-dashboard");
      } else if (role === "coach") {
        navigate("/coach-dashboard");
      } else if (role === "manager") {
        navigate("/manager-dashboard");
      } else {
        navigate("/");
      }

    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      setError("❌ Invalid credentials or unauthorized access.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-sm">
        <h2 className="text-2xl font-semibold mb-6 text-center">Sign In</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full p-2 border rounded-md"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border rounded-md"
          />

          <button
            type="submit"
            className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition duration-200"
          >
            Sign In
          </button>
        </form>

        {error && (
          <p className="text-center text-sm mt-4 text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Login;
