// frontend/src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Welcome to Sports Portal</h1>
      <div className="flex space-x-4">
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          Login
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
        >
          Signup
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
